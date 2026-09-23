import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
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
  SocietyBroadcast,
  CustomFeeColumn,
} from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_FLATS,
  INITIAL_CYCLES,
  INITIAL_NOTIFICATIONS,
  INITIAL_EXPENSES,
  INITIAL_BROADCASTS,
} from '../data/initialData';

interface BuildingContextType {
  settings: BuildingSettings;
  flats: FlatInfo[];
  cycles: BillingCycle[];
  activeCycle: BillingCycle | undefined;
  activeCycleId: string;
  notifications: AppNotification[];
  expenses: BuildingExpense[];
  broadcasts: SocietyBroadcast[];
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
    customManualCollections?: Record<string, number>,
    customBroadcasts?: SocietyBroadcast[]
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
  updateCycleDueDate: (cycleId: string, dueDate: string) => void;
  updateCycleReadings: (
    cycleId: string,
    readings: BillingCycle['readings'],
    mainMeter?: BillingCycle['mainMeter'],
    customColumns?: CustomFeeColumn[],
    dueDate?: string
  ) => void;
  addCustomFeeColumn: (
    column: { name: string; defaultAmount: number },
    applyToAllFlats?: boolean,
    cycleId?: string
  ) => void;
  removeCustomFeeColumn: (columnId: string, cycleId?: string) => void;
  updateCustomFeeColumn: (
    columnId: string,
    updates: { name?: string; defaultAmount?: number },
    cycleId?: string
  ) => void;
  updateFlatCustomCharge: (
    cycleId: string,
    flatId: string,
    columnId: string,
    amount: number
  ) => void;
  addExpense: (expense: Omit<BuildingExpense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, updates: Partial<BuildingExpense>) => void;
  deleteExpense: (id: string) => void;
  addBroadcast: (broadcast: Omit<SocietyBroadcast, 'id' | 'createdAt'>) => void;
  updateBroadcast: (id: string, updates: Partial<SocietyBroadcast>) => void;
  deleteBroadcast: (id: string) => void;
  setMonthlyManualCollection: (monthKey: string, amount: number | undefined) => void;
  resetMonthPaymentData: (cycleId: string) => Promise<boolean>;
  resetAllPaymentsData: () => Promise<boolean>;
  removeMonthCycle: (cycleId: string) => Promise<boolean>;
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
  checkPhoneRegistration: (phone: string) => {
    isRegistered: boolean;
    hasPin: boolean;
    flat?: FlatInfo;
    matchingFlats: FlatInfo[];
    isSecretary?: boolean;
    error?: string;
  };
  setFlatPin: (flatId: string, pin: string) => Promise<boolean>;
  resetFlatPin: (flatId: string) => Promise<boolean>;
  loginResidentWithPin: (
    phone: string,
    pin: string,
    specificFlatId?: string
  ) => { success: boolean; error?: string; flat?: FlatInfo; role?: 'resident' | 'admin' };
  loginAsResident: (phone: string) => { success: boolean; flat?: FlatInfo; error?: string };
  loginDirectlyAsFlat: (flatId: string, phone?: string) => { success: boolean; flat?: FlatInfo };
  assignPhoneToFlat: (flatId: string, phone: string) => void;
  userFlats: FlatInfo[];
  adminFlats: FlatInfo[];
  switchFlatView: (flatId: string) => void;
  addFlat: (flat: Omit<FlatInfo, 'id'>) => Promise<FlatInfo>;
  deleteFlat: (flatId: string) => Promise<void>;
  loginAsAdmin: (pin: string) => { success: boolean; error?: string };
  loginAsAdminWithPassword: (identifier: string, password: string) => { success: boolean; error?: string };
  sendAdminEmailOtp: (emailInput?: string) => Promise<{ success: boolean; email?: string; error?: string; message?: string }>;
  verifyAdminEmailOtp: (otp: string, emailInput?: string) => Promise<{ success: boolean; error?: string }>;
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
      // 1. Calculate current month bill (energy + common + maintenance + custom charges)
      const energy = r.calculatedAmount ?? (r.unitsConsumed * r.ratePerUnit);
      const common = r.commonMeterCharges ?? 160;
      const maint = r.maintenanceCharges ?? 110;
      let customSum = 0;
      if (r.customCharges) {
        Object.values(r.customCharges).forEach((val) => {
          customSum += Number(val) || 0;
        });
      }
      const currentMonthBill = energy + common + maint + customSum;

      // 2. Previous balance carried forward from preceding cycle
      const carriedBalance = cycleIndex === 0 ? (r.previousBalance ?? 0) : (flatCumulativeBalance.get(r.flatId) ?? 0);

      // Handle explicit pendingAmount & advanceAmount if provided, or default from carried balance
      const pendingAmt = r.pendingAmount !== undefined
        ? r.pendingAmount
        : (carriedBalance > 0 ? carriedBalance : 0);
      const advanceAmt = r.advanceAmount !== undefined
        ? r.advanceAmount
        : (carriedBalance < 0 ? Math.abs(carriedBalance) : (r.advancePaid || 0));

      const netAdjustment = pendingAmt - advanceAmt;

      // 3. Net payable amount = currentMonthBill + pendingAmt - advanceAmt
      const netPayable = Math.max(0, currentMonthBill + netAdjustment);

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
      flatCumulativeBalance.set(r.flatId, remaining < 0 ? -advance : remaining);

      totalBilled += netPayable;
      if (paidAmt && paidAmt > 0) {
        totalCollected += paidAmt;
      }

