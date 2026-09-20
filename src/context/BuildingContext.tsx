import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  FlatInfo,
  BuildingSettings,
  BillingCycle,
  FlatReadingEntry,
  AppNotification,
  UserSession,
  BuildingExpense,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_FLATS,
  INITIAL_CYCLES,
  INITIAL_NOTIFICATIONS,
  INITIAL_EXPENSES,
} from '../data/initialData';

interface BuildingContextType {
  settings: BuildingSettings;
  flats: FlatInfo[];
  cycles: BillingCycle[];
  activeCycle: BillingCycle | undefined;
  activeCycleId: string;
  notifications: AppNotification[];
  expenses: BuildingExpense[];
  monthlyManualCollections: Record<string, number>;
  currentSession: UserSession | null;
  unreadCount: number;
  cloudSyncStatus: 'connected' | 'syncing' | 'offline';
  lastCloudSync: Date | null;
  saveToCloud: (
    customSettings?: BuildingSettings,
    customFlats?: FlatInfo[],
    customCycles?: BillingCycle[],
    customActiveCycleId?: string,
    customExpenses?: BuildingExpense[],
    customManualCollections?: Record<string, number>
  ) => Promise<boolean>;
  saveAllFlats: (flatsToSave: FlatInfo[]) => Promise<boolean>;
  setActiveCycleId: (id: string) => void;
  updateSettings: (updates: Partial<BuildingSettings>, autoApplyToBills?: boolean) => void;
  applyChargesToAllFlats: (
    params: {
      commonMeterCharges?: number;
      commonMeterLabel?: string;
      maintenanceCharges?: number;
      maintenanceLabel?: string;
    },
    autoApplyToCycles?: boolean
  ) => void;
  updateChargeLabels: (labels: { commonMeterLabel?: string; maintenanceLabel?: string }) => void;
  updateFlat: (flatId: string, updates: Partial<FlatInfo>) => void;
  updateFlatCustomRate: (flatId: string, rate: number | undefined) => void;
  saveNewCycle: (cycle: BillingCycle) => void;
  createNewCycle: (params?: {
    month?: string;
    dueDate?: string;
    mainMeterUnits?: number;
    mainMeterBillAmount?: number;
  }) => BillingCycle;
  updateCycleReadings: (cycleId: string, readings: BillingCycle['readings'], mainMeter?: BillingCycle['mainMeter']) => void;
  addExpense: (expense: Omit<BuildingExpense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, updates: Partial<BuildingExpense>) => void;
  deleteExpense: (id: string) => void;
  setMonthlyManualCollection: (monthKey: string, amount: number | undefined) => void;
  markPaymentStatus: (
    cycleId: string,
    flatId: string,
    status: 'paid' | 'unpaid' | 'pending' | 'partially_paid',
    details?: {
      method?: 'UPI' | 'Cash' | 'Bank Transfer';
      upiRef?: string;
      paidAmount?: number;
      adminNotes?: string;
    }
  ) => void;
  submitResidentPaymentProof: (cycleId: string, flatId: string, upiRef: string, paidAmount: number) => void;
  checkPhoneRegistration: (phone: string) => { isRegistered: boolean; hasPin: boolean; flat?: FlatInfo; isSecretary?: boolean; error?: string };
  setFlatPin: (flatId: string, pin: string) => Promise<boolean>;
  resetFlatPin: (flatId: string) => Promise<boolean>;
  loginResidentWithPin: (phone: string, pin: string) => { success: boolean; error?: string; flat?: FlatInfo; role?: 'resident' | 'admin' };
  loginAsResident: (phone: string) => { success: boolean; flat?: FlatInfo; error?: string };
  loginDirectlyAsFlat: (flatId: string, phone?: string) => { success: boolean; flat?: FlatInfo };
  assignPhoneToFlat: (flatId: string, phone: string) => void;
  loginAsAdmin: (pin: string) => { success: boolean; error?: string };
  loginAsAdminWithPassword: (identifier: string, password: string) => { success: boolean; error?: string };
  sendAdminEmailOtp: (emailInput?: string) => Promise<{ success: boolean; email?: string; error?: string; devOtp?: string }>;
  verifyAdminEmailOtp: (otp: string) => { success: boolean; error?: string };
  logout: () => void;
  switchRoleQuickly: (role: 'admin' | 'resident', flatId?: string) => void;
  switchToResidentView: (flatId?: string) => void;
  switchToAdminView: () => void;
  isCommitteeMember: boolean;
  isAppLocked: boolean;
  lockReason: 'killed' | 'inactivity' | 'manual' | null;
  lockApp: (reason?: 'inactivity' | 'manual') => void;
  unlockAppWithPin: (pin: string) => { success: boolean; error?: string; requiresPinSetup?: boolean };
  unlockAppDirectly: () => void;
  addNotification: (title: string, message: string, type: AppNotification['type'], targetFlatId?: string) => void;
  markAllNotificationsRead: () => void;
  resetAllData: () => void;
  exportBackupJson: () => string;
  importBackupJson: (jsonStr: string) => { success: boolean; message: string };
}

/**
 * Synchronize carried-forward balances (remaining unpaid dues or advance paid credits)
 * chronologically across all billing cycles.
 */
export function syncCycleBalances(allCycles: BillingCycle[]): BillingCycle[] {
  if (!allCycles || allCycles.length === 0) return [];

  // Sort cycles chronologically by monthKey or id
  const sorted = [...allCycles].sort((a, b) => {
    const keyA = a.monthKey || a.id;
    const keyB = b.monthKey || b.id;
    return keyA.localeCompare(keyB);
  });

  // Track cumulative carry-forward balance for each flatId:
  // positive = unpaid remaining dues, negative = advance paid credit
  const flatCumulativeBalance = new Map<string, number>();

  const updatedCycles = sorted.map((cycle, cycleIndex) => {
    let totalBilled = 0;
    let totalCollected = 0;

    const updatedReadings = cycle.readings.map((r) => {
      // 1. Calculate current month bill (energy + common + maintenance)
      const energy = r.calculatedAmount ?? (r.unitsConsumed * r.ratePerUnit);
      const common = r.commonMeterCharges ?? 160;
      const maint = r.maintenanceCharges ?? 110;
      const currentMonthBill = energy + common + maint;

      // 2. Previous balance carried forward from preceding cycle
      const carriedBalance = cycleIndex === 0 ? (r.previousBalance ?? 0) : (flatCumulativeBalance.get(r.flatId) ?? 0);

      // 3. Net payable amount = currentMonthBill + carriedBalance
      const netPayable = currentMonthBill + carriedBalance;

      // 4. Determine paidAmount & remainingBalance
      let paidAmt = r.paidAmount;
      let status = r.paymentStatus;

      // If status was already marked 'paid' without explicit paidAmount, default paidAmt to netPayable
      if (status === 'paid' && (paidAmt === undefined || paidAmt === null)) {
        paidAmt = netPayable;
      }

      let remaining = netPayable;
      let advance = 0;

      if (paidAmt !== undefined && paidAmt !== null) {
        remaining = netPayable - paidAmt;
        if (remaining < 0) {
          advance = Math.abs(remaining);
          status = 'paid';
        } else if (remaining === 0) {
          advance = 0;
          status = 'paid';
        } else if (paidAmt > 0) {
          status = 'partially_paid';
        } else {
          status = 'unpaid';
        }
      } else if (status === 'pending') {
        remaining = netPayable;
      } else {
        status = 'unpaid';
        remaining = netPayable;
      }

      // Update the cumulative balance for this flat to carry over to the next cycle
      flatCumulativeBalance.set(r.flatId, remaining);

      totalBilled += currentMonthBill;
      if (paidAmt && paidAmt > 0) {
        totalCollected += paidAmt;
      }

      return {
        ...r,
        totalBillAmount: currentMonthBill,
        previousBalance: carriedBalance,
        netPayableAmount: netPayable,
        paidAmount: paidAmt,
        remainingBalance: remaining,
        advancePaid: advance,
        paymentStatus: status,
      };
    });

    return {
      ...cycle,
      readings: updatedReadings,
      totalBilledAmount: totalBilled,
      totalCollectedAmount: totalCollected,
    };
  });

  return updatedCycles;
}

const STORAGE_KEYS = {
  SETTINGS: 'bijli_building_settings_v1',
  FLATS: 'bijli_flats_v1',
  CYCLES: 'bijli_cycles_v1',
  ACTIVE_CYCLE_ID: 'bijli_active_cycle_id_v1',
  NOTIFICATIONS: 'bijli_notifications_v1',
  SESSION: 'bijli_session_v1',
  EXPENSES: 'bijli_expenses_v1',
  MANUAL_COLLECTIONS: 'bijli_manual_collections_v1',
  SESSION_UNLOCKED: 'bijli_session_unlocked_v1',
  LAST_ACTIVE: 'bijli_last_active_time_v1',
};

// Auto-lock after 10 minutes of inactivity
const AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000;

const BuildingContext = createContext<BuildingContextType | undefined>(undefined);

export const BuildingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BuildingSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          upiQrCodeUrl: parsed.upiQrCodeUrl || undefined,
          defaultCommonMeterCharges: parsed.defaultCommonMeterCharges ?? 160,
          defaultCommonMeterLabel: parsed.defaultCommonMeterLabel || 'Water & stairs light',
          defaultMaintenanceCharges: parsed.defaultMaintenanceCharges ?? 110,
          defaultMaintenanceLabel: parsed.defaultMaintenanceLabel || 'Cleaning',
        };
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [flats, setFlats] = useState<FlatInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLATS);
      if (saved) {
        const parsed = JSON.parse(saved) as FlatInfo[];
        return parsed.map((f) => {
          if (f.id === 'flat-203' && (!f.phone || f.phone === '9820111203')) {
            return { ...f, phone: '9876554327' };
          }
          return f;
        });
      }
      return INITIAL_FLATS;
    } catch {
      return INITIAL_FLATS;
    }
  });

  const [cycles, setCycles] = useState<BillingCycle[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CYCLES);
      if (saved) {
        const parsed = JSON.parse(saved) as BillingCycle[];
        const mapped = parsed.map((c) => ({
          ...c,
          readings: c.readings.map((r) => ({
            ...r,
            commonMeterCharges: r.commonMeterCharges ?? 160,
            commonMeterLabel: r.commonMeterLabel || 'Water & stairs light',
            maintenanceCharges: r.maintenanceCharges ?? 110,
            maintenanceLabel: r.maintenanceLabel || 'Cleaning',
          })),
        }));
        return syncCycleBalances(mapped);
      }
      return syncCycleBalances(INITIAL_CYCLES);
    } catch {
      return syncCycleBalances(INITIAL_CYCLES);
    }
  });

  const [activeCycleId, setActiveCycleId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_CYCLE_ID);
      return saved || (INITIAL_CYCLES[0] ? INITIAL_CYCLES[0].id : '');
    } catch {
      return INITIAL_CYCLES[0] ? INITIAL_CYCLES[0].id : '';
    }
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [expenses, setExpenses] = useState<BuildingExpense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [monthlyManualCollections, setMonthlyManualCollections] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MANUAL_COLLECTIONS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Production session: user must enter their phone number and verify OTP to log in
  const [currentSession, setCurrentSession] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.isPhoneVerified || parsed.role)) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // App Lock State: Ask for PIN if app is killed / newly opened, and auto-lock after 10 min inactivity
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!savedSession) return false;
      const parsed = JSON.parse(savedSession);
      if (!parsed || (!parsed.isPhoneVerified && !parsed.role)) return false;

      // User has an existing saved account in localStorage
      // Check if current browser session / tab was unlocked via sessionStorage
      const isUnlockedInThisSession = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED) === 'true';
      if (!isUnlockedInThisSession) {
        // App was killed or fresh tab opened -> must ask for PIN
        return true;
      }

      // If unlocked in current tab, check if 10 minutes of inactivity passed
      const lastActiveStr = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;
      if (lastActive && Date.now() - lastActive >= AUTO_LOCK_TIMEOUT_MS) {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  });

  const [lockReason, setLockReason] = useState<'killed' | 'inactivity' | 'manual' | null>(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!savedSession) return null;
      const isUnlockedInThisSession = sessionStorage.getItem(STORAGE_KEYS.SESSION_UNLOCKED) === 'true';
      if (!isUnlockedInThisSession) {
        return 'killed';
      }
      const lastActiveStr = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;
      if (lastActive && Date.now() - lastActive >= AUTO_LOCK_TIMEOUT_MS) {
        return 'inactivity';
      }
      return null;
    } catch {
      return null;
    }
  });

  const lastActiveRef = useRef<number>(Date.now());
  const lastLocalActiveWriteRef = useRef<number>(Date.now());

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(null);
  const isLocalSavingRef = useRef<boolean>(false);
  const lastLocalSaveTimeRef = useRef<number>(0);

  // Firestore Real-Time Synchronization
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      const docRef = doc(db, 'buildings', 'main_society');
      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          // If we recently performed a local save (within 2.5 seconds) or save is in flight,
          // ignore this echo snapshot to prevent race conditions from reverting local edits
          const timeSinceLastLocalSave = Date.now() - lastLocalSaveTimeRef.current;
          if (isLocalSavingRef.current || timeSinceLastLocalSave < 2500) {
            setCloudSyncStatus('connected');
            setLastCloudSync(new Date());
            return;
          }

          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.settings) {
              setSettings((prev) => ({ ...prev, ...data.settings }));
            }
            if (Array.isArray(data.flats) && data.flats.length > 0) {
              setFlats(data.flats);
            }
            if (Array.isArray(data.cycles) && data.cycles.length > 0) {
              setCycles(syncCycleBalances(data.cycles));
            }
            if (data.activeCycleId) {
              setActiveCycleId(data.activeCycleId);
            }
            if (Array.isArray(data.expenses)) {
              setExpenses(data.expenses);
            }
            if (data.manualCollections && typeof data.manualCollections === 'object') {
              setMonthlyManualCollections(data.manualCollections);
            }
            setCloudSyncStatus('connected');
            setLastCloudSync(new Date());
          } else {
            // First time running with Firestore:
            // Check if localStorage has saved custom flats or settings to seed Firestore
            try {
              const localFlatsStr = localStorage.getItem(STORAGE_KEYS.FLATS);
              const initialFlatsToSave = localFlatsStr ? JSON.parse(localFlatsStr) : flats;
              const initialSettingsToSave = settings;
              const localExpensesStr = localStorage.getItem(STORAGE_KEYS.EXPENSES);
              const initialExpensesToSave = localExpensesStr ? JSON.parse(localExpensesStr) : expenses;
              setDoc(
                docRef,
                JSON.parse(
                  JSON.stringify({
                    settings: initialSettingsToSave,
                    flats: initialFlatsToSave,
                    cycles,
                    activeCycleId,
                    expenses: initialExpensesToSave,
                    manualCollections: monthlyManualCollections,
                    updatedAt: new Date().toISOString(),
                  })
                ),
                { merge: true }
              )
                .then(() => {
                  setCloudSyncStatus('connected');
                  setLastCloudSync(new Date());
                })
                .catch((err) => {
                  handleFirestoreError(err, OperationType.WRITE, 'buildings/main_society');
                  setCloudSyncStatus('offline');
                });
            } catch (e) {
              console.warn('Error reading local storage for firestore seeding:', e);
              setCloudSyncStatus('connected');
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'buildings/main_society');
          setCloudSyncStatus('offline');
        }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'buildings/main_society');
      setCloudSyncStatus('offline');
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const saveToCloud = async (
    customSettings?: BuildingSettings,
    customFlats?: FlatInfo[],
    customCycles?: BillingCycle[],
    customActiveCycleId?: string,
    customExpenses?: BuildingExpense[],
    customManualCollections?: Record<string, number>
  ): Promise<boolean> => {
    try {
      isLocalSavingRef.current = true;
      lastLocalSaveTimeRef.current = Date.now();
      setCloudSyncStatus('syncing');
      const docRef = doc(db, 'buildings', 'main_society');
      const payload = JSON.parse(
        JSON.stringify({
          settings: customSettings || settings,
          flats: customFlats || flats,
          cycles: customCycles || cycles,
          activeCycleId: customActiveCycleId || activeCycleId,
          expenses: customExpenses || expenses,
          manualCollections: customManualCollections || monthlyManualCollections,
          updatedAt: new Date().toISOString(),
        })
      );
      await setDoc(docRef, payload, { merge: true });
      lastLocalSaveTimeRef.current = Date.now();
      setCloudSyncStatus('connected');
      setLastCloudSync(new Date());
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'buildings/main_society');
      setCloudSyncStatus('offline');
      return false;
    } finally {
      setTimeout(() => {
        isLocalSavingRef.current = false;
      }, 500);
    }
  };

  const saveAllFlats = async (updatedFlats: FlatInfo[]): Promise<boolean> => {
    setFlats(updatedFlats);
    return await saveToCloud(undefined, updatedFlats);
  };

  // Auto-sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error(e);
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(flats));
    } catch (e) {
      console.error(e);
    }
  }, [flats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(cycles));
    } catch (e) {
      console.error(e);
    }
  }, [cycles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CYCLE_ID, activeCycleId);
    } catch (e) {
      console.error(e);
    }
  }, [activeCycleId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.error(e);
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch (e) {
      console.error(e);
    }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MANUAL_COLLECTIONS, JSON.stringify(monthlyManualCollections));
    } catch (e) {
      console.error(e);
    }
  }, [monthlyManualCollections]);

  useEffect(() => {
    try {
      if (currentSession) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentSession));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentSession]);

  // Helper to establish an authenticated session and unlock the screen
  const setAndUnlockSession = (newSession: UserSession | null) => {
    setCurrentSession(newSession);
    if (newSession) {
      try {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, 'true');
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
      } catch {}
      lastActiveRef.current = Date.now();
      setIsAppLocked(false);
      setLockReason(null);
    } else {
      try {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
      } catch {}
      setIsAppLocked(false);
      setLockReason(null);
    }
  };

  const lockApp = (reason: 'inactivity' | 'manual' = 'inactivity') => {
    if (!currentSession) return;
    setIsAppLocked(true);
    setLockReason(reason);
    try {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
    } catch {}
  };

  const unlockAppDirectly = () => {
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_UNLOCKED, 'true');
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now().toString());
    } catch {}
    lastActiveRef.current = Date.now();
    setIsAppLocked(false);
    setLockReason(null);
  };

  const unlockAppWithPin = (enteredPin: string): { success: boolean; error?: string; requiresPinSetup?: boolean } => {
    if (!currentSession) {
      return { success: false, error: 'No active user session found.' };
    }

    const trimmed = enteredPin.trim();
    if (!trimmed) {
      return { success: false, error: 'Please enter your security PIN.' };
    }

    // Admin / Secretary Unlock
    if (currentSession.role === 'admin' || currentSession.isCommitteeMember) {
      const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim() || '1234';
      const configuredPwd = settings.adminPassword || INITIAL_SETTINGS.adminPassword || 'My1Build2@3';

      if (trimmed === configuredPin || trimmed === configuredPwd) {
        unlockAppDirectly();
        return { success: true };
      }
      return { success: false, error: 'Incorrect Admin PIN. Default PIN is 1234.' };
    }

    // Resident Flat Unlock
    const targetFlat = flats.find((f) => f.id === currentSession.flatId) ||
      flats.find((f) => f.phone && currentSession.phone && f.phone.replace(/\D/g, '') === currentSession.phone.replace(/\D/g, ''));

    if (!targetFlat) {
      return { success: false, error: 'Registered flat record could not be found.' };
    }

    if (!targetFlat.pin || targetFlat.pin.trim().length === 0) {
      return {
        success: false,
        requiresPinSetup: true,
        error: 'No PIN set yet for this flat. Please set a 4-digit PIN.',
      };
    }

    if (targetFlat.pin !== trimmed) {
      return { success: false, error: 'Incorrect PIN. Please re-enter carefully.' };
    }

    unlockAppDirectly();
    return { success: true };
  };

  // Inactivity Auto-Lock Effect: 10 minutes idle timeout & background/visibility checks
  useEffect(() => {
    if (!currentSession || isAppLocked) return;

    const handleUserActivity = () => {
      const now = Date.now();
      lastActiveRef.current = now;
      if (now - lastLocalActiveWriteRef.current > 5000) {
        lastLocalActiveWriteRef.current = now;
        try {
          localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, now.toString());
        } catch {}
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    // Periodic check every 5 seconds for 10-minute inactivity
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActiveRef.current;
      if (elapsed >= AUTO_LOCK_TIMEOUT_MS) {
        lockApp('inactivity');
      }
    }, 5000);

    // Tab visibility & focus change check (when returning to app after tab backgrounded or phone unlocked)
    const handleVisibilityOrFocus = () => {
      const lastSaved = Number(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE) || lastActiveRef.current);
      if (Date.now() - lastSaved >= AUTO_LOCK_TIMEOUT_MS) {
        lockApp('inactivity');
      } else {
        handleUserActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [currentSession, isAppLocked]);

  const activeCycle = cycles.find((c) => c.id === activeCycleId) || cycles[0];

  const unreadCount = notifications.filter(
    (n) => !n.isRead && (!n.targetFlatId || (currentSession?.flatId && n.targetFlatId === currentSession.flatId))
  ).length;

  const updateSettings = (updates: Partial<BuildingSettings>, autoApplyToBills: boolean = true) => {
    setSettings((prev) => ({ ...prev, ...updates }));

    if (
      autoApplyToBills &&
      (updates.defaultCommonMeterCharges !== undefined ||
        updates.defaultMaintenanceCharges !== undefined ||
        updates.defaultCommonMeterLabel !== undefined ||
        updates.defaultMaintenanceLabel !== undefined)
    ) {
      setCycles((prev) =>
        prev.map((c) => {
          const updatedReadings = c.readings.map((r) => {
            const commonCharges =
              updates.defaultCommonMeterCharges !== undefined
                ? updates.defaultCommonMeterCharges
                : (r.commonMeterCharges ?? 160);
            const commonLabel =
              updates.defaultCommonMeterLabel !== undefined
                ? updates.defaultCommonMeterLabel
                : (r.commonMeterLabel || 'Water & stairs light');
            const maintCharges =
              updates.defaultMaintenanceCharges !== undefined
                ? updates.defaultMaintenanceCharges
                : (r.maintenanceCharges ?? 110);
            const maintLabel =
              updates.defaultMaintenanceLabel !== undefined
                ? updates.defaultMaintenanceLabel
                : (r.maintenanceLabel || 'Cleaning');

            const energy = r.calculatedAmount ?? (r.unitsConsumed * r.ratePerUnit);
            const newTotal = energy + commonCharges + maintCharges + (r.lateFee || 0);

            return {
              ...r,
              commonMeterCharges: commonCharges,
              commonMeterLabel: commonLabel,
              maintenanceCharges: maintCharges,
              maintenanceLabel: maintLabel,
              totalBillAmount: newTotal,
            };
          });

          const totalBilled = updatedReadings.reduce((acc, r) => acc + r.totalBillAmount, 0);
          const totalCollected = updatedReadings
            .filter((r) => r.paymentStatus === 'paid')
            .reduce((acc, r) => acc + (r.paidAmount || r.totalBillAmount), 0);

          return {
            ...c,
            readings: updatedReadings,
            totalBilledAmount: totalBilled,
            totalCollectedAmount: totalCollected,
          };
        })
      );
    }

    saveToCloud({ ...settings, ...updates });
    addNotification('Settings Updated', 'Building billing settings were updated successfully.', 'system');
  };

  const applyChargesToAllFlats = (
    params: {
      commonMeterCharges?: number;
      commonMeterLabel?: string;
      maintenanceCharges?: number;
      maintenanceLabel?: string;
    },
    autoApplyToCycles: boolean = true
  ) => {
    setSettings((prev) => ({
      ...prev,
      defaultCommonMeterCharges:
        params.commonMeterCharges !== undefined ? params.commonMeterCharges : prev.defaultCommonMeterCharges,
      defaultCommonMeterLabel:
        params.commonMeterLabel !== undefined ? params.commonMeterLabel : prev.defaultCommonMeterLabel,
      defaultMaintenanceCharges:
        params.maintenanceCharges !== undefined ? params.maintenanceCharges : prev.defaultMaintenanceCharges,
      defaultMaintenanceLabel:
        params.maintenanceLabel !== undefined ? params.maintenanceLabel : prev.defaultMaintenanceLabel,
    }));

    if (autoApplyToCycles) {
      setCycles((prev) =>
        prev.map((c) => {
          const updatedReadings = c.readings.map((r) => {
            const commonCharges =
              params.commonMeterCharges !== undefined
                ? params.commonMeterCharges
                : (r.commonMeterCharges ?? settings.defaultCommonMeterCharges ?? 160);
            const commonLabel =
              params.commonMeterLabel !== undefined
                ? params.commonMeterLabel
                : (r.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light');
            const maintCharges =
              params.maintenanceCharges !== undefined
                ? params.maintenanceCharges
                : (r.maintenanceCharges ?? settings.defaultMaintenanceCharges ?? 110);
            const maintLabel =
              params.maintenanceLabel !== undefined
                ? params.maintenanceLabel
                : (r.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning');

            const energy = r.calculatedAmount ?? (r.unitsConsumed * r.ratePerUnit);
            const newTotal = energy + commonCharges + maintCharges + (r.lateFee || 0);

            return {
              ...r,
              commonMeterCharges: commonCharges,
              commonMeterLabel: commonLabel,
              maintenanceCharges: maintCharges,
              maintenanceLabel: maintLabel,
              totalBillAmount: newTotal,
            };
          });

          const totalBilled = updatedReadings.reduce((acc, r) => acc + r.totalBillAmount, 0);
          const totalCollected = updatedReadings
            .filter((r) => r.paymentStatus === 'paid')
            .reduce((acc, r) => acc + (r.paidAmount || r.totalBillAmount), 0);

          return {
            ...c,
            readings: updatedReadings,
            totalBilledAmount: totalBilled,
            totalCollectedAmount: totalCollected,
          };
        })
      );
    }

    addNotification(
      'Charges Auto-Applied',
      `Auto-applied ₹${params.commonMeterCharges ?? settings.defaultCommonMeterCharges} common meter & ₹${params.maintenanceCharges ?? settings.defaultMaintenanceCharges} maintenance charges to all 15 flat bills.`,
      'system'
    );
  };

  const updateChargeLabels = (labels: { commonMeterLabel?: string; maintenanceLabel?: string }) => {
    setSettings((prev) => ({
      ...prev,
      defaultCommonMeterLabel: labels.commonMeterLabel !== undefined ? labels.commonMeterLabel : prev.defaultCommonMeterLabel,
      defaultMaintenanceLabel: labels.maintenanceLabel !== undefined ? labels.maintenanceLabel : prev.defaultMaintenanceLabel,
    }));

    setCycles((prev) =>
      prev.map((c) => ({
        ...c,
        readings: c.readings.map((r) => ({
          ...r,
          commonMeterLabel: labels.commonMeterLabel !== undefined ? labels.commonMeterLabel : r.commonMeterLabel,
          maintenanceLabel: labels.maintenanceLabel !== undefined ? labels.maintenanceLabel : r.maintenanceLabel,
        })),
      }))
    );
  };

  const updateFlat = (flatId: string, updates: Partial<FlatInfo>) => {
    const updatedFlats = flats.map((f) => (f.id === flatId ? { ...f, ...updates } : f));
    setFlats(updatedFlats);

    let updatedCycles = cycles;
    // If flatNumber is updated, sync it across all billing cycles
    if (updates.flatNumber) {
      const newFlatNumber = updates.flatNumber;
      updatedCycles = cycles.map((c) => ({
        ...c,
        readings: c.readings.map((r) =>
          r.flatId === flatId ? { ...r, flatNumber: newFlatNumber } : r
        ),
      }));
      setCycles(updatedCycles);
    }

    // Persist directly to Firestore
    saveToCloud(undefined, updatedFlats, updatedCycles);

    // If current session is for this flat, update session details
    setCurrentSession((prev) => {
      if (prev && prev.flatId === flatId) {
        return {
          ...prev,
          name: updates.ownerName || prev.name,
          phone: updates.phone || prev.phone,
          flatNumber: updates.flatNumber || prev.flatNumber,
        };
      }
      return prev;
    });
  };

  const updateFlatCustomRate = (flatId: string, rate: number | undefined) => {
    const updatedFlats = flats.map((f) => (f.id === flatId ? { ...f, customRatePerUnit: rate } : f));
    setFlats(updatedFlats);
    saveToCloud(undefined, updatedFlats);
  };

  const saveNewCycle = (cycle: BillingCycle) => {
    setCycles((prev) => syncCycleBalances([cycle, ...prev.filter((c) => c.id !== cycle.id)]));
    setActiveCycleId(cycle.id);
    addNotification(
      `New Bill Generated: ${cycle.month}`,
      `Readings for all flats have been recorded. Due date is ${cycle.dueDate}. Total sub-meter units: ${cycle.totalSubMeterUnits}.`,
      'bill_generated'
    );
  };

  const createNewCycle = (params?: {
    month?: string;
    dueDate?: string;
    mainMeterUnits?: number;
    mainMeterBillAmount?: number;
  }): BillingCycle => {
    // Determine next month based on activeCycle
    const currentMonthKey = activeCycle?.monthKey || '2026-09';
    const [yearStr, monthStr] = currentMonthKey.split('-');
    let year = parseInt(yearStr, 10);
    let monthNum = parseInt(monthStr, 10) + 1;
    if (monthNum > 12) {
      monthNum = 1;
      year += 1;
    }
    const nextMonthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const nextMonthName = params?.month || `${monthNames[monthNum - 1]} ${year}`;
    const nextCycleId = `cycle-${nextMonthKey}`;

    // Read previous readings from active cycle's current readings
    const previousReadingMap = new Map<string, number>();
    if (activeCycle) {
      activeCycle.readings.forEach((r) => {
        previousReadingMap.set(r.flatId, r.currentReading);
      });
    }

    const defaultMainUnits = params?.mainMeterUnits || activeCycle?.mainMeter.mainMeterUnits || 2000;
    const defaultMainBill = params?.mainMeterBillAmount || activeCycle?.mainMeter.mainMeterBillAmount || 16000;
    const defaultPrevMain = activeCycle?.mainMeter.mainMeterCurrentReading || 50000;
    const defaultCurrMain = defaultPrevMain + defaultMainUnits;

    // Create preliminary flat readings
    const newReadings: FlatReadingEntry[] = flats.map((f) => {
      const prevReading = previousReadingMap.get(f.id) ?? f.baselineReading;
      const currReading = prevReading + 100;
      const units = currReading - prevReading;
      const rate =
        f.customRatePerUnit !== undefined && f.customRatePerUnit > 0
          ? f.customRatePerUnit
          : settings.defaultRatePerUnit;
      const energy = units * rate;
      const common = settings.defaultCommonMeterCharges ?? 160;
      const maint = settings.defaultMaintenanceCharges ?? 110;
      const total = energy + common + maint;

      return {
        flatId: f.id,
        flatNumber: f.flatNumber,
        previousReading: prevReading,
        currentReading: currReading,
        unitsConsumed: units,
        ratePerUnit: rate,
        calculatedAmount: energy,
        commonShareAmount: common,
        maintenanceCharges: maint,
        maintenanceLabel: settings.defaultMaintenanceLabel || 'Cleaning',
        commonMeterCharges: common,
        commonMeterLabel: settings.defaultCommonMeterLabel || 'Water & stairs light',
        totalBillAmount: total,
        paymentStatus: 'unpaid',
      };
    });

    const newCycle: BillingCycle = {
      id: nextCycleId,
      month: nextMonthName,
      monthKey: nextMonthKey,
      generatedDate: new Date().toISOString().split('T')[0],
      dueDate: params?.dueDate || `${year}-${String(monthNum).padStart(2, '0')}-20`,
      calculationMode: settings.calculationMode,
      mainMeter: {
        mainMeterPreviousReading: defaultPrevMain,
        mainMeterCurrentReading: defaultCurrMain,
        mainMeterUnits: defaultMainUnits,
        mainMeterBillAmount: defaultMainBill,
        commonAreaRule: 'divide_by_flat_units',
      },
      totalSubMeterUnits: newReadings.reduce((acc, r) => acc + r.unitsConsumed, 0),
      effectiveRatePerUnit: settings.defaultRatePerUnit,
      totalBilledAmount: newReadings.reduce((acc, r) => acc + r.totalBillAmount, 0),
      totalCollectedAmount: 0,
      isLocked: false,
      readings: newReadings,
    };

    setCycles((prev) => {
      const existingFiltered = prev.filter((c) => c.id !== nextCycleId);
      const combined = [...existingFiltered, newCycle];
      return syncCycleBalances(combined);
    });

    setActiveCycleId(nextCycleId);
    addNotification(
      `New Billing Month Created: ${nextMonthName}`,
      `Created bill cycle for ${nextMonthName}. Remaining dues and advance credits have been automatically carried forward for each flat.`,
      'bill_generated'
    );

    return newCycle;
  };

  const updateCycleReadings = (
    cycleId: string,
    readings: BillingCycle['readings'],
    mainMeter?: BillingCycle['mainMeter']
  ) => {
    let finalUpdatedCycles: BillingCycle[] = [];
    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== cycleId) return c;
        const totalBilled = readings.reduce((acc, r) => acc + r.totalBillAmount, 0);
        const totalCollected = readings
          .filter((r) => r.paymentStatus === 'paid')
          .reduce((acc, r) => acc + (r.paidAmount || r.totalBillAmount), 0);
        const totalUnits = readings.reduce((acc, r) => acc + r.unitsConsumed, 0);
        return {
          ...c,
          readings,
          mainMeter: mainMeter || c.mainMeter,
          totalSubMeterUnits: totalUnits,
          totalBilledAmount: totalBilled,
          totalCollectedAmount: totalCollected,
        };
      });
      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    if (finalUpdatedCycles.length > 0) {
      saveToCloud(undefined, undefined, finalUpdatedCycles);
    }
  };

  const markPaymentStatus = (
    cycleId: string,
    flatId: string,
    status: 'paid' | 'unpaid' | 'pending' | 'partially_paid',
    details?: {
      method?: 'UPI' | 'Cash' | 'Bank Transfer';
      upiRef?: string;
      paidAmount?: number;
      adminNotes?: string;
    }
  ) => {
    let finalUpdatedCycles: BillingCycle[] = [];
    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== cycleId) return c;
        const updatedReadings = c.readings.map((r) => {
          if (r.flatId !== flatId) return r;
          const isPaying = status === 'paid' || status === 'partially_paid';
          const net = r.netPayableAmount ?? r.totalBillAmount;
          const effectivePaid = isPaying ? (details?.paidAmount !== undefined ? details.paidAmount : net) : undefined;

          return {
            ...r,
            paymentStatus: status,
            paidAmount: effectivePaid,
            paidDate: isPaying ? new Date().toISOString().split('T')[0] : undefined,
            paymentMethod: details?.method || r.paymentMethod || 'UPI',
            upiReference: details?.upiRef || r.upiReference,
            adminNotes: details?.adminNotes || r.adminNotes,
          };
        });

        return {
          ...c,
          readings: updatedReadings,
        };
      });

      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    if (finalUpdatedCycles.length > 0) {
      saveToCloud(undefined, undefined, finalUpdatedCycles);
    }

    const targetFlat = flats.find((f) => f.id === flatId);
    if (status === 'paid' || status === 'partially_paid') {
      addNotification(
        `Payment Confirmed - Flat ${targetFlat?.flatNumber || ''}`,
        `Payment of ₹${details?.paidAmount ?? 'full'} for Flat ${targetFlat?.flatNumber || ''} recorded (${status === 'paid' ? 'Paid' : 'Partially Paid'}).`,
        'payment_received',
        flatId
      );
    }
  };

  const submitResidentPaymentProof = (
    cycleId: string,
    flatId: string,
    upiRef: string,
    paidAmount: number
  ) => {
    markPaymentStatus(cycleId, flatId, 'pending', {
      method: 'UPI',
      upiRef,
      paidAmount,
      adminNotes: 'Submitted by resident for verification',
    });
    addNotification(
      'New Payment Verification Pending',
      `Flat ${flats.find((f) => f.id === flatId)?.flatNumber} submitted UPI Ref: ${upiRef} for ₹${paidAmount}. Please verify.`,
      'payment_received'
    );
  };

  const checkPhoneRegistration = (phone: string) => {
    const rawClean = phone.replace(/\D/g, '');
    const tenDigit = rawClean.length > 10 ? rawClean.slice(-10) : rawClean;

    if (!tenDigit || tenDigit.length < 10) {
      return {
        isRegistered: false,
        hasPin: false,
        error: 'Please enter a valid 10-digit mobile number.',
      };
    }

    const adminCleanPhone = (settings.adminPhone || INITIAL_SETTINGS.adminPhone || '').replace(/\D/g, '');
    const adminTen = adminCleanPhone.length > 10 ? adminCleanPhone.slice(-10) : adminCleanPhone;
    const isSecretary = Boolean(
      adminTen &&
      (tenDigit === adminTen || rawClean === adminCleanPhone)
    );

    if (isSecretary) {
      return {
        isRegistered: true,
        hasPin: true,
        isSecretary: true,
      };
    }

    const matchedFlat = flats.find((f) => {
      const fClean = (f.phone || '').replace(/\D/g, '');
      const fTen = fClean.length > 10 ? fClean.slice(-10) : fClean;
      return fTen === tenDigit || fClean === rawClean || (tenDigit.length >= 10 && fClean.endsWith(tenDigit));
    });

    if (!matchedFlat) {
      return {
        isRegistered: false,
        hasPin: false,
        error: `Mobile number +91 ${tenDigit} is not registered with any flat. Please contact the society secretary to register your number.`,
      };
    }

    const hasPin = Boolean(matchedFlat.pin && matchedFlat.pin.trim().length >= 4);

    return {
      isRegistered: true,
      hasPin,
      flat: matchedFlat,
      isSecretary: false,
    };
  };

  const setFlatPin = async (flatId: string, pin: string): Promise<boolean> => {
    const trimmed = pin.trim();
    const updatedFlats = flats.map((f) => (f.id === flatId ? { ...f, pin: trimmed } : f));
    setFlats(updatedFlats);
    try {
      localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(updatedFlats));
    } catch {}
    return await saveToCloud(undefined, updatedFlats);
  };

  const resetFlatPin = async (flatId: string): Promise<boolean> => {
    const updatedFlats = flats.map((f) => (f.id === flatId ? { ...f, pin: undefined } : f));
    setFlats(updatedFlats);
    try {
      localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(updatedFlats));
    } catch {}
    return await saveToCloud(undefined, updatedFlats);
  };

  const loginResidentWithPin = (phone: string, pin: string) => {
    const rawClean = phone.replace(/\D/g, '');
    const tenDigit = rawClean.length > 10 ? rawClean.slice(-10) : rawClean;
    const trimmedPin = pin?.trim() || '';

    // Check Secretary
    const adminCleanPhone = (settings.adminPhone || INITIAL_SETTINGS.adminPhone || '').replace(/\D/g, '');
    const adminTen = adminCleanPhone.length > 10 ? adminCleanPhone.slice(-10) : adminCleanPhone;
    if (adminTen && (tenDigit === adminTen || rawClean === adminCleanPhone)) {
      const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim() || '1234';
      const configuredPwd = settings.adminPassword || INITIAL_SETTINGS.adminPassword || 'My1Build2@3';
      if (trimmedPin === configuredPin || trimmedPin === configuredPwd) {
        const session: UserSession = {
          role: 'admin',
          name: 'Society Secretary',
          phone: settings.adminPhone || tenDigit,
          email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
          flatId: settings.adminFlatId || 'flat-101',
          isCommitteeMember: true,
          isPhoneVerified: true,
        };
        setAndUnlockSession(session);
        return { success: true, role: 'admin' as const };
      } else {
        return { success: false, error: 'Incorrect Admin PIN or password.' };
      }
    }

    const matchedFlat = flats.find((f) => {
      const fClean = (f.phone || '').replace(/\D/g, '');
      const fTen = fClean.length > 10 ? fClean.slice(-10) : fClean;
      return fTen === tenDigit || fClean === rawClean || (tenDigit.length >= 10 && fClean.endsWith(tenDigit));
    });

    if (!matchedFlat) {
      return {
        success: false,
        error: `Mobile number +91 ${tenDigit} is not registered in this building.`,
      };
    }

    if (!matchedFlat.pin) {
      return {
        success: false,
        error: 'Security PIN has not been set yet for this flat. Please set your PIN first.',
        flat: matchedFlat,
      };
    }

    if (matchedFlat.pin !== trimmedPin) {
      return {
        success: false,
        error: 'Incorrect PIN. Please re-enter or contact society office to reset.',
        flat: matchedFlat,
      };
    }

    const session: UserSession = {
      role: 'resident',
      flatId: matchedFlat.id,
      flatNumber: matchedFlat.flatNumber,
      phone: matchedFlat.phone,
      name: matchedFlat.ownerName,
      isPhoneVerified: true,
    };
    setAndUnlockSession(session);
    return { success: true, flat: matchedFlat, role: 'resident' as const };
  };

  const loginAsResident = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const adminCleanPhone = (settings.adminPhone || INITIAL_SETTINGS.adminPhone || '').replace(/\D/g, '');

    // Check if phone matches society secretary/admin
    if (
      adminCleanPhone &&
      (cleanPhone === adminCleanPhone ||
        cleanPhone.endsWith(adminCleanPhone) ||
        adminCleanPhone.endsWith(cleanPhone))
    ) {
      const session: UserSession = {
        role: 'admin',
        name: 'Society Secretary',
        phone: settings.adminPhone || cleanPhone,
        email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
        flatId: settings.adminFlatId || 'flat-101',
        isCommitteeMember: true,
        isPhoneVerified: true,
      };
      setAndUnlockSession(session);
      return { success: true, role: 'admin' as const };
    }

    const matchedFlat = flats.find(
      (f) =>
        f.phone.replace(/\D/g, '') === cleanPhone ||
        cleanPhone.endsWith(f.flatNumber) ||
        (cleanPhone.length >= 10 && f.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)))
    );

    if (!matchedFlat) {
      return { success: false, error: 'No flat registered with this mobile number.' };
    }

    const session: UserSession = {
      role: 'resident',
      flatId: matchedFlat.id,
      flatNumber: matchedFlat.flatNumber,
      phone: matchedFlat.phone,
      name: matchedFlat.ownerName,
      isPhoneVerified: true,
    };
    setAndUnlockSession(session);
    return { success: true, flat: matchedFlat, role: 'resident' as const };
  };

  const loginDirectlyAsFlat = (flatId: string, customPhone?: string) => {
    const targetFlat = flats.find((f) => f.id === flatId) || flats[0];
    const session: UserSession = {
      role: 'resident',
      flatId: targetFlat.id,
      flatNumber: targetFlat.flatNumber,
      phone: customPhone || targetFlat.phone,
      name: targetFlat.ownerName,
      isPhoneVerified: true,
    };
    setAndUnlockSession(session);
    return { success: true, flat: targetFlat };
  };

  const assignPhoneToFlat = (flatId: string, newPhone: string) => {
    const cleanPhone = newPhone.replace(/\D/g, '');
    setFlats((prev) =>
      prev.map((f) => (f.id === flatId ? { ...f, phone: cleanPhone } : f))
    );
  };

  const loginAsAdmin = (pin: string) => {
    // Only allow PIN login if explicit configured adminPin matches and is non-empty
    const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim();
    if (pin && configuredPin && pin.trim() === configuredPin) {
      const session: UserSession = {
        role: 'admin',
        name: 'Society Secretary',
        phone: settings.adminPhone || INITIAL_SETTINGS.adminPhone,
        email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
        flatId: settings.adminFlatId || INITIAL_SETTINGS.adminFlatId || 'flat-101',
        isCommitteeMember: true,
        isPhoneVerified: true,
      };
      setAndUnlockSession(session);
      return { success: true };
    }
    return { success: false, error: 'Incorrect credentials.' };
  };

  const loginAsAdminWithPassword = (identifier: string, password: string) => {
    const rawId = identifier?.trim() || '';
    if (!rawId) {
      return {
        success: false,
        error: 'Please enter your registered administrator email or phone number.',
      };
    }
    const cleanId = rawId.toLowerCase();
    const cleanPhone = rawId.replace(/\D/g, '');
    const adminPhoneClean = (settings.adminPhone || INITIAL_SETTINGS.adminPhone || '').replace(/\D/g, '');
    const adminEmailClean = (settings.adminEmail || INITIAL_SETTINGS.adminEmail || '').trim().toLowerCase();
    const expectedPassword = settings.adminPassword || INITIAL_SETTINGS.adminPassword || 'My1Build2@3';
    const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim();

    const isMatch =
      (adminEmailClean && cleanId === adminEmailClean) ||
      (cleanPhone && cleanPhone.length >= 7 && cleanPhone === adminPhoneClean);

    if (!isMatch) {
      return {
        success: false,
        error: 'Unrecognized administrator email or phone number. Please enter the registered admin email.',
      };
    }

    const trimmedPassword = password?.trim() || '';
    const isPasswordCorrect =
      trimmedPassword === expectedPassword || (configuredPin && trimmedPassword === configuredPin);

    if (!isPasswordCorrect) {
      return {
        success: false,
        error: 'Incorrect admin password or PIN. Please try again.',
      };
    }

    const session: UserSession = {
      role: 'admin',
      name: 'Society Secretary',
      phone: settings.adminPhone || INITIAL_SETTINGS.adminPhone,
      email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
      flatId: settings.adminFlatId || INITIAL_SETTINGS.adminFlatId || 'flat-101',
      isCommitteeMember: true,
      isPhoneVerified: true,
    };
    setAndUnlockSession(session);
    return { success: true };
  };

  // State for pending Admin Email OTP
  const [adminPendingOtp, setAdminPendingOtp] = useState<{
    otp: string;
    email: string;
    expiresAt: number;
  } | null>(() => {
    try {
      const stored = sessionStorage.getItem('admin_email_otp_cache');
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const sendAdminEmailOtp = async (emailInput?: string): Promise<{ success: boolean; email?: string; error?: string; devOtp?: string }> => {
    const targetEmail = (emailInput?.trim() || settings.adminEmail || INITIAL_SETTINGS.adminEmail || '').toLowerCase();
    const registeredAdminEmail = (settings.adminEmail || INITIAL_SETTINGS.adminEmail || '').toLowerCase().trim();

    if (!targetEmail) {
      return { success: false, error: 'No admin email configured in settings.' };
    }

    // Verify it matches the registered admin email
    if (emailInput && targetEmail !== registeredAdminEmail) {
      return {
        success: false,
        error: 'Entered email does not match the registered Secretary Admin email address.',
      };
    }

    // Generate random 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const otpData = {
      otp: generatedOtp,
      email: targetEmail,
      expiresAt,
    };

    setAdminPendingOtp(otpData);
    try {
      sessionStorage.setItem('admin_email_otp_cache', JSON.stringify(otpData));
    } catch {}

    // Store in Firestore audit/otp collection if online so it can be verified across sessions
    try {
      const otpDocRef = doc(db, 'buildings', 'admin_email_verification');
      await setDoc(otpDocRef, {
        email: targetEmail,
        otpHash: generatedOtp,
        expiresAt,
        requestedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn('Could not mirror admin OTP to cloud:', e);
    }

    return {
      success: true,
      email: targetEmail,
      devOtp: generatedOtp,
    };
  };

  const verifyAdminEmailOtp = (otp: string): { success: boolean; error?: string } => {
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      return { success: false, error: 'Please enter a valid 6-digit OTP code.' };
    }

    if (!adminPendingOtp) {
      return { success: false, error: 'No pending email OTP request found. Please request a new OTP.' };
    }

    if (Date.now() > adminPendingOtp.expiresAt) {
      setAdminPendingOtp(null);
      try {
        sessionStorage.removeItem('admin_email_otp_cache');
      } catch {}
      return { success: false, error: 'Email OTP code has expired. Please request a fresh OTP.' };
    }

    if (cleanOtp !== adminPendingOtp.otp) {
      return { success: false, error: 'Incorrect 6-digit OTP code. Please check your email and try again.' };
    }

    // Successfully verified! Clear pending OTP & log in as Admin
    setAdminPendingOtp(null);
    try {
      sessionStorage.removeItem('admin_email_otp_cache');
    } catch {}

    const session: UserSession = {
      role: 'admin',
      name: 'Society Secretary',
      phone: settings.adminPhone || INITIAL_SETTINGS.adminPhone,
      email: adminPendingOtp.email || settings.adminEmail || INITIAL_SETTINGS.adminEmail,
      flatId: settings.adminFlatId || INITIAL_SETTINGS.adminFlatId || 'flat-101',
      isCommitteeMember: true,
      isPhoneVerified: true,
    };

    setAndUnlockSession(session);
    return { success: true };
  };

  const logout = () => {
    setCurrentSession(null);
    setIsAppLocked(false);
    setLockReason(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_UNLOCKED);
    } catch {}
  };

  const isCommitteeMember = Boolean(
    currentSession?.isCommitteeMember || currentSession?.role === 'admin'
  );

  const switchToResidentView = (targetFlatId?: string) => {
    const flatIdToUse = targetFlatId || currentSession?.flatId || settings.adminFlatId || flats[0]?.id || 'flat-101';
    const targetFlat = flats.find((f) => f.id === flatIdToUse) || flats[0];
    setAndUnlockSession({
      role: 'resident',
      flatId: targetFlat.id,
      flatNumber: targetFlat.flatNumber,
      phone: targetFlat.phone,
      name: targetFlat.ownerName,
      email: currentSession?.email || settings.adminEmail,
      isCommitteeMember: true, // Keep committee privileges!
    });
  };

  const switchToAdminView = () => {
    setAndUnlockSession({
      role: 'admin',
      name: 'Society Secretary',
      phone: settings.adminPhone || INITIAL_SETTINGS.adminPhone,
      email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
      flatId: currentSession?.flatId || settings.adminFlatId || 'flat-101',
      isCommitteeMember: true,
    });
  };

  const switchRoleQuickly = (role: 'admin' | 'resident', flatId?: string) => {
    if (role === 'admin') {
      switchToAdminView();
    } else {
      switchToResidentView(flatId);
    }
  };

  const addNotification = (
    title: string,
    message: string,
    type: AppNotification['type'],
    targetFlatId?: string
  ) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: new Date().toISOString(),
      type,
      targetFlatId,
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Free browser push notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.error('Push notification error', e);
      }
    }
  };

  const addExpense = (newExpData: Omit<BuildingExpense, 'id' | 'createdAt'>) => {
    const newExpense: BuildingExpense = {
      ...newExpData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    saveToCloud(undefined, undefined, undefined, undefined, updated);
    addNotification(
      'Expense Recorded',
      `Recorded ₹${newExpData.amount} for ${newExpData.title}.`,
      'system'
    );
  };

  const updateExpense = (id: string, updates: Partial<BuildingExpense>) => {
    const updated = expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
    setExpenses(updated);
    saveToCloud(undefined, undefined, undefined, undefined, updated);
  };

  const deleteExpense = (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    saveToCloud(undefined, undefined, undefined, undefined, updated);
    addNotification('Expense Deleted', 'Expense entry removed successfully.', 'system');
  };

  const setMonthlyManualCollection = (monthKey: string, amount: number | undefined) => {
    setMonthlyManualCollections((prev) => {
      const updated = { ...prev };
      if (amount === undefined || isNaN(amount)) {
        delete updated[monthKey];
      } else {
        updated[monthKey] = amount;
      }
      saveToCloud(undefined, undefined, undefined, undefined, undefined, updated);
      return updated;
    });
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const resetAllData = () => {
    setSettings(INITIAL_SETTINGS);
    setFlats(INITIAL_FLATS);
    setCycles(INITIAL_CYCLES);
    setActiveCycleId(INITIAL_CYCLES[0]?.id || '');
    setNotifications(INITIAL_NOTIFICATIONS);
    setExpenses(INITIAL_EXPENSES);
    setMonthlyManualCollections({});
    setAndUnlockSession({
      role: 'admin',
      name: 'Society Secretary',
      phone: INITIAL_SETTINGS.adminPhone,
    });
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  };

  const exportBackupJson = (): string => {
    const backup = {
      app: 'building-submeter-tracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      flats,
      cycles,
      activeCycleId,
      expenses,
      monthlyManualCollections,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importBackupJson = (jsonStr: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || (!data.flats && !data.settings)) {
        return { success: false, message: 'Invalid backup file format: Missing flat/setting data.' };
      }
      if (data.settings) {
        setSettings(data.settings);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      if (Array.isArray(data.flats) && data.flats.length > 0) {
        setFlats(data.flats);
        localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(data.flats));
      }
      if (Array.isArray(data.cycles) && data.cycles.length > 0) {
        const synced = syncCycleBalances(data.cycles);
        setCycles(synced);
        localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(synced));
      }
      if (data.activeCycleId) {
        setActiveCycleId(data.activeCycleId);
      }
      if (Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
      }
      if (data.monthlyManualCollections && typeof data.monthlyManualCollections === 'object') {
        setMonthlyManualCollections(data.monthlyManualCollections);
        localStorage.setItem(STORAGE_KEYS.MANUAL_COLLECTIONS, JSON.stringify(data.monthlyManualCollections));
      }
      // Save to cloud if available
      saveToCloud(
        data.settings || settings,
        data.flats || flats,
        data.cycles || cycles,
        data.activeCycleId || activeCycleId,
        data.expenses || expenses,
        data.monthlyManualCollections || monthlyManualCollections
      );
      return { success: true, message: 'Backup successfully imported! All flats and details updated.' };
    } catch (err) {
      return { success: false, message: 'Failed to read backup file: ' + (err instanceof Error ? err.message : String(err)) };
    }
  };

  return (
    <BuildingContext.Provider
      value={{
        settings,
        flats,
        cycles,
        activeCycle,
        activeCycleId,
        notifications,
        expenses,
        monthlyManualCollections,
        currentSession,
        unreadCount,
        cloudSyncStatus,
        lastCloudSync,
        saveToCloud,
        saveAllFlats,
        setActiveCycleId,
        updateSettings,
        applyChargesToAllFlats,
        updateChargeLabels,
        updateFlat,
        updateFlatCustomRate,
        saveNewCycle,
        createNewCycle,
        updateCycleReadings,
        markPaymentStatus,
        submitResidentPaymentProof,
        addExpense,
        updateExpense,
        deleteExpense,
        setMonthlyManualCollection,
        checkPhoneRegistration,
        setFlatPin,
        resetFlatPin,
        loginResidentWithPin,
        loginAsResident,
        loginDirectlyAsFlat,
        assignPhoneToFlat,
        loginAsAdmin,
        loginAsAdminWithPassword,
        sendAdminEmailOtp,
        verifyAdminEmailOtp,
        logout,
        switchRoleQuickly,
        switchToResidentView,
        switchToAdminView,
        isCommitteeMember,
        isAppLocked,
        lockReason,
        lockApp,
        unlockAppWithPin,
        unlockAppDirectly,
        addNotification,
        markAllNotificationsRead,
        resetAllData,
        exportBackupJson,
        importBackupJson,
      }}
    >
      {children}
    </BuildingContext.Provider>
  );
};

export const useBuilding = () => {
  const context = useContext(BuildingContext);
  if (!context) {
    throw new Error('useBuilding must be used within a BuildingProvider');
  }
  return context;
};