      return {
        ...r,
        totalBillAmount: currentMonthBill,
        pendingAmount: pendingAmt,
        advanceAmount: advanceAmt,
        previousBalance: netAdjustment,
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
  BROADCASTS: 'bijli_broadcasts_v1',
  MANUAL_COLLECTIONS: 'bijli_manual_collections_v1',
  SESSION_UNLOCKED: 'bijli_session_unlocked_v1',
  LAST_ACTIVE: 'bijli_last_active_time_v1',
};

// Auto-lock after 10 minutes of inactivity
const AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000;

export const FIXED_ADMIN_NAME = 'Mohammad Shariq Ansari';
export const FIXED_ADMIN_PHONE = '8077649394';

// Robust phone matching helper for multi-unit lookups
export const isPhoneMatch = (flatPhone: string | undefined, queryPhone: string): boolean => {
  if (!flatPhone || !queryPhone) return false;
  const qClean = queryPhone.replace(/\D/g, '');
  const qTen = qClean.length > 10 ? qClean.slice(-10) : qClean;
  if (!qTen || qTen.length < 7) return false;

  const parts = flatPhone.split(/[,/;\s]+/);
  for (const part of parts) {
    const pClean = part.replace(/\D/g, '');
    const pTen = pClean.length > 10 ? pClean.slice(-10) : pClean;
    if (pTen.length >= 7 && (pTen === qTen || pTen.endsWith(qTen) || qTen.endsWith(pTen))) {
      return true;
    }
  }
  const fAllClean = flatPhone.replace(/\D/g, '');
  if (fAllClean.length >= 7 && (fAllClean.includes(qTen) || qTen.includes(fAllClean))) {
    return true;
  }
  return false;
};

// Normalize flat identifier for deduplication (e.g., '402', 'Flat 402' -> 'flat-402', 'Shops -02' -> 'shop-2')
export const normalizeFlatNumber = (num: string): string => {
  if (!num) return '';
  const clean = num.trim().toLowerCase();
  if (clean.includes('shop')) {
    const digits = clean.replace(/\D/g, '');
    return `shop-${digits ? parseInt(digits, 10) : clean}`;
  }
  const digits = clean.replace(/\D/g, '');
  if (digits) {
    return `flat-${parseInt(digits, 10)}`;
  }
  return clean;
};

export interface DeduplicateResult {
  cleanedFlats: FlatInfo[];
  cleanedCycles: BillingCycle[];
  reassignedMap: Record<string, string>;
}

export const deduplicateFlatsAndCycles = (
  rawFlats: FlatInfo[],
  rawCycles: BillingCycle[]
): DeduplicateResult => {
  const reassignedMap: Record<string, string> = {};

  // Group flats by normalized key
  const groups = new Map<string, FlatInfo[]>();
  for (const f of rawFlats) {
    const key = normalizeFlatNumber(f.flatNumber);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(f);
  }

  const cleanedFlats: FlatInfo[] = [];

  groups.forEach((groupFlats, key) => {
    if (groupFlats.length === 1) {
      cleanedFlats.push(groupFlats[0]);
      return;
    }

    // Multiple flats share the same normalized number (e.g. duplicate 402)
    // Find which flat has the most actual data in rawCycles
    let bestFlat = groupFlats[0];
    let bestScore = -1;

    for (const f of groupFlats) {
      let score = 0;
      if (f.id === `flat-${key.replace('flat-', '')}` || f.id === key) score += 5;
      if (f.pin && f.pin.trim().length >= 4) score += 3;
      if (f.phone && f.phone.includes('8077649394')) score += 3;
      if (f.ownerName && !f.ownerName.toLowerCase().includes('owner') && !f.ownerName.toLowerCase().includes('resident')) score += 3;

      for (const c of rawCycles) {
        const r = c.readings.find((entry) => entry.flatId === f.id || entry.flatNumber === f.flatNumber);
        if (r && r.flatId === f.id) {
          score += 1;
          if ((r.unitsConsumed || 0) > 0) score += 15;
          if ((r.currentReading || 0) > (r.previousReading || 0)) score += 15;
          if ((r.paidAmount || 0) > 0) score += 20;
          if (r.paymentStatus === 'paid' || r.paymentStatus === 'partially_paid') score += 20;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestFlat = f;
      }
    }

    // Merge best fields from other duplicate flats
    let mergedFlat: FlatInfo = { ...bestFlat };
    for (const other of groupFlats) {
      if (other.id !== bestFlat.id) {
        reassignedMap[other.id] = bestFlat.id;
        if (!mergedFlat.pin && other.pin) mergedFlat.pin = other.pin;
        if (!mergedFlat.customRatePerUnit && other.customRatePerUnit) {
          mergedFlat.customRatePerUnit = other.customRatePerUnit;
        }
        if ((!mergedFlat.phone || mergedFlat.phone.length < 10) && other.phone) {
          mergedFlat.phone = other.phone;
        }
        if (
          (!mergedFlat.ownerName || mergedFlat.ownerName.toLowerCase().includes('resident') || mergedFlat.ownerName.toLowerCase().includes('owner')) &&
          other.ownerName
        ) {
          mergedFlat.ownerName = other.ownerName;
        }
      }
    }

    cleanedFlats.push(mergedFlat);
  });

  // Now clean cycles:
  // 1. In every cycle, if reading has flatId in reassignedMap, migrate to canonical flatId
  // 2. If cycle has multiple readings for canonical flatId, pick the best one
  // 3. Ensure every flat in cleanedFlats has a reading entry
  const cleanedCycles = rawCycles.map((c) => {
    const readingMap = new Map<string, FlatReadingEntry>();

    for (const r of c.readings) {
      let canonicalId = reassignedMap[r.flatId] || r.flatId;
      let targetFlat = cleanedFlats.find((f) => f.id === canonicalId);
      if (!targetFlat) {
        const norm = normalizeFlatNumber(r.flatNumber || r.flatId);
        targetFlat = cleanedFlats.find((f) => normalizeFlatNumber(f.flatNumber) === norm || f.id === norm);
      }

      // If no valid flat exists in cleanedFlats, discard phantom/orphan reading
      if (!targetFlat) {
        continue;
      }

      canonicalId = targetFlat.id;
      const flatNum = targetFlat.flatNumber;

      const updatedReading: FlatReadingEntry = {
        ...r,
        flatId: canonicalId,
        flatNumber: flatNum,
      };

      if (!readingMap.has(canonicalId)) {
        readingMap.set(canonicalId, updatedReading);
      } else {
        const existing = readingMap.get(canonicalId)!;
        const existingScore =
          (existing.unitsConsumed || 0) * 2 +
          ((existing.paidAmount || 0) > 0 ? 100 : 0) +
          (existing.paymentStatus === 'paid' ? 50 : 0);
        const newScore =
          (updatedReading.unitsConsumed || 0) * 2 +
          ((updatedReading.paidAmount || 0) > 0 ? 100 : 0) +
          (updatedReading.paymentStatus === 'paid' ? 50 : 0);

        if (newScore > existingScore) {
          readingMap.set(canonicalId, updatedReading);
        }
      }
    }

    // Ensure all flats in cleanedFlats have a reading entry in this cycle
    for (const f of cleanedFlats) {
      if (!readingMap.has(f.id)) {
        const prev = f.baselineReading || 0;
        const rate = f.customRatePerUnit || c.effectiveRatePerUnit || 9;
        const commonChg = c.readings[0]?.commonMeterCharges ?? 160;
        const maintChg = c.readings[0]?.maintenanceCharges ?? 110;
        const total = commonChg + maintChg;
        readingMap.set(f.id, {
          flatId: f.id,
          flatNumber: f.flatNumber,
          previousReading: prev,
          currentReading: prev,
          unitsConsumed: 0,
          ratePerUnit: rate,
          calculatedAmount: 0,
          commonShareAmount: commonChg,
          commonMeterCharges: commonChg,
          commonMeterLabel: 'Water & stairs light',
          maintenanceCharges: maintChg,
          maintenanceLabel: 'Cleaning',
          totalBillAmount: total,
          netPayableAmount: total,
          remainingBalance: total,
          paymentStatus: 'unpaid',
        });
      }
    }

    const validReadings = cleanedFlats
      .map((f) => {
        const r = readingMap.get(f.id);
        if (!r) return undefined;
        // Enforce customRatePerUnit if configured for this flat (e.g. 6 rs/unit)
        if (f.customRatePerUnit !== undefined && f.customRatePerUnit > 0) {
          const rate = f.customRatePerUnit;
          const energy = Math.round(r.unitsConsumed * rate);
          const common = r.commonMeterCharges ?? 160;
          const maint = r.maintenanceCharges ?? 110;
          let customSum = 0;
          if (r.customCharges) {
            Object.values(r.customCharges).forEach((val) => {
              customSum += Number(val) || 0;
            });
          }
          const total = energy + common + maint + customSum;
          const pending = r.pendingAmount ?? 0;
          const advance = r.advanceAmount ?? 0;
          const net = Math.max(0, total + pending - advance);
          const remaining = r.paidAmount !== undefined ? net - r.paidAmount : net;
          return {
            ...r,
            ratePerUnit: rate,
            calculatedAmount: energy,
            totalBillAmount: total,
            netPayableAmount: net,
            remainingBalance: remaining > 0 ? remaining : 0,
            advancePaid: remaining < 0 ? Math.abs(remaining) : 0,
          };
        }
        return r;
      })
      .filter((r): r is FlatReadingEntry => Boolean(r));

    return {
      ...c,
      readings: validReadings,
    };
  });

  return { cleanedFlats, cleanedCycles, reassignedMap };
};

const BuildingContext = createContext<BuildingContextType | undefined>(undefined);

export const BuildingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<BuildingSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const resolvedPhone = (!parsed.adminPhone || parsed.adminPhone === '9876543210')
          ? FIXED_ADMIN_PHONE
          : parsed.adminPhone;
        const resolvedName = parsed.adminName || FIXED_ADMIN_NAME;

        return {
          ...INITIAL_SETTINGS,
          ...parsed,
          adminName: resolvedName,
          adminPhone: resolvedPhone,
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
      let list: FlatInfo[] = saved ? JSON.parse(saved) : INITIAL_FLATS;
      if (!Array.isArray(list) || list.length === 0) list = INITIAL_FLATS;

      list = list.map((f) => {
        if (f.id === 'flat-101' && (!f.phone || f.phone === '9820111101')) {
          return { ...f, phone: '8077649394', ownerName: 'Mohammad Shariq Ansari' };
        }
        if ((f.id === 'flat-402' || normalizeFlatNumber(f.flatNumber) === 'flat-402') && (!f.phone || f.phone === '9820111402')) {
          return { ...f, phone: '8077649394', ownerName: 'Mohammad Shariq Ansari' };
        }
        if (f.id === 'flat-203' && (!f.phone || f.phone === '9820111203')) {
          return { ...f, phone: '9876554327' };
        }
        return f;
      });

      // Ensure Flat 101, Flat 402, Shops -02, and Flat 01 exist
      for (const reqF of INITIAL_FLATS) {
        if (['flat-101', 'flat-402', 'shop-02', 'flat-01'].includes(reqF.id)) {
          if (!list.some((f) => normalizeFlatNumber(f.flatNumber) === normalizeFlatNumber(reqF.flatNumber))) {
            list.push(reqF);
          }
        }
      }

      const { cleanedFlats } = deduplicateFlatsAndCycles(list, INITIAL_CYCLES);
      return cleanedFlats;
    } catch {
      return INITIAL_FLATS;
    }
  });

  const [cycles, setCycles] = useState<BillingCycle[]>(() => {
    try {
      const resetDone = localStorage.getItem('bijli_start_august_only_v6');
      const saved = localStorage.getItem(STORAGE_KEYS.CYCLES);

      const isDeletedMonth = (c: BillingCycle) => {
        const m = (c.month || '').toLowerCase();
        const key = c.monthKey || '';
        const cid = c.id || '';
        const isSep = key === '2026-09' || m.includes('september') || cid.includes('2026-09');
        const isOct = key === '2026-10' || m.includes('october') || cid.includes('2026-10');
        return isSep || isOct;
      };

      if (saved && resetDone) {
        const parsed = JSON.parse(saved) as BillingCycle[];
        const filtered = parsed.filter((c) => !isDeletedMonth(c));
        if (filtered.length > 0) {
          const mapped = filtered.map((c) => ({
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
      } else {
        // User request: "Now I need to start only from August, september and October I need to delete"
        localStorage.setItem('bijli_start_august_only_v6', 'true');
        let baseCycles = INITIAL_CYCLES;
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as BillingCycle[];
            const filtered = parsed.filter((c) => !isDeletedMonth(c));
            if (filtered.length > 0) {
              baseCycles = filtered;
            }
          } catch {}
        }

        const resetCycles = baseCycles.map((c) => ({
          ...c,
          totalCollectedAmount: 0,
          isLocked: false,
          readings: c.readings.map((r) => ({
            ...r,
            paymentStatus: 'unpaid' as const,
            paidAmount: undefined,
            paidDate: undefined,
            paymentMethod: undefined,
            upiReference: undefined,
            advancePaid: 0,
            adminNotes: undefined,
            remainingBalance: r.netPayableAmount ?? r.totalBillAmount,
          })),
        }));

        const synced = syncCycleBalances(resetCycles);
        try {
          localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(synced));
          localStorage.removeItem(STORAGE_KEYS.MANUAL_COLLECTIONS);
        } catch {}
        return synced;
      }
    } catch {
      return syncCycleBalances(INITIAL_CYCLES);
    }
  });

  const [activeCycleId, setActiveCycleId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_CYCLE_ID);
      const isSavedInvalid = saved && (
        saved.includes('2026-09') ||
        saved.includes('2026-10') ||
        saved.toLowerCase().includes('september') ||
        saved.toLowerCase().includes('october')
      );
      if (saved && !isSavedInvalid) {
        return saved;
      }
      return INITIAL_CYCLES[0] ? INITIAL_CYCLES[0].id : 'cycle-2026-08';
    } catch {
      return INITIAL_CYCLES[0] ? INITIAL_CYCLES[0].id : 'cycle-2026-08';
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
      const list = saved ? JSON.parse(saved) : INITIAL_EXPENSES;
      // Filter out September and October expenses as requested
      return (list as BuildingExpense[]).filter((e) => {
        const cid = e.cycleId || '';
        const mkey = e.monthKey || '';
        const d = e.date || '';
        const isSep = cid.includes('2026-09') || mkey === '2026-09' || d.startsWith('2026-09');
        const isOct = cid.includes('2026-10') || mkey === '2026-10' || d.startsWith('2026-10');
        return !isSep && !isOct;
      });
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [broadcasts, setBroadcasts] = useState<SocietyBroadcast[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BROADCASTS);
      return saved ? JSON.parse(saved) : INITIAL_BROADCASTS;
    } catch {
      return INITIAL_BROADCASTS;
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
          if (parsed.role === 'admin') {
            return {
              ...parsed,
              name: FIXED_ADMIN_NAME,
              phone: FIXED_ADMIN_PHONE,
              flatId: 'flat-101',
            };
          }
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
            let cloudFlats: FlatInfo[] = Array.isArray(data.flats) && data.flats.length > 0 ? [...data.flats] : [];
            let cloudCycles: BillingCycle[] = Array.isArray(data.cycles) && data.cycles.length > 0 ? [...data.cycles] : [];

            if (cloudFlats.length > 0) {
              cloudFlats = cloudFlats.map((f: FlatInfo) => {
                if (f.id === 'flat-101' && (!f.phone || f.phone === '9820111101')) {
                  return { ...f, phone: '8077649394', ownerName: 'Mohammad Shariq Ansari' };
                }
                return f;
              });
              for (const reqF of INITIAL_FLATS) {
                if (['flat-101', 'flat-402', 'shop-02', 'flat-01'].includes(reqF.id)) {
                  if (!cloudFlats.some((f: FlatInfo) => normalizeFlatNumber(f.flatNumber) === normalizeFlatNumber(reqF.flatNumber))) {
                    cloudFlats.push(reqF);
                  }
                }
              }
            }

            if (cloudCycles.length > 0) {
              cloudCycles = cloudCycles.filter((c: BillingCycle) => {
                const m = (c.month || '').toLowerCase();
                const key = c.monthKey || '';
                const cid = c.id || '';
                const isSep = key === '2026-09' || m.includes('september') || cid.includes('2026-09');
                const isOct = key === '2026-10' || m.includes('october') || cid.includes('2026-10');
                return !isSep && !isOct;
              });
            }

            if (cloudFlats.length > 0 && cloudCycles.length > 0) {
              const { cleanedFlats, cleanedCycles, reassignedMap } = deduplicateFlatsAndCycles(cloudFlats, cloudCycles);
              setFlats(cleanedFlats);
              setCycles(syncCycleBalances(cleanedCycles));

              if (Object.keys(reassignedMap).length > 0) {
                saveToCloud(undefined, cleanedFlats, cleanedCycles);
                if (currentSession && reassignedMap[currentSession.flatId]) {
                  const targetId = reassignedMap[currentSession.flatId];
                  const matchedFlat = cleanedFlats.find((f) => f.id === targetId);
                  if (matchedFlat) {
                    setAndUnlockSession({
                      ...currentSession,
                      flatId: matchedFlat.id,
                      flatNumber: matchedFlat.flatNumber,
                      name: matchedFlat.ownerName,
                    });
                  }
                }
              }
            } else if (cloudFlats.length > 0) {
              const { cleanedFlats } = deduplicateFlatsAndCycles(cloudFlats, INITIAL_CYCLES);
              setFlats(cleanedFlats);
            } else if (cloudCycles.length > 0) {
              setCycles(syncCycleBalances(cloudCycles));
            }
            if (data.activeCycleId) {
              const aid = data.activeCycleId;
              const isInvalid = aid.includes('2026-09') || aid.includes('2026-10') || aid.toLowerCase().includes('september') || aid.toLowerCase().includes('october');
              setActiveCycleId(isInvalid ? (INITIAL_CYCLES[0]?.id || 'cycle-2026-08') : aid);
            }
            if (Array.isArray(data.expenses)) {
              const filteredExpenses = data.expenses.filter((e: BuildingExpense) => {
                const cid = e.cycleId || '';
                const mkey = e.monthKey || '';
                const d = e.date || '';
                const isSep = cid.includes('2026-09') || mkey === '2026-09' || d.startsWith('2026-09');
                const isOct = cid.includes('2026-10') || mkey === '2026-10' || d.startsWith('2026-10');
                return !isSep && !isOct;
              });
              setExpenses(filteredExpenses);
            }
            if (Array.isArray(data.broadcasts)) {
              setBroadcasts(data.broadcasts);
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
              const localBroadcastsStr = localStorage.getItem(STORAGE_KEYS.BROADCASTS);
              const initialBroadcastsToSave = localBroadcastsStr ? JSON.parse(localBroadcastsStr) : broadcasts;
              setDoc(
                docRef,
                JSON.parse(
                  JSON.stringify({
                    settings: initialSettingsToSave,
                    flats: initialFlatsToSave,
                    cycles,
                    activeCycleId,
                    expenses: initialExpensesToSave,
                    broadcasts: initialBroadcastsToSave,
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
    customManualCollections?: Record<string, number>,
    customBroadcasts?: SocietyBroadcast[]
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
          broadcasts: customBroadcasts || broadcasts,
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

  // One-time startup self-healing reconciliation to eliminate duplicate flats (e.g. duplicate Flat 402)
  useEffect(() => {
    const { cleanedFlats, cleanedCycles, reassignedMap } = deduplicateFlatsAndCycles(flats, cycles);
    const readingMismatch = cycles.some(
      (c, idx) => c.readings.length !== (cleanedCycles[idx]?.readings.length || 0)
    );
    const hasChanges = Object.keys(reassignedMap).length > 0 || cleanedFlats.length !== flats.length || readingMismatch;
    if (hasChanges) {
      setFlats(cleanedFlats);
      setCycles(syncCycleBalances(cleanedCycles));
      try {
        localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(cleanedFlats));
        localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(cleanedCycles));
      } catch {}
      saveToCloud(undefined, cleanedFlats, cleanedCycles);
      if (currentSession && reassignedMap[currentSession.flatId]) {
        const canonicalId = reassignedMap[currentSession.flatId];
        const match = cleanedFlats.find((f) => f.id === canonicalId);
        if (match) {
          setAndUnlockSession({
            ...currentSession,
            flatId: match.id,
            flatNumber: match.flatNumber,
            name: match.ownerName,
          });
        }
      }
    }
  }, []);

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
      localStorage.setItem(STORAGE_KEYS.BROADCASTS, JSON.stringify(broadcasts));
    } catch (e) {
      console.error(e);
    }
  }, [broadcasts]);

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
      return { success: false, error: 'Incorrect Admin PIN or password. Please try again.' };
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
            let customSum = 0;
            if (r.customCharges) {
              Object.values(r.customCharges).forEach((val) => {
                customSum += Number(val) || 0;
              });
            }
            const newTotal = energy + commonCharges + maintCharges + customSum + (r.lateFee || 0);

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
            let customSum = 0;
            if (r.customCharges) {
              Object.values(r.customCharges).forEach((val) => {
                customSum += Number(val) || 0;
              });
            }
            const newTotal = energy + commonCharges + maintCharges + customSum + (r.lateFee || 0);

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

  const addCustomFeeColumn = (
    column: { name: string; defaultAmount: number },
    applyToAllFlats: boolean = true,
    cycleId?: string
  ) => {
    const colName = column.name.trim();
    if (!colName) return;
    const colId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCol: CustomFeeColumn = {
      id: colId,
      name: colName,
      defaultAmount: Number(column.defaultAmount) || 0,
    };

    // Update settings so future cycles retain this column
    setSettings((prev) => {
      const existing = prev.customFeeColumns || [];
      const updatedCols = [...existing, newCol];
      saveToCloud({ ...prev, customFeeColumns: updatedCols });
      return { ...prev, customFeeColumns: updatedCols };
    });

    const targetCycleId = cycleId || activeCycleId;
    let finalUpdatedCycles: BillingCycle[] = [];

    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== targetCycleId) return c;
        const existingColumns = c.customColumns || [];
        const nextCustomColumns = [...existingColumns, newCol];

        const updatedReadings = c.readings.map((r) => {
          const currentCharges = { ...(r.customCharges || {}) };
          if (applyToAllFlats) {
            currentCharges[colId] = newCol.defaultAmount;
          }
          return {
            ...r,
            customCharges: currentCharges,
          };
        });

        return {
          ...c,
          customColumns: nextCustomColumns,
          readings: updatedReadings,
        };
      });

      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    if (finalUpdatedCycles.length > 0) {
      saveToCloud(undefined, undefined, finalUpdatedCycles);
    }

    addNotification(
      'Fee Column Added',
      `Added "${newCol.name}" (₹${newCol.defaultAmount}/flat) to the billing table. Receipts and totals auto-updated!`,
      'system'
    );
  };

  const removeCustomFeeColumn = (columnId: string, cycleId?: string) => {
    setSettings((prev) => {
      const updatedCols = (prev.customFeeColumns || []).filter((col) => col.id !== columnId);
      saveToCloud({ ...prev, customFeeColumns: updatedCols });
      return { ...prev, customFeeColumns: updatedCols };
    });

    const targetCycleId = cycleId || activeCycleId;
    let finalUpdatedCycles: BillingCycle[] = [];

    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== targetCycleId) return c;
        const nextCustomColumns = (c.customColumns || []).filter((col) => col.id !== columnId);

        const updatedReadings = c.readings.map((r) => {
          const currentCharges = { ...(r.customCharges || {}) };
          delete currentCharges[columnId];
          return {
            ...r,
            customCharges: currentCharges,
          };
        });

        return {
          ...c,
          customColumns: nextCustomColumns,
          readings: updatedReadings,
        };
      });

      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    if (finalUpdatedCycles.length > 0) {
      saveToCloud(undefined, undefined, finalUpdatedCycles);
    }

    addNotification(
      'Fee Column Removed',
      `Removed fee column from billing table. Receipts and totals auto-updated!`,
      'system'
    );
  };

  const updateCustomFeeColumn = (
    columnId: string,
    updates: { name?: string; defaultAmount?: number },
    cycleId?: string
  ) => {
    setSettings((prev) => {
      const updatedCols = (prev.customFeeColumns || []).map((col) =>
        col.id === columnId
          ? {
              ...col,
              name: updates.name !== undefined ? updates.name.trim() : col.name,
              defaultAmount: updates.defaultAmount !== undefined ? Number(updates.defaultAmount) : col.defaultAmount,
            }
          : col
      );
      saveToCloud({ ...prev, customFeeColumns: updatedCols });
      return { ...prev, customFeeColumns: updatedCols };
    });

    const targetCycleId = cycleId || activeCycleId;
    let finalUpdatedCycles: BillingCycle[] = [];

    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== targetCycleId) return c;
        const nextCustomColumns = (c.customColumns || []).map((col) =>
          col.id === columnId
            ? {
                ...col,
                name: updates.name !== undefined ? updates.name.trim() : col.name,
                defaultAmount: updates.defaultAmount !== undefined ? Number(updates.defaultAmount) : col.defaultAmount,
              }
            : col
        );
        return {
          ...c,
          customColumns: nextCustomColumns,
        };
      });

      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    if (finalUpdatedCycles.length > 0) {
      saveToCloud(undefined, undefined, finalUpdatedCycles);
    }
  };

  const updateFlatCustomCharge = (
    cycleId: string,
    flatId: string,
    columnId: string,
    amount: number
  ) => {
    let finalUpdatedCycles: BillingCycle[] = [];

    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== cycleId) return c;
        const updatedReadings = c.readings.map((r) => {
          if (r.flatId !== flatId) return r;
          const currentCharges = { ...(r.customCharges || {}) };
          currentCharges[columnId] = Number(amount) || 0;
          return {
            ...r,
            customCharges: currentCharges,
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
    const currentMonthKey = activeCycle?.monthKey || '2026-08';
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

    const defaultMainUnits = params?.mainMeterUnits || activeCycle?.mainMeter.mainMeterUnits || 1900;
    const defaultMainBill = params?.mainMeterBillAmount || activeCycle?.mainMeter.mainMeterBillAmount || 15200;
    const defaultPrevMain = activeCycle?.mainMeter.mainMeterCurrentReading || 48000;
    const defaultCurrMain = defaultPrevMain + defaultMainUnits;

    const cycleCustomColumns: CustomFeeColumn[] = activeCycle?.customColumns || settings.customFeeColumns || [];

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

      const customCharges: Record<string, number> = {};
      let customSum = 0;
      cycleCustomColumns.forEach((col) => {
        const amt = col.defaultAmount ?? 0;
        customCharges[col.id] = amt;
        customSum += amt;
      });

      const total = energy + common + maint + customSum;

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
        customCharges,
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
      customColumns: cycleCustomColumns,
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

  const updateCycleDueDate = (cycleId: string, dueDate: string) => {
    let finalUpdatedCycles: BillingCycle[] = [];
    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== cycleId) return c;
        return {
          ...c,
          dueDate,
        };
      });
      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    if (finalUpdatedCycles.length > 0) {
      saveToCloud(undefined, undefined, finalUpdatedCycles);
    }
  };

  const updateCycleReadings = (
    cycleId: string,
    readings: BillingCycle['readings'],
    mainMeter?: BillingCycle['mainMeter'],
    customColumns?: CustomFeeColumn[],
    dueDate?: string
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
          dueDate: dueDate || c.dueDate,
          mainMeter: mainMeter || c.mainMeter,
          customColumns: customColumns !== undefined ? customColumns : c.customColumns,
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

  const resetMonthPaymentData = async (cycleId: string): Promise<boolean> => {
    let finalUpdatedCycles: BillingCycle[] = [];
    const targetCycle = cycles.find((c) => c.id === cycleId);
    const targetMonthKey = targetCycle?.monthKey;

    setCycles((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== cycleId) return c;
        const updatedReadings = c.readings.map((r) => ({
          ...r,
          paymentStatus: 'unpaid' as const,
          paidAmount: undefined,
          paidDate: undefined,
          paymentMethod: undefined,
          upiReference: undefined,
          advancePaid: 0,
          remainingBalance: r.netPayableAmount ?? r.totalBillAmount,
          adminNotes: undefined,
        }));
        return {
          ...c,
          totalCollectedAmount: 0,
          readings: updatedReadings,
        };
      });
      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    let updatedManualCollections = { ...monthlyManualCollections };
    if (targetMonthKey && updatedManualCollections[targetMonthKey] !== undefined) {
      delete updatedManualCollections[targetMonthKey];
      setMonthlyManualCollections(updatedManualCollections);
      try {
        localStorage.setItem(STORAGE_KEYS.MANUAL_COLLECTIONS, JSON.stringify(updatedManualCollections));
      } catch {}
    }

    try {
      localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(finalUpdatedCycles));
    } catch {}

    return await saveToCloud(
      undefined,
      undefined,
      finalUpdatedCycles,
      undefined,
      undefined,
      updatedManualCollections
    );
  };

  const resetAllPaymentsData = async (): Promise<boolean> => {
    let finalUpdatedCycles: BillingCycle[] = [];
    setCycles((prev) => {
      const updated = prev.map((c) => ({
        ...c,
        totalCollectedAmount: 0,
        readings: c.readings.map((r) => ({
          ...r,
          paymentStatus: 'unpaid' as const,
          paidAmount: undefined,
          paidDate: undefined,
          paymentMethod: undefined,
          upiReference: undefined,
          advancePaid: 0,
          remainingBalance: r.netPayableAmount ?? r.totalBillAmount,
          adminNotes: undefined,
        })),
      }));
      finalUpdatedCycles = syncCycleBalances(updated);
      return finalUpdatedCycles;
    });

    setMonthlyManualCollections({});
    try {
      localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(finalUpdatedCycles));
      localStorage.removeItem(STORAGE_KEYS.MANUAL_COLLECTIONS);
    } catch {}

    return await saveToCloud(
      undefined,
      undefined,
      finalUpdatedCycles,
      undefined,
      undefined,
      {}
    );
  };

  const removeMonthCycle = async (cycleId: string): Promise<boolean> => {
    const remainingCycles = cycles.filter((c) => c.id !== cycleId && c.monthKey !== cycleId);
    const synced = syncCycleBalances(remainingCycles);
    setCycles(synced);
    if (activeCycleId === cycleId) {
      const fallbackId = synced[0]?.id || '';
      setActiveCycleId(fallbackId);
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CYCLE_ID, fallbackId);
      } catch {}
    }
    try {
      localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(synced));
    } catch {}
    return await saveToCloud(undefined, undefined, synced);
  };

  const checkPhoneRegistration = (phone: string) => {
    const rawClean = phone.replace(/\D/g, '');
    const tenDigit = rawClean.length > 10 ? rawClean.slice(-10) : rawClean;

    if (!tenDigit || tenDigit.length < 10) {
      return {
        isRegistered: false,
        hasPin: false,
        matchingFlats: [],
        error: 'Please enter a valid 10-digit mobile number.',
      };
    }

    const adminCleanPhone = (settings.adminPhone || FIXED_ADMIN_PHONE).replace(/\D/g, '');
    const adminTen = adminCleanPhone.length > 10 ? adminCleanPhone.slice(-10) : adminCleanPhone;
    const isSecretary = Boolean(
      tenDigit === FIXED_ADMIN_PHONE ||
      rawClean === FIXED_ADMIN_PHONE ||
      (adminTen && (tenDigit === adminTen || rawClean === adminCleanPhone))
    );

    const rawMatches = flats.filter((f) => isPhoneMatch(f.phone, tenDigit));
    const seenNumbers = new Set<string>();
    const matchingFlats = rawMatches.filter((f) => {
      const key = normalizeFlatNumber(f.flatNumber);
      if (seenNumbers.has(key)) return false;
      seenNumbers.add(key);
      return true;
    });

    if (!isSecretary && matchingFlats.length === 0) {
      return {
        isRegistered: false,
        hasPin: false,
        matchingFlats: [],
        isSecretary: false,
        error: `Mobile number +91 ${tenDigit} is not registered with any flat. Please contact Society Secretary Mohammad Shariq Ansari (+91 8077649394) to register your number.`,
      };
    }

    const hasPin = matchingFlats.some((f) => f.pin && f.pin.trim().length >= 4);

    return {
      isRegistered: true,
      hasPin,
      flat: matchingFlats[0],
      matchingFlats,
      isSecretary,
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

  const loginResidentWithPin = (phone: string, pin: string, specificFlatId?: string) => {
    const rawClean = phone.replace(/\D/g, '');
    const tenDigit = rawClean.length > 10 ? rawClean.slice(-10) : rawClean;
    const trimmedPin = pin?.trim() || '';

    const adminCleanPhone = (settings.adminPhone || FIXED_ADMIN_PHONE).replace(/\D/g, '');
    const adminTen = adminCleanPhone.length > 10 ? adminCleanPhone.slice(-10) : adminCleanPhone;
    const isSecretary = Boolean(
      tenDigit === FIXED_ADMIN_PHONE ||
      rawClean === FIXED_ADMIN_PHONE ||
      (adminTen && (tenDigit === adminTen || rawClean === adminCleanPhone))
    );

    const matchingFlats = flats.filter((f) => isPhoneMatch(f.phone, tenDigit));

    // If Secretary and no specific flat requested, check for admin login
    if (isSecretary && !specificFlatId) {
      const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim() || '1234';
      const configuredPwd = settings.adminPassword || INITIAL_SETTINGS.adminPassword || 'My1Build2@3';
      if (trimmedPin === configuredPin || trimmedPin === configuredPwd) {
        const session: UserSession = {
          role: 'admin',
          name: FIXED_ADMIN_NAME,
          phone: FIXED_ADMIN_PHONE,
          email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
          flatId: settings.adminFlatId || 'flat-101',
          isCommitteeMember: true,
          isPhoneVerified: true,
        };
        setAndUnlockSession(session);
        return { success: true, role: 'admin' as const };
      }
    }

    let targetFlat = specificFlatId ? flats.find((f) => f.id === specificFlatId) : matchingFlats[0];
    if (!targetFlat && matchingFlats.length > 0) {
      targetFlat = matchingFlats[0];
    }

    if (!targetFlat) {
      return {
        success: false,
        error: `Mobile number +91 ${tenDigit} is not registered in this building.`,
      };
    }

    const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim() || '1234';
    const configuredPwd = settings.adminPassword || INITIAL_SETTINGS.adminPassword || 'My1Build2@3';
    const isAdminPasscode = isSecretary && (trimmedPin === configuredPin || trimmedPin === configuredPwd);

    const hasAnyPin = Boolean(targetFlat.pin || matchingFlats.some((f) => f.pin));
    if (!hasAnyPin && !isAdminPasscode) {
      return {
        success: false,
        error: 'Security PIN has not been set yet for this unit. Please set your PIN first.',
        flat: targetFlat,
      };
    }

    const isPinCorrect =
      isAdminPasscode ||
      targetFlat.pin === trimmedPin ||
      matchingFlats.some((f) => f.pin === trimmedPin);

    if (!isPinCorrect) {
      return {
        success: false,
        error: 'Incorrect PIN. Please re-enter or contact society office to reset.',
        flat: targetFlat,
      };
    }

    // Sync PIN if needed
    if (!targetFlat.pin && trimmedPin) {
      setFlatPin(targetFlat.id, trimmedPin);
    }

    const session: UserSession = {
      role: 'resident',
      flatId: targetFlat.id,
      flatNumber: targetFlat.flatNumber,
      phone: tenDigit,
      name: targetFlat.ownerName,
      isCommitteeMember: isSecretary,
      isPhoneVerified: true,
    };
    setAndUnlockSession(session);
    return { success: true, flat: targetFlat, role: 'resident' as const };
  };

  const loginAsResident = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const adminCleanPhone = (settings.adminPhone || FIXED_ADMIN_PHONE).replace(/\D/g, '');

    // Check if phone matches society secretary/admin
    if (
      cleanPhone === FIXED_ADMIN_PHONE ||
      cleanPhone.endsWith(FIXED_ADMIN_PHONE) ||
      (adminCleanPhone &&
        (cleanPhone === adminCleanPhone ||
          cleanPhone.endsWith(adminCleanPhone) ||
          adminCleanPhone.endsWith(cleanPhone)))
    ) {
      const session: UserSession = {
        role: 'admin',
        name: FIXED_ADMIN_NAME,
        phone: FIXED_ADMIN_PHONE,
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

  const loginAsAdmin = (pinOrPassword: string) => {
    // Allow login if explicit configured adminPin or adminPassword matches
    const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim();
    const configuredPwd = settings.adminPassword || INITIAL_SETTINGS.adminPassword || 'My1Build2@3';
    const trimmed = pinOrPassword?.trim();
    if (trimmed && (trimmed === configuredPin || trimmed === configuredPwd)) {
      const session: UserSession = {
        role: 'admin',
        name: FIXED_ADMIN_NAME,
        phone: FIXED_ADMIN_PHONE,
        email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
        flatId: settings.adminFlatId || INITIAL_SETTINGS.adminFlatId || 'flat-101',
        isCommitteeMember: true,
        isPhoneVerified: true,
      };
      setAndUnlockSession(session);
      return { success: true };
    }
    return { success: false, error: 'Incorrect administrator credentials.' };
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
    const adminPhoneClean = (settings.adminPhone || FIXED_ADMIN_PHONE).replace(/\D/g, '');
    const adminEmailClean = (settings.adminEmail || INITIAL_SETTINGS.adminEmail || '').trim().toLowerCase();
    const expectedPassword = settings.adminPassword || INITIAL_SETTINGS.adminPassword || 'My1Build2@3';
    const configuredPin = settings.adminPin?.trim() || INITIAL_SETTINGS.adminPin?.trim();

    const isMatch =
      (adminEmailClean && cleanId === adminEmailClean) ||
      cleanId === 'shariqalig881@gmail.com' ||
      cleanId === 'secretary@society.com' ||
      cleanPhone === FIXED_ADMIN_PHONE ||
      cleanPhone.endsWith(FIXED_ADMIN_PHONE) ||
      (cleanPhone && cleanPhone.length >= 7 && (cleanPhone === adminPhoneClean || adminPhoneClean.endsWith(cleanPhone) || cleanPhone.endsWith(adminPhoneClean)));

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
      name: FIXED_ADMIN_NAME,
      phone: FIXED_ADMIN_PHONE,
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

  const sendAdminEmailOtp = async (emailInput?: string): Promise<{ success: boolean; email?: string; error?: string; message?: string }> => {
    const targetEmail = (emailInput?.trim() || settings.adminEmail || INITIAL_SETTINGS.adminEmail || '').toLowerCase();
    const registeredAdminEmail = (settings.adminEmail || INITIAL_SETTINGS.adminEmail || '').toLowerCase().trim();

    if (!targetEmail) {
      return { success: false, error: 'No admin email configured in settings.' };
    }

    // Verify it matches the registered admin email
    if (emailInput && targetEmail !== registeredAdminEmail && targetEmail !== 'shariqalig881@gmail.com') {
      return {
        success: false,
        error: 'Entered email does not match the registered Secretary Admin email address.',
      };
    }

    // First attempt to call the real backend email dispatch endpoint
    try {
      const response = await fetch('/api/auth/send-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          buildingName: settings.buildingName || INITIAL_SETTINGS.buildingName,
          societyPayeeName: settings.societyPayeeName || INITIAL_SETTINGS.societyPayeeName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Backend sent live email via Resend
        setAdminPendingOtp({
          otp: '', // Kept securely on server
          email: targetEmail,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
        return {
          success: true,
          email: targetEmail,
          message: data.message || `A 6-digit OTP code has been sent directly to ${targetEmail}`,
        };
      }

      if (data.missingApiKey) {
        return {
          success: false,
          error: 'Email delivery service requires a RESEND_API_KEY in the environment. Please configure RESEND_API_KEY in app secrets, or log in using your Admin Password / PIN.',
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to dispatch email verification OTP.',
      };
    } catch (netErr: any) {
      console.warn('Backend email API unreachable:', netErr);
      return {
        success: false,
        error: 'Unable to reach the email dispatch server. Please verify your connection or use your Admin Password / PIN.',
      };
    }
  };

  const verifyAdminEmailOtp = async (otp: string, emailInput?: string): Promise<{ success: boolean; error?: string }> => {
    const cleanOtp = otp.trim().replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      return { success: false, error: 'Please enter a valid 6-digit OTP code.' };
    }

    const targetEmail = (emailInput || adminPendingOtp?.email || settings.adminEmail || INITIAL_SETTINGS.adminEmail || '').trim().toLowerCase();

    // Call backend to verify OTP
    try {
      const response = await fetch('/api/auth/verify-admin-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, otp: cleanOtp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setAdminPendingOtp(null);
        try {
          sessionStorage.removeItem('admin_email_otp_cache');
        } catch {}

        const session: UserSession = {
          role: 'admin',
          name: FIXED_ADMIN_NAME,
          phone: FIXED_ADMIN_PHONE,
          email: targetEmail,
          flatId: settings.adminFlatId || INITIAL_SETTINGS.adminFlatId || 'flat-101',
          isCommitteeMember: true,
          isPhoneVerified: true,
        };

        setAndUnlockSession(session);
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Invalid or expired 6-digit OTP code. Please check your email and try again.',
      };
    } catch (err: any) {
      console.error('Error verifying email OTP:', err);
      return {
        success: false,
        error: 'Verification request failed. Please try again.',
      };
    }
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
    const adminClean = (settings.adminPhone || FIXED_ADMIN_PHONE).replace(/\D/g, '');
    let targetFlat = targetFlatId ? flats.find((f) => f.id === targetFlatId) : undefined;
    if (!targetFlat && targetFlatId) {
      targetFlat = flats.find((f) => normalizeFlatNumber(f.flatNumber) === normalizeFlatNumber(targetFlatId));
    }
    if (!targetFlat) {
      targetFlat =
        adminFlats[0] ||
        flats.find((f) => isPhoneMatch(f.phone, adminClean)) ||
        flats.find((f) => f.id === settings.adminFlatId || normalizeFlatNumber(f.flatNumber) === 'flat-101') ||
        flats.find((f) => isPhoneMatch(f.phone, FIXED_ADMIN_PHONE)) ||
        flats[0];
    }

    const isTargetAdminFlat = isPhoneMatch(targetFlat.phone, adminClean) || targetFlat.id === settings.adminFlatId;

    setAndUnlockSession({
      role: 'resident',
      flatId: targetFlat.id,
      flatNumber: targetFlat.flatNumber,
      phone: isTargetAdminFlat ? (currentSession?.phone || FIXED_ADMIN_PHONE) : (targetFlat.phone || ''),
      name: targetFlat.ownerName,
      email: isTargetAdminFlat ? (currentSession?.email || settings.adminEmail) : undefined,
      isCommitteeMember: true, // Keep committee privileges!
      isPhoneVerified: true,
    });
  };

  const switchToAdminView = () => {
    setAndUnlockSession({
      role: 'admin',
      name: FIXED_ADMIN_NAME,
      phone: FIXED_ADMIN_PHONE,
      email: settings.adminEmail || INITIAL_SETTINGS.adminEmail,
      flatId: settings.adminFlatId || 'flat-101',
      isCommitteeMember: true,
      isPhoneVerified: true,
    });
  };

  const switchRoleQuickly = (role: 'admin' | 'resident', flatId?: string) => {
    if (role === 'admin') {
      switchToAdminView();
    } else {
      switchToResidentView(flatId);
    }
  };

  // Admin's own registered flats (Flat 101, Flat 402, etc. that belong to the Secretary/Admin)
  const adminFlats = useMemo(() => {
    const adminClean = (settings.adminPhone || FIXED_ADMIN_PHONE || '8077649394').replace(/\D/g, '');
    const adminTen = adminClean.length > 10 ? adminClean.slice(-10) : adminClean;

    const matches = flats.filter((f) => {
      if (isPhoneMatch(f.phone, adminTen)) return true;
      if (settings.adminFlatId && (f.id === settings.adminFlatId || normalizeFlatNumber(f.flatNumber) === normalizeFlatNumber(settings.adminFlatId))) {
        return true;
      }
      return false;
    });

    const seenNumbers = new Set<string>();
    return matches.filter((f) => {
      const key = normalizeFlatNumber(f.flatNumber);
      if (seenNumbers.has(key)) return false;
      seenNumbers.add(key);
      return true;
    });
  }, [flats, settings.adminPhone, settings.adminFlatId]);

  // Flats registered to the active session user:
  // - In Admin role: strictly adminFlats (Flat 101 & Flat 402)
  // - In Resident role: strictly the flats linked to the active flat's registered phone (e.g. Shops-02 & Flat 01 for Mr. Bilal)
  const userFlats = useMemo(() => {
    if (!currentSession) return [];

    // 1. If currently in Admin role, strictly return admin's own flats
    if (currentSession.role === 'admin') {
      return adminFlats;
    }

    // 2. If in Resident role, find the specific flat being viewed
    const currentFlat = flats.find(
      (f) => f.id === currentSession.flatId || normalizeFlatNumber(f.flatNumber) === normalizeFlatNumber(currentSession.flatNumber)
    );

    const residentPhones = new Set<string>();

    // Use current flat's registered phone number as the primary identifier
    if (currentFlat?.phone) {
      const parts = currentFlat.phone.split(/[,/;\s]+/);
      for (const p of parts) {
        const clean = p.replace(/\D/g, '');
        const ten = clean.length > 10 ? clean.slice(-10) : clean;
        if (ten && ten.length >= 7) residentPhones.add(ten);
      }
    }

    // If resident is logged in on their own device (not admin previewing via committee member mode)
    if (!currentSession.isCommitteeMember && currentSession.phone) {
      const clean = currentSession.phone.replace(/\D/g, '');
      const ten = clean.length > 10 ? clean.slice(-10) : clean;
      if (ten && ten.length >= 7) residentPhones.add(ten);
    }

    if (residentPhones.size === 0) return currentFlat ? [currentFlat] : [];

    const rawMatches = flats.filter((f) => {
      for (const p of residentPhones) {
        if (isPhoneMatch(f.phone, p)) return true;
      }
      return false;
    });

    const seenNumbers = new Set<string>();
    return rawMatches.filter((f) => {
      const key = normalizeFlatNumber(f.flatNumber);
      if (seenNumbers.has(key)) return false;
      seenNumbers.add(key);
      return true;
    });
  }, [currentSession, flats, adminFlats]);

  const switchFlatView = (targetFlatId: string) => {
    let targetFlat = flats.find((f) => f.id === targetFlatId);
    if (!targetFlat && targetFlatId) {
      targetFlat = flats.find((f) => normalizeFlatNumber(f.flatNumber) === normalizeFlatNumber(targetFlatId));
    }
    if (!targetFlat || !currentSession) return;

    const rawClean = (currentSession.phone || '').replace(/\D/g, '');
    const tenDigit = rawClean.length > 10 ? rawClean.slice(-10) : rawClean;
    const adminCleanPhone = (settings.adminPhone || FIXED_ADMIN_PHONE).replace(/\D/g, '');
    const adminTen = adminCleanPhone.length > 10 ? adminCleanPhone.slice(-10) : adminCleanPhone;
    const isSec = Boolean(
      currentSession.isCommitteeMember ||
      tenDigit === FIXED_ADMIN_PHONE ||
      rawClean === FIXED_ADMIN_PHONE ||
      (adminTen && (tenDigit === adminTen || rawClean === adminCleanPhone))
    );

    const isTargetAdminFlat = isPhoneMatch(targetFlat.phone, adminTen) || targetFlat.id === settings.adminFlatId;

    const updatedSession: UserSession = {
      ...currentSession,
      role: 'resident',
      flatId: targetFlat.id,
      flatNumber: targetFlat.flatNumber,
      name: targetFlat.ownerName,
      phone: isTargetAdminFlat ? (currentSession.phone || FIXED_ADMIN_PHONE) : (targetFlat.phone || ''),
      isCommitteeMember: isSec,
      isPhoneVerified: true,
    };
    setAndUnlockSession(updatedSession);
  };

  const addFlat = async (flatData: Omit<FlatInfo, 'id'>): Promise<FlatInfo> => {
    const existingIndex = flats.findIndex(
      (f) => normalizeFlatNumber(f.flatNumber) === normalizeFlatNumber(flatData.flatNumber)
    );
    if (existingIndex !== -1) {
      const existing = flats[existingIndex];
      const merged: FlatInfo = { ...existing, ...flatData, id: existing.id };
      const updatedFlats = flats.map((f, i) => (i === existingIndex ? merged : f));
      setFlats(updatedFlats);
      try {
        localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(updatedFlats));
      } catch {}
      await saveToCloud(undefined, updatedFlats);
      return merged;
    }

    const newId = `flat-${Date.now()}`;
    const newFlat: FlatInfo = {
      ...flatData,
      id: newId,
    };
    const updatedFlats = [...flats, newFlat];
    setFlats(updatedFlats);
    try {
      localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(updatedFlats));
    } catch {}

    // Ensure all cycles have a reading entry for this new flat
    const updatedCycles = cycles.map((c) => {
      if (c.readings.some((r) => r.flatId === newId)) return c;
      const commonChg = c.commonMeterPerFlat ?? 160;
      const maintChg = c.maintenanceCharges ?? 110;
      const total = commonChg + maintChg;
      const newReading: FlatReadingEntry = {
        flatId: newId,
        flatNumber: flatData.flatNumber,
        previousReading: flatData.baselineReading || 0,
        currentReading: flatData.baselineReading || 0,
        unitsConsumed: 0,
        ratePerUnit: flatData.customRatePerUnit || c.effectiveRatePerUnit || 9,
        calculatedAmount: 0,
        commonShareAmount: commonChg,
        commonMeterCharges: commonChg,
        commonMeterLabel: 'Water & stairs light',
        maintenanceCharges: maintChg,
        maintenanceLabel: 'Cleaning',
        totalBillAmount: total,
        netPayableAmount: total,
        remainingBalance: total,
        paymentStatus: 'unpaid',
      };
      return {
        ...c,
        readings: [...c.readings, newReading],
      };
    });
    setCycles(updatedCycles);
    try {
      localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(updatedCycles));
    } catch {}

    await saveToCloud(undefined, updatedFlats, updatedCycles);
    return newFlat;
  };

  const deleteFlat = async (flatId: string): Promise<void> => {
    const updatedFlats = flats.filter((f) => f.id !== flatId);
    setFlats(updatedFlats);
    try {
      localStorage.setItem(STORAGE_KEYS.FLATS, JSON.stringify(updatedFlats));
    } catch {}

    const updatedCycles = cycles.map((c) => ({
      ...c,
      readings: c.readings.filter((r) => r.flatId !== flatId),
    }));
    setCycles(updatedCycles);
    try {
      localStorage.setItem(STORAGE_KEYS.CYCLES, JSON.stringify(updatedCycles));
    } catch {}

    await saveToCloud(undefined, updatedFlats, updatedCycles);
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

  const addBroadcast = (newBroadcastData: Omit<SocietyBroadcast, 'id' | 'createdAt'>) => {
    const newBroadcast: SocietyBroadcast = {
      ...newBroadcastData,
      id: `broadcast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newBroadcast, ...broadcasts];
    setBroadcasts(updated);
    saveToCloud(undefined, undefined, undefined, undefined, undefined, undefined, updated);
    const catLabel = newBroadcastData.category === 'notice' ? 'Notice' : newBroadcastData.category === 'appeal' ? 'Appeal' : 'Announcement';
    addNotification(
      `New ${catLabel}: ${newBroadcastData.title}`,
      newBroadcastData.content.slice(0, 100) + (newBroadcastData.content.length > 100 ? '...' : ''),
      'system'
    );
  };

  const updateBroadcast = (id: string, updates: Partial<SocietyBroadcast>) => {
    const updated = broadcasts.map((b) =>
      b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
    );
    setBroadcasts(updated);
    saveToCloud(undefined, undefined, undefined, undefined, undefined, undefined, updated);
  };

  const deleteBroadcast = (id: string) => {
    const updated = broadcasts.filter((b) => b.id !== id);
    setBroadcasts(updated);
    saveToCloud(undefined, undefined, undefined, undefined, undefined, undefined, updated);
    addNotification('Broadcast Removed', 'Notice/Appeal/Announcement entry removed.', 'system');
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
      name: FIXED_ADMIN_NAME,
      phone: FIXED_ADMIN_PHONE,
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
      broadcasts,
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
      if (Array.isArray(data.broadcasts)) {
        setBroadcasts(data.broadcasts);
        localStorage.setItem(STORAGE_KEYS.BROADCASTS, JSON.stringify(data.broadcasts));
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
        data.monthlyManualCollections || monthlyManualCollections,
        data.broadcasts || broadcasts
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
        addCustomFeeColumn,
        removeCustomFeeColumn,
        updateCustomFeeColumn,
        updateFlatCustomCharge,
        updateFlat,
        updateFlatCustomRate,
        saveNewCycle,
        createNewCycle,
        updateCycleDueDate,
        updateCycleReadings,
        markPaymentStatus,
        submitResidentPaymentProof,
        addExpense,
        updateExpense,
        deleteExpense,
        broadcasts,
        addBroadcast,
        updateBroadcast,
        deleteBroadcast,
        setMonthlyManualCollection,
        resetMonthPaymentData,
        resetAllPaymentsData,
        removeMonthCycle,
        checkPhoneRegistration,
        setFlatPin,
        resetFlatPin,
        loginResidentWithPin,
        loginAsResident,
        loginDirectlyAsFlat,
        assignPhoneToFlat,
        userFlats,
        adminFlats,
        switchFlatView,
        addFlat,
        deleteFlat,
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
