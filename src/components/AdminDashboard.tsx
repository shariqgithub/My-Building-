import React, { useState, useEffect } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { FlatReadingEntry, BillingCycle, CalculationMode, FlatInfo, CustomFeeColumn } from '../types';
import { computeMonthlyBills, generateWhatsAppBillMessage } from '../utils/billingCalculator';
import { BillInvoiceModal } from './BillInvoiceModal';
import { EditFlatModal } from './EditFlatModal';
import { EditBuildingModal } from './EditBuildingModal';
import { BuildingExpensesTracker } from './BuildingExpensesTracker';
import { AdminBroadcastsManager } from './AdminBroadcastsManager';
import {
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  Users,
  Edit3,
  Save,
  Plus,
  PlusCircle,
  Share2,
  DollarSign,
  TrendingUp,
  FileCheck,
  Check,
  RefreshCw,
  Sliders,
  Send,
  Building,
  Building2,
  MapPin,
  HelpCircle,
  Sparkles,
  QrCode,
  Upload,
  Image as ImageIcon,
  Trash2,
  Calendar,
  CalendarPlus,
  CreditCard,
  ArrowRight,
  Smartphone,
  Download,
  ExternalLink,
  Copy,
  Layers,
  ShieldCheck,
  Shield,
  Eye,
  Cloud,
  Database,
  PiggyBank,
  RotateCcw,
  AlertTriangle,
  Megaphone,
  X,
  LayoutGrid,
  List,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    settings,
    flats,
    cycles,
    activeCycle,
    activeCycleId,
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
    updateCycleDueDate,
    updateCycleReadings,
    markPaymentStatus,
    resetMonthPaymentData,
    resetAllPaymentsData,
    removeMonthCycle,
    createNewCycle,
    addNotification,
    resetAllData,
    resetFlatPin,
    cloudSyncStatus,
    saveToCloud,
    switchToResidentView,
    exportBackupJson,
    importBackupJson,
  } = useBuilding();

  const [activeTab, setActiveTab] = useState<'readings' | 'payments' | 'expenses' | 'settings' | 'flats' | 'broadcasts'>('readings');
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<'month' | 'all' | null>(null);
  const [isResettingPayments, setIsResettingPayments] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Editable Payment Due Date state (Admin specified)
  const [cycleDueDate, setCycleDueDate] = useState<string>(activeCycle?.dueDate || '');
  const [showNewCycleModal, setShowNewCycleModal] = useState<boolean>(false);
  const [newCycleMonthName, setNewCycleMonthName] = useState<string>('');
  const [newCycleDueDate, setNewCycleDueDate] = useState<string>('');

  // Reading Entry States
  const [selectedMonth, setSelectedMonth] = useState(activeCycle?.month || 'September 2026');
  const [mainBillAmount, setMainBillAmount] = useState<number>(activeCycle?.mainMeter.mainMeterBillAmount || 16000);
  const [mainUnits, setMainUnits] = useState<number>(activeCycle?.mainMeter.mainMeterUnits || 2000);
  const [mainPrevReading, setMainPrevReading] = useState<number>(activeCycle?.mainMeter.mainMeterPreviousReading || 48000);
  const [mainCurrReading, setMainCurrReading] = useState<number>(activeCycle?.mainMeter.mainMeterCurrentReading || 50000);

  // Dynamic Editable Field Names (e.g. "Water & stairs light" -> "Common meter")
  const [commonMeterLabel, setCommonMeterLabel] = useState<string>(() => {
    return (
      activeCycle?.readings[0]?.commonMeterLabel ||
      settings.defaultCommonMeterLabel ||
      'Water & stairs light'
    );
  });

  const [maintenanceLabel, setMaintenanceLabel] = useState<string>(() => {
    return (
      activeCycle?.readings[0]?.maintenanceLabel ||
      settings.defaultMaintenanceLabel ||
      'Cleaning'
    );
  });

  // Local draft of readings & manual charges for entry tab
  const [draftReadings, setDraftReadings] = useState<
    Record<
      string,
      {
        current: number;
        previous: number;
        commonMeterCharges: number;
        commonMeterLabel: string;
        maintenanceCharges: number;
        maintenanceLabel: string;
        customCharges: Record<string, number>;
        pendingAmount: number;
        advanceAmount: number;
      }
    >
  >(() => {
    const map: Record<
      string,
      {
        current: number;
        previous: number;
        commonMeterCharges: number;
        commonMeterLabel: string;
        maintenanceCharges: number;
        maintenanceLabel: string;
        customCharges: Record<string, number>;
        pendingAmount: number;
        advanceAmount: number;
      }
    > = {};
    const cols = activeCycle?.customColumns || settings.customFeeColumns || [];

    if (activeCycle) {
      activeCycle.readings.forEach((r) => {
        const charges = { ...(r.customCharges || {}) };
        cols.forEach((col) => {
          if (charges[col.id] === undefined && charges[col.name] === undefined) {
            charges[col.id] = col.defaultAmount;
          }
        });
        const isShopR = (r.flatNumber || '').toLowerCase().includes('shop') || (r.flatId || '').toLowerCase().includes('shop');
        map[r.flatId] = {
          current: r.currentReading,
          previous: r.previousReading,
          commonMeterCharges: r.commonMeterCharges !== undefined ? r.commonMeterCharges : (isShopR ? 0 : (settings.defaultCommonMeterCharges ?? 160)),
          commonMeterLabel: r.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light',
          maintenanceCharges: r.maintenanceCharges !== undefined ? r.maintenanceCharges : (isShopR ? 0 : (settings.defaultMaintenanceCharges ?? 110)),
          maintenanceLabel: r.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning',
          customCharges: charges,
          pendingAmount: r.pendingAmount ?? (r.previousBalance && r.previousBalance > 0 ? r.previousBalance : 0),
          advanceAmount: r.advanceAmount ?? (r.previousBalance && r.previousBalance < 0 ? Math.abs(r.previousBalance) : 0),
        };
      });
    } else {
      flats.forEach((f) => {
        const charges: Record<string, number> = {};
        cols.forEach((col) => {
          charges[col.id] = col.defaultAmount;
        });
        const isShopF = (f.flatNumber || '').toLowerCase().includes('shop') || f.id.toLowerCase().includes('shop');
        map[f.id] = {
          current: f.baselineReading + 100,
          previous: f.baselineReading,
          commonMeterCharges: isShopF ? 0 : (settings.defaultCommonMeterCharges ?? 160),
          commonMeterLabel: settings.defaultCommonMeterLabel || 'Water & stairs light',
          maintenanceCharges: isShopF ? 0 : (settings.defaultMaintenanceCharges ?? 110),
          maintenanceLabel: settings.defaultMaintenanceLabel || 'Cleaning',
          customCharges: charges,
          pendingAmount: 0,
          advanceAmount: 0,
        };
      });
    }
    return map;
  });

  // Dynamic column management state
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnAmount, setNewColumnAmount] = useState<number>(100);
  const [applyColumnToAll, setApplyColumnToAll] = useState(true);
  const [columnErrorMsg, setColumnErrorMsg] = useState('');
  const [columnSuccessToast, setColumnSuccessToast] = useState('');

  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'unpaid' | 'pending' | 'partially_paid'>('all');
  const [paymentViewMode, setPaymentViewMode] = useState<'table' | 'cards'>('table');
  const [readingViewMode, setReadingViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'cards';
    }
    return 'table';
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<{ reading: FlatReadingEntry; cycle: BillingCycle } | null>(null);

  // Flat edit state (flat number, flat owner name, phone number, etc.)
  const [editingFlat, setEditingFlat] = useState<FlatInfo | null>(null);
  const [showEditBuildingModal, setShowEditBuildingModal] = useState(false);

  // Payment marking modal / inline state
  const [markingFlatId, setMarkingFlatId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [paymentUtr, setPaymentUtr] = useState('');
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [qrUploadError, setQrUploadError] = useState<string>('');

  const openPaymentModal = (reading: FlatReadingEntry) => {
    setMarkingFlatId(reading.flatId);
    const defaultAmt = reading.paidAmount !== undefined
      ? reading.paidAmount
      : (reading.netPayableAmount ?? reading.totalBillAmount);
    setPaymentAmountInput(defaultAmt.toString());
    setPaymentMethod((reading.paymentMethod as any) || 'UPI');
    setPaymentUtr(reading.upiReference || '');
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setQrUploadError('Please select a valid image file (PNG, JPG, JPEG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setQrUploadError('Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateSettings({ upiQrCodeUrl: result });
      setSaveSuccessMsg('UPI QR code uploaded successfully! All flat owners can now scan and pay.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    };
    reader.onerror = () => {
      setQrUploadError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFlatDetails = (flatId: string, updates: Partial<FlatInfo>) => {
    updateFlat(flatId, updates);
    setSaveSuccessMsg(`Flat ${updates.flatNumber || ''} details saved & synced to Cloud Database!`);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  if (!activeCycle) {
    return <div className="p-8 text-center text-slate-500">No active billing cycle loaded.</div>;
  }

  // Keep readings and labels in sync when active cycle changes
  useEffect(() => {
    if (!activeCycle) return;

    // Sync draft readings for the selected billing cycle
    const map: Record<
      string,
      {
        current: number;
        previous: number;
        commonMeterCharges: number;
        commonMeterLabel: string;
        maintenanceCharges: number;
        maintenanceLabel: string;
        customCharges: Record<string, number>;
        pendingAmount: number;
        advanceAmount: number;
      }
    > = {};

    const cycleCols = activeCycle.customColumns || settings.customFeeColumns || [];

    activeCycle.readings.forEach((r) => {
      const charges = { ...(r.customCharges || {}) };
      cycleCols.forEach((col) => {
        if (charges[col.id] === undefined && charges[col.name] === undefined) {
          charges[col.id] = col.defaultAmount;
        }
      });

      const isShopR = (r.flatNumber || '').toLowerCase().includes('shop') || (r.flatId || '').toLowerCase().includes('shop');
      map[r.flatId] = {
        current: r.currentReading,
        previous: r.previousReading,
        commonMeterCharges: r.commonMeterCharges !== undefined ? r.commonMeterCharges : (isShopR ? 0 : (settings.defaultCommonMeterCharges ?? 160)),
        commonMeterLabel: r.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light',
        maintenanceCharges: r.maintenanceCharges !== undefined ? r.maintenanceCharges : (isShopR ? 0 : (settings.defaultMaintenanceCharges ?? 110)),
        maintenanceLabel: r.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning',
        customCharges: charges,
        pendingAmount: r.pendingAmount ?? (r.previousBalance && r.previousBalance > 0 ? r.previousBalance : 0),
        advanceAmount: r.advanceAmount ?? (r.previousBalance && r.previousBalance < 0 ? Math.abs(r.previousBalance) : 0),
      };
    });
    setDraftReadings(map);

    // Sync main meter readings for the selected cycle
    setSelectedMonth(activeCycle.month);
    setMainBillAmount(activeCycle.mainMeter.mainMeterBillAmount || 16000);
    setMainUnits(activeCycle.mainMeter.mainMeterUnits || 2000);
    setMainPrevReading(activeCycle.mainMeter.mainMeterPreviousReading || 48000);
    setMainCurrReading(activeCycle.mainMeter.mainMeterCurrentReading || 50000);

    const cycleLabel1 = activeCycle.readings[0]?.commonMeterLabel;
    const cycleLabel2 = activeCycle.readings[0]?.maintenanceLabel;
    if (cycleLabel1) setCommonMeterLabel(cycleLabel1);
    else if (settings.defaultCommonMeterLabel) setCommonMeterLabel(settings.defaultCommonMeterLabel);

    if (cycleLabel2) setMaintenanceLabel(cycleLabel2);
    else if (settings.defaultMaintenanceLabel) setMaintenanceLabel(settings.defaultMaintenanceLabel);

    setCycleDueDate(activeCycle.dueDate || '');
  }, [activeCycleId, activeCycle?.dueDate, settings.defaultCommonMeterLabel, settings.defaultMaintenanceLabel]);

  // Handle direct payment due date change by admin
  const handleDueDateChange = (newDate: string) => {
    setCycleDueDate(newDate);
    if (activeCycle && newDate) {
      updateCycleDueDate(activeCycle.id, newDate);
      setSaveSuccessMsg(`Payment due date updated to ${newDate}!`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  };

  // Auto-calculate main meter units when previous reading or current reading is entered
  const handleMainPrevReadingChange = (valStr: string) => {
    if (valStr === '') {
      setMainPrevReading(0);
      return;
    }
    const val = Number(valStr);
    setMainPrevReading(val);
    if (!isNaN(val) && !isNaN(mainCurrReading) && mainCurrReading > 0) {
      setMainUnits(Math.max(0, mainCurrReading - val));
    }
  };

  const handleMainCurrReadingChange = (valStr: string) => {
    if (valStr === '') {
      setMainCurrReading(0);
      return;
    }
    const val = Number(valStr);
    setMainCurrReading(val);
    if (!isNaN(val) && !isNaN(mainPrevReading)) {
      setMainUnits(Math.max(0, val - mainPrevReading));
    }
  };

  // Update label for common meter (e.g. "Water & stairs light" -> "Common meter")
  const handleUpdateCommonLabel = (newLabel: string) => {
    setCommonMeterLabel(newLabel);
    setDraftReadings((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((fid) => {
        if (updated[fid]) {
          updated[fid] = { ...updated[fid], commonMeterLabel: newLabel };
        }
      });
      return updated;
    });
    updateChargeLabels({ commonMeterLabel: newLabel });
  };

  // Update label for maintenance (e.g. "Cleaning" -> "Maintenance")
  const handleUpdateMaintenanceLabel = (newLabel: string) => {
    setMaintenanceLabel(newLabel);
    setDraftReadings((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((fid) => {
        if (updated[fid]) {
          updated[fid] = { ...updated[fid], maintenanceLabel: newLabel };
        }
      });
      return updated;
    });
    updateChargeLabels({ maintenanceLabel: newLabel });
  };

  // State for Auto-Applying Maintenance & Common Meter charges
  const [autoApplyCharges, setAutoApplyCharges] = useState<boolean>(true);
  const [chargesSuccessMsg, setChargesSuccessMsg] = useState<string>('');

  const handleApplyChargesToAll = (
    commonAmt?: number,
    maintAmt?: number,
    commonLbl?: string,
    maintLbl?: string
  ) => {
    const finalCommonAmt =
      commonAmt !== undefined ? commonAmt : (settings.defaultCommonMeterCharges ?? 160);
    const finalMaintAmt =
      maintAmt !== undefined ? maintAmt : (settings.defaultMaintenanceCharges ?? 110);
    const finalCommonLbl = commonLbl || commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light';
    const finalMaintLbl = maintLbl || maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning';

    // 1. Update draft readings for all flats in AdminDashboard
    setDraftReadings((prev) => {
      const updated = { ...prev };
      flats.forEach((f) => {
        updated[f.id] = {
          ...(updated[f.id] || {
            current: f.baselineReading + 100,
            previous: f.baselineReading,
          }),
          commonMeterCharges: finalCommonAmt,
          maintenanceCharges: finalMaintAmt,
          commonMeterLabel: finalCommonLbl,
          maintenanceLabel: finalMaintLbl,
        };
      });
      return updated;
    });

    // 2. Call applyChargesToAllFlats in BuildingContext to update active billing cycles and all flat bills
    applyChargesToAllFlats(
      {
        commonMeterCharges: finalCommonAmt,
        commonMeterLabel: finalCommonLbl,
        maintenanceCharges: finalMaintAmt,
        maintenanceLabel: finalMaintLbl,
      },
      true
    );

    setChargesSuccessMsg(
      `Auto-applied ₹${finalCommonAmt} (${finalCommonLbl}) & ₹${finalMaintAmt} (${finalMaintLbl}) to all 15 flat bills! (Total fixed: ₹${finalCommonAmt + finalMaintAmt}/flat)`
    );
    setTimeout(() => setChargesSuccessMsg(''), 5000);
  };

  // Dynamic custom columns in active cycle or settings
  const activeCustomColumns: CustomFeeColumn[] =
    activeCycle?.customColumns || settings.customFeeColumns || [];

  // Calculate live preview of consumption & amounts
  const previewCalculation = computeMonthlyBills({
    flats,
    mainMeter: {
      mainMeterPreviousReading: mainPrevReading,
      mainMeterCurrentReading: mainCurrReading,
      mainMeterUnits: mainUnits,
      mainMeterBillAmount: mainBillAmount,
      commonAreaRule: 'divide_by_flat_units',
    },
    calculationMode: settings.calculationMode,
    defaultRatePerUnit: settings.defaultRatePerUnit,
    customColumns: activeCustomColumns,
    readings: flats.map((f) => {
      const isShop = (f.flatNumber || '').toLowerCase().includes('shop') || (f.id || '').toLowerCase().includes('shop');
      return {
        flatId: f.id,
        previousReading: draftReadings[f.id]?.previous ?? f.baselineReading,
        currentReading: draftReadings[f.id]?.current ?? f.baselineReading + 100,
        maintenanceCharges: draftReadings[f.id]?.maintenanceCharges !== undefined
          ? draftReadings[f.id]?.maintenanceCharges
          : (isShop ? 0 : (settings.defaultMaintenanceCharges ?? 110)),
        maintenanceLabel: draftReadings[f.id]?.maintenanceLabel || maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning',
        commonMeterCharges: draftReadings[f.id]?.commonMeterCharges !== undefined
          ? draftReadings[f.id]?.commonMeterCharges
          : (isShop ? 0 : (settings.defaultCommonMeterCharges ?? 160)),
        commonMeterLabel: draftReadings[f.id]?.commonMeterLabel || commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light',
        customCharges: draftReadings[f.id]?.customCharges || {},
        pendingAmount: draftReadings[f.id]?.pendingAmount ?? 0,
        advanceAmount: draftReadings[f.id]?.advanceAmount ?? 0,
      };
    }),
  });

  // Handle saving readings into the active cycle or new cycle
  const handleSaveReadings = () => {
    const updatedEntries: FlatReadingEntry[] = previewCalculation.flatReadings.map((pr) => {
      const existing = activeCycle.readings.find((r) => r.flatId === pr.flatId);
      const isShop = (pr.flatNumber || '').toLowerCase().includes('shop') || (pr.flatId || '').toLowerCase().includes('shop');
      const commonAmt = draftReadings[pr.flatId]?.commonMeterCharges !== undefined
        ? draftReadings[pr.flatId]?.commonMeterCharges
        : (pr.commonMeterCharges !== undefined ? pr.commonMeterCharges : (isShop ? 0 : (settings.defaultCommonMeterCharges ?? 160)));
      const maintAmt = draftReadings[pr.flatId]?.maintenanceCharges !== undefined
        ? draftReadings[pr.flatId]?.maintenanceCharges
        : (pr.maintenanceCharges !== undefined ? pr.maintenanceCharges : (isShop ? 0 : (settings.defaultMaintenanceCharges ?? 110)));
      const pendingAmt = draftReadings[pr.flatId]?.pendingAmount ?? pr.pendingAmount ?? 0;
      const advanceAmt = draftReadings[pr.flatId]?.advanceAmount ?? pr.advanceAmount ?? 0;
      const netPayable = Math.max(0, pr.totalBillAmount + pendingAmt - advanceAmt);
      return {
        ...pr,
        commonMeterCharges: commonAmt,
        maintenanceCharges: maintAmt,
        commonMeterLabel: draftReadings[pr.flatId]?.commonMeterLabel || commonMeterLabel,
        maintenanceLabel: draftReadings[pr.flatId]?.maintenanceLabel || maintenanceLabel,
        customCharges: draftReadings[pr.flatId]?.customCharges || pr.customCharges || {},
        pendingAmount: pendingAmt,
        advanceAmount: advanceAmt,
        previousBalance: pendingAmt - advanceAmt,
        netPayableAmount: netPayable,
        paymentStatus: existing ? existing.paymentStatus : 'unpaid',
        paidAmount: existing?.paidAmount,
        paidDate: existing?.paidDate,
        paymentMethod: existing?.paymentMethod,
        upiReference: existing?.upiReference,
        adminNotes: existing?.adminNotes,
      };
    });

    updateCycleReadings(
      activeCycle.id,
      updatedEntries,
      {
        mainMeterPreviousReading: mainPrevReading,
        mainMeterCurrentReading: mainCurrReading,
        mainMeterUnits: mainUnits,
        mainMeterBillAmount: mainBillAmount,
        commonAreaRule: 'divide_by_flat_units',
      },
      activeCustomColumns,
      cycleDueDate
    );

    setSaveSuccessMsg('Readings, maintenance, custom fees & due date saved!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Custom column management actions
  const handleOpenAddColumnModal = () => {
    setNewColumnName('');
    setNewColumnAmount(100);
    setApplyColumnToAll(true);
    setColumnErrorMsg('');
    setIsAddColumnModalOpen(true);
  };

  const handleCreateColumn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newColumnName.trim();
    if (!trimmed) {
      setColumnErrorMsg('Please enter a column or fee name (e.g. Building Charge, Lift Maintenance)');
      return;
    }

    const amt = Number(newColumnAmount) || 0;
    const newCol = addCustomFeeColumn(
      { name: trimmed, defaultAmount: amt },
      applyColumnToAll,
      activeCycle.id
    );

    // Update draftReadings locally so the table inputs display the new values right away
    if (applyColumnToAll) {
      setDraftReadings((prev) => {
        const updated = { ...prev };
        flats.forEach((f) => {
          const currentFlatCharges = { ...(updated[f.id]?.customCharges || {}) };
          currentFlatCharges[newCol.id] = amt;
          updated[f.id] = {
            ...(updated[f.id] || {
              current: f.baselineReading + 100,
              previous: f.baselineReading,
              commonMeterCharges: 160,
              commonMeterLabel: 'Water & stairs light',
              maintenanceCharges: 110,
              maintenanceLabel: 'Cleaning',
            }),
            customCharges: currentFlatCharges,
          };
        });
        return updated;
      });
    }

    setColumnSuccessToast(`New column "${trimmed}" (₹${amt}) added! All receipts and bills auto-updated.`);
    setTimeout(() => setColumnSuccessToast(''), 4500);
    setIsAddColumnModalOpen(false);
  };

  const handleCustomChargeInputChange = (flatId: string, columnId: string, val: number) => {
    setDraftReadings((prev) => {
      const updated = { ...prev };
      const flatEntry = updated[flatId] || {
        current: 100,
        previous: 0,
        commonMeterCharges: 160,
        commonMeterLabel: 'Common meter',
        maintenanceCharges: 110,
        maintenanceLabel: 'Cleaning',
        customCharges: {},
      };
      const flatCustomCharges = { ...(flatEntry.customCharges || {}) };
      flatCustomCharges[columnId] = val;

      updated[flatId] = {
        ...flatEntry,
        customCharges: flatCustomCharges,
      };
      return updated;
    });

    updateFlatCustomCharge(activeCycle.id, flatId, columnId, val);
  };

  const handleRemoveColumn = (columnId: string, columnName: string) => {
    if (!window.confirm(`Remove column "${columnName}" from table and receipts?`)) {
      return;
    }
    removeCustomFeeColumn(columnId, activeCycle.id);
    setDraftReadings((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((fid) => {
        if (updated[fid]?.customCharges) {
          const charges = { ...updated[fid].customCharges };
          delete charges[columnId];
          updated[fid] = { ...updated[fid], customCharges: charges };
        }
      });
      return updated;
    });
    setColumnSuccessToast(`Column "${columnName}" removed.`);
    setTimeout(() => setColumnSuccessToast(''), 3000);
  };

  const handleRenameColumn = (columnId: string, newName: string) => {
    updateCustomFeeColumn(columnId, { name: newName }, activeCycle.id);
  };

  // Quick WhatsApp bill sender with user's exact required format
  const sendWhatsAppBill = (reading: FlatReadingEntry) => {
    const flat = flats.find((f) => f.id === reading.flatId);
    const text = generateWhatsAppBillMessage({
      month: activeCycle.month,
      dueDate: activeCycle.dueDate || cycleDueDate,
      flatNumber: reading.flatNumber,
      ownerName: flat?.ownerName || `Flat ${reading.flatNumber} Resident`,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      unitsConsumed: reading.unitsConsumed,
      calculatedAmount: reading.calculatedAmount,
      commonMeterCharges: reading.commonMeterCharges ?? draftReadings[reading.flatId]?.commonMeterCharges ?? 160,
      commonMeterLabel: reading.commonMeterLabel || draftReadings[reading.flatId]?.commonMeterLabel || commonMeterLabel || 'Common meter',
      maintenanceCharges: reading.maintenanceCharges ?? draftReadings[reading.flatId]?.maintenanceCharges ?? 110,
      maintenanceLabel: reading.maintenanceLabel || draftReadings[reading.flatId]?.maintenanceLabel || maintenanceLabel || 'Cleaning',
      customColumns: activeCustomColumns,
      customCharges: reading.customCharges || draftReadings[reading.flatId]?.customCharges || {},
      totalBillAmount: reading.totalBillAmount,
      pendingAmount: reading.pendingAmount ?? draftReadings[reading.flatId]?.pendingAmount,
      advanceAmount: reading.advanceAmount ?? draftReadings[reading.flatId]?.advanceAmount,
      previousBalance: reading.previousBalance,
      netPayableAmount: reading.netPayableAmount,
    });
    const phone = flat?.phone.replace(/\D/g, '') || '';
    const url = phone.length === 10
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Open modal to configure new billing month & its payment due date
  const handleOpenStartNextMonth = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const parts = (activeCycle.month || '').split(' ');
    let nextMonth = 'Next Month';
    let nextYear = new Date().getFullYear();
    if (parts.length >= 2) {
      const currentMonthIndex = months.findIndex((m) => m.toLowerCase() === parts[0].toLowerCase());
      const currentYear = parseInt(parts[1], 10) || nextYear;
      if (currentMonthIndex !== -1) {
        const nextIndex = (currentMonthIndex + 1) % 12;
        nextYear = nextIndex === 0 ? currentYear + 1 : currentYear;
        nextMonth = `${months[nextIndex]} ${nextYear}`;
      }
    }
    setNewCycleMonthName(nextMonth);
    // Suggest 10 days from today or 20th of that month
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setNewCycleDueDate(d.toISOString().split('T')[0]);
    setShowNewCycleModal(true);
  };

  const handleConfirmCreateCycle = () => {
    if (!newCycleMonthName.trim()) return;
    const nextCycle = createNewCycle({
      month: newCycleMonthName.trim(),
      dueDate: newCycleDueDate.trim() || undefined,
    });
    setShowNewCycleModal(false);
    setSaveSuccessMsg(`Started ${nextCycle.month} bill with Payment Due Date: ${nextCycle.dueDate}!`);
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const filteredReadings = activeCycle.readings.filter((r) => {
    if (filterPayment === 'all') return true;
    return r.paymentStatus === filterPayment;
  });

  const paidCount = activeCycle.readings.filter((r) => r.paymentStatus === 'paid').length;
  const unpaidCount = activeCycle.readings.filter((r) => r.paymentStatus === 'unpaid').length;
  const pendingCount = activeCycle.readings.filter((r) => r.paymentStatus === 'pending').length;
  const partiallyPaidCount = activeCycle.readings.filter((r) => r.paymentStatus === 'partially_paid').length;

  return (
    <div className="space-y-4 pb-12">
      {/* Building Header Banner with Quick Edit */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                {settings.buildingName}
              </h2>
              <button
                type="button"
                onClick={() => setShowEditBuildingModal(true)}
                className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors border border-white/10"
                title="Edit Building Name & Details"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>Edit Name</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>{settings.address || 'Building Address'}</span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="font-mono text-slate-300">Meter: {settings.commonMeterNumber}</span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span>{settings.electricityBoard || 'Electricity Supply Board'}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowEditBuildingModal(true)}
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit Building Details
        </button>
      </div>

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">Total Billed ({activeCycle.month})</span>
          <span className="text-xl font-extrabold text-slate-900 block mt-0.5">
            ₹{activeCycle.totalBilledAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">Main bill: ₹{activeCycle.mainMeter.mainMeterBillAmount}</span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-emerald-600 font-medium block">Total Collected</span>
          <span className="text-xl font-extrabold text-emerald-600 block mt-0.5">
            ₹{activeCycle.totalCollectedAmount.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400">
            {paidCount} of 15 Flats Paid ({partiallyPaidCount} partial)
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-amber-600 font-medium block">Units Consumed</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {activeCycle.totalSubMeterUnits}
            </span>
            <span className="text-xs text-slate-500">/ {activeCycle.mainMeter.mainMeterUnits} main</span>
          </div>
          <span className="text-[10px] text-amber-600 font-medium">
            Diff: {Math.max(0, activeCycle.mainMeter.mainMeterUnits - activeCycle.totalSubMeterUnits)} u (Common)
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] text-indigo-600 font-medium block">Active Rate Rule</span>
          <span className="text-sm font-bold text-slate-900 block mt-0.5 truncate">
            {settings.calculationMode === 'proportional_main_bill'
              ? 'Dynamic Split'
              : settings.calculationMode === 'flat_specific'
              ? 'Flat-Specific Rates'
              : `Fixed ₹${settings.defaultRatePerUnit}/u`}
          </span>
          <span className="text-[10px] text-slate-400">
            Flats 1-3: ₹6/u | Others: ₹9/u
          </span>
        </div>
      </div>

      {/* Billing Cycle Bar with "+ Next Month Bill" button */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700">Billing Statement:</span>
          <select
            value={activeCycleId}
            onChange={(e) => setActiveCycleId(e.target.value)}
            className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.month} ({c.readings.filter((r) => r.paymentStatus === 'paid').length}/15 Paid)
              </option>
            ))}
          </select>
          {cycles.length > 1 && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete the "${activeCycle.month}" billing cycle? This will remove this month permanently.`)) {
                  await removeMonthCycle(activeCycle.id);
                  setSaveSuccessMsg(`Deleted ${activeCycle.month} billing statement.`);
                  setTimeout(() => setSaveSuccessMsg(''), 4000);
                }
              }}
              className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg border border-red-200 transition-colors cursor-pointer"
              title={`Delete ${activeCycle.month} billing cycle`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Month</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 bg-amber-50/90 border border-amber-300 rounded-xl px-2.5 py-1 shadow-2xs hover:border-amber-400 transition-colors" title="Change payment due date for this month">
            <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <label htmlFor="admin-topbar-due-date-input" className="text-[11px] font-bold text-amber-950 whitespace-nowrap cursor-pointer">
              Due Date:
            </label>
            <input
              type="date"
              id="admin-topbar-due-date-input"
              value={cycleDueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-white border border-amber-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
              title="Click to enter or select custom payment due date"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenStartNextMonth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Create next billing month and enter payment due date"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>+ Start Next Month Bill</span>
            <span className="text-[10px] font-normal opacity-90 hidden sm:inline">
              (Set Due Date)
            </span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto text-xs sm:text-sm font-semibold">
        <button
          onClick={() => setActiveTab('readings')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'readings'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-500" />
          Meter Readings Entry
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'payments'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          Payments Tracker ({unpaidCount} Unpaid)
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'expenses'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
          Building Expenses & Savings
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'settings'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          Calculation & Custom Rates
        </button>
        <button
          onClick={() => setActiveTab('flats')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'flats'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-slate-600" />
          15 Flats Directory
        </button>
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'broadcasts'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5 text-indigo-600" />
          Notice, Appeal & Announcement
        </button>
      </div>

      {/* TAB 1: METER READINGS ENTRY */}
      {activeTab === 'readings' && (
        <div className="space-y-4">
          {/* Main Meter Input Box (Requirement 2) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Main Electricity Board Meter Entry
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Meter #{settings.commonMeterNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Main Prev Reading
                </label>
                <input
                  type="number"
                  value={mainPrevReading === 0 ? '' : mainPrevReading}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleMainPrevReadingChange(e.target.value)}
                  placeholder="48000"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500/30"
                />
                <span className="text-[10px] text-slate-400">Previous meter reading</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Main Curr Reading
                </label>
                <input
                  type="number"
                  value={mainCurrReading === 0 ? '' : mainCurrReading}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleMainCurrReadingChange(e.target.value)}
                  placeholder="50000"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl font-mono text-slate-800 focus:ring-2 focus:ring-amber-500/30 font-bold"
                />
                <span className="text-[10px] text-slate-400">Current meter reading</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Main Meter Units
                  </label>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase tracking-wider">
                    Auto-Calculated
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={mainUnits === 0 ? '' : mainUnits}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setMainUnits(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder="2000"
                    className="w-full px-3 py-2 text-sm bg-emerald-50/50 border border-emerald-300 rounded-xl font-bold font-mono text-emerald-950 focus:ring-2 focus:ring-emerald-500/30"
                  />
                  {mainCurrReading > mainPrevReading && (
                    <button
                      type="button"
                      onClick={() => setMainUnits(Math.max(0, mainCurrReading - mainPrevReading))}
                      className="absolute right-2 top-2 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      title="Reset to exact difference: Current - Previous"
                    >
                      {mainCurrReading} - {mainPrevReading}
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {mainCurrReading >= mainPrevReading ? (
                    <span className="text-emerald-700 font-medium">
                      = {mainCurrReading} - {mainPrevReading} = {Math.max(0, mainCurrReading - mainPrevReading)} units
                    </span>
                  ) : (
                    'Calculated automatically as Curr - Prev'
                  )}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Main Bill Amount (₹)
                </label>
                <input
                  type="number"
                  value={mainBillAmount === 0 ? '' : mainBillAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setMainBillAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="16000"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl font-bold font-mono focus:ring-2 focus:ring-amber-500/30 text-slate-900"
                />
                <span className="text-[10px] text-slate-400">Total bill received from board</span>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-amber-100/60 border border-amber-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-amber-950 font-medium">
                ⚡ All Flats Total Units: <strong>{previewCalculation.totalSubMeterUnits} Units</strong> | Main Meter: <strong>{mainUnits} Units</strong>
              </span>
              <span className="text-amber-900 font-bold">
                Calculated Rate: ₹{previewCalculation.effectiveRatePerUnit.toFixed(2)}/unit
              </span>
            </div>
          </div>

          {/* Sub-Meters Table for 15 Flats (Requirement 3) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Sub-Meter Readings for 15 Flats
                  </h3>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    15 Flats Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Current readings are entered here. Previous readings are carried forward automatically and are directly editable.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {saveSuccessMsg && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" /> {saveSuccessMsg}
                  </span>
                )}

                {/* View Switcher: Mobile Cards View vs Spreadsheet Table View */}
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl border border-slate-300 shadow-2xs">
                  <button
                    type="button"
                    id="reading-view-mode-cards-btn"
                    onClick={() => setReadingViewMode('cards')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                      readingViewMode === 'cards'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                    title="Cards View (Best for Mobile & Android devices - full visibility of all flat fields)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards View 📱</span>
                  </button>
                  <button
                    type="button"
                    id="reading-view-mode-table-btn"
                    onClick={() => setReadingViewMode('table')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                      readingViewMode === 'table'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                    title="Spreadsheet Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Table View 📋</span>
                  </button>
                </div>

                {/* Due Date setting */}
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-1 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <label htmlFor="admin-readings-due-date-input" className="text-[11px] font-bold text-amber-950 whitespace-nowrap cursor-pointer">
                    Due:
                  </label>
                  <input
                    type="date"
                    id="admin-readings-due-date-input"
                    value={cycleDueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="text-xs font-bold text-slate-900 bg-white border border-amber-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                    title="Click to enter or change payment due date"
                  />
                  <div className="hidden sm:flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        handleDueDateChange(d.toISOString().split('T')[0]);
                      }}
                      className="px-1.5 py-0.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold transition-colors"
                      title="Set due date 7 days from today"
                    >
                      +7d
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 10);
                        handleDueDateChange(d.toISOString().split('T')[0]);
                      }}
                      className="px-1.5 py-0.5 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold transition-colors"
                      title="Set due date 10 days from today"
                    >
                      +10d
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  id="add-column-top-btn"
                  onClick={handleOpenAddColumnModal}
                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Add a new fee column (e.g. Building Charge, Lift Maintenance)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Col</span>
                </button>

                <button
                  onClick={handleSaveReadings}
                  className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save & Publish
                </button>
              </div>
            </div>

            {/* Custom Editable Charge Names Bar (e.g. Water & stairs light -> Common meter) */}
            <div className="p-3 bg-gradient-to-r from-sky-50/80 via-slate-50 to-amber-50/80 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Edit3 className="w-4 h-4 text-sky-600" />
                  <span>Customize Additional Charge Names (Editable on the fly):</span>
                </div>
                <span className="text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                  ✏️ Type below or in column headers to rename (e.g. <strong>"Water & stairs light"</strong> ➔ <strong>"Common meter"</strong>)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Charge 1 */}
                <div className="bg-white p-2.5 rounded-xl border border-sky-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-sky-950 flex items-center gap-1">
                      Charge 1 Name (Editable):
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCommonLabel('Common meter')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                          commonMeterLabel === 'Common meter'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 hover:bg-sky-100 text-sky-800 border border-sky-200'
                        }`}
                      >
                        Common meter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateCommonLabel('Water & stairs light')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                          commonMeterLabel === 'Water & stairs light'
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 hover:bg-sky-100 text-sky-800 border border-sky-200'
                        }`}
                      >
                        Water & stairs
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={commonMeterLabel}
                    onChange={(e) => handleUpdateCommonLabel(e.target.value)}
                    placeholder="e.g. Common meter, Water & stairs light"
                    className="w-full px-2.5 py-1 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 focus:border-sky-500 rounded-lg focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>

                {/* Charge 2 */}
                <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                      Charge 2 Name (Editable):
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateMaintenanceLabel('Cleaning')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                          maintenanceLabel === 'Cleaning'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        Cleaning
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateMaintenanceLabel('Maintenance')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                          maintenanceLabel === 'Maintenance'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        Maintenance
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={maintenanceLabel}
                    onChange={(e) => handleUpdateMaintenanceLabel(e.target.value)}
                    placeholder="e.g. Cleaning or Maintenance"
                    className="w-full px-2.5 py-1 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 rounded-lg focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Added Dynamic Fee Columns (e.g. Building Charge) */}
              {activeCustomColumns.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1.5">
                    Added Dynamic Fee Columns:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {activeCustomColumns.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-950 px-2.5 py-1 rounded-xl shadow-2xs text-xs font-semibold"
                      >
                        <span>{col.name}</span>
                        <span className="text-indigo-600 font-mono font-bold">(₹{col.defaultAmount})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(col.id, col.name)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors ml-1 cursor-pointer"
                          title={`Remove ${col.name} column`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleOpenAddColumnModal}
                      className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-dashed border-indigo-300 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Another Column
                    </button>
                  </div>
                </div>
              )}
            </div>

            {readingViewMode === 'cards' ? (
              /* CARDS VIEW: Mobile-Optimized 100% Full-Width Flat Cards */
              <div className="p-3 sm:p-4 bg-slate-100/70">
                <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>Cards View Active:</strong> All 15 flats and fields are 100% visible on mobile without horizontal scrolling.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReadingViewMode('table')}
                    className="font-bold underline text-amber-950 shrink-0 ml-2 cursor-pointer"
                  >
                    Switch to Table
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {flats.map((flat) => {
                    const prev = draftReadings[flat.id]?.previous ?? flat.baselineReading;
                    const curr = draftReadings[flat.id]?.current ?? prev + 100;
                    const units = Math.max(0, curr - prev);
                    const isInvalid = curr < prev;

                    const rate = flat.customRatePerUnit !== undefined && flat.customRatePerUnit > 0
                      ? flat.customRatePerUnit
                      : previewCalculation.effectiveRatePerUnit;
                    const energyAmt = Math.round(units * rate);
                    const isShopFlat = (flat.flatNumber || '').toLowerCase().includes('shop') || (flat.id || '').toLowerCase().includes('shop');
                    const commonAmt = draftReadings[flat.id]?.commonMeterCharges !== undefined
                      ? draftReadings[flat.id]?.commonMeterCharges
                      : (isShopFlat ? 0 : (settings.defaultCommonMeterCharges ?? 160));
                    const maintAmt = draftReadings[flat.id]?.maintenanceCharges !== undefined
                      ? draftReadings[flat.id]?.maintenanceCharges
                      : (isShopFlat ? 0 : (settings.defaultMaintenanceCharges ?? 110));

                    let customChargesSum = 0;
                    activeCustomColumns.forEach((col) => {
                      const flatCharges = draftReadings[flat.id]?.customCharges;
                      const val = flatCharges?.[col.id] ?? flatCharges?.[col.name] ?? col.defaultAmount ?? 0;
                      customChargesSum += Number(val) || 0;
                    });

                    const totalAmt = energyAmt + commonAmt + maintAmt + customChargesSum;
                    const pendingAmt = draftReadings[flat.id]?.pendingAmount ?? 0;
                    const advanceAmt = draftReadings[flat.id]?.advanceAmount ?? 0;
                    const netBill = Math.max(0, totalAmt + pendingAmt - advanceAmt);

                    return (
                      <div
                        key={flat.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 flex flex-col justify-between space-y-3 hover:border-amber-300 transition-colors"
                      >
                        {/* Top: Flat & Resident Details */}
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold shadow-2xs">
                              Flat {flat.flatNumber}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-slate-900 leading-tight">
                                {flat.ownerName}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                +91 {flat.phone}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingFlat(flat)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-amber-800 bg-slate-100 hover:bg-amber-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                              title={`Edit Flat ${flat.flatNumber} details`}
                            >
                              <Edit3 className="w-3 h-3 text-amber-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const entry = previewCalculation.flatReadings.find((r) => r.flatId === flat.id);
                                if (entry) sendWhatsAppBill(entry);
                              }}
                              className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Send Bill via WhatsApp"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Meter Reading Inputs */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Prev Reading ✏️
                              </label>
                              <input
                                type="number"
                                value={prev === 0 ? '' : prev}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      previous: val,
                                      current: curr,
                                    },
                                  }));
                                }}
                                className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border bg-white border-slate-200 text-slate-800 focus:ring-2 focus:ring-amber-500/30 text-right"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Curr Reading
                              </label>
                              <input
                                type="number"
                                value={curr === 0 ? '' : curr}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      previous: prev,
                                      current: val,
                                    },
                                  }));
                                }}
                                className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border text-right ${
                                  isInvalid
                                    ? 'bg-rose-50 border-rose-400 text-rose-700'
                                    : 'bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-amber-500/30'
                                }`}
                              />
                            </div>
                          </div>
                          {isInvalid && (
                            <div className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              ⚠️ Current reading must be ≥ {prev}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-xs">
                            <span className="text-slate-600">
                              Units: <strong className="font-mono text-amber-700 font-bold">{units} u</strong> (@ ₹{rate.toFixed(1)}/u)
                            </span>
                            <span className="font-bold text-slate-800">
                              Energy: <span className="font-mono font-extrabold text-slate-900">₹{energyAmt.toLocaleString('en-IN')}</span>
                            </span>
                          </div>
                        </div>

                        {/* Charges Breakdown */}
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-sky-50/60 p-2 rounded-xl border border-sky-200/70">
                              <label className="block text-[10px] font-bold text-sky-950 truncate mb-1">
                                {commonMeterLabel}
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-xs text-sky-600 font-bold">₹</span>
                                <input
                                  type="number"
                                  value={commonAmt === 0 ? '' : commonAmt}
                                  onFocus={(e) => e.target.select()}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    setDraftReadings((prevMap) => ({
                                      ...prevMap,
                                      [flat.id]: {
                                        ...prevMap[flat.id],
                                        commonMeterCharges: val,
                                      },
                                    }));
                                  }}
                                  className="w-full pl-5 pr-2 py-1 text-xs font-mono font-bold rounded-lg border border-sky-300 bg-white text-slate-800 text-right focus:ring-2 focus:ring-sky-500/30"
                                />
                              </div>
                            </div>
                            <div className="bg-amber-50/60 p-2 rounded-xl border border-amber-200/70">
                              <label className="block text-[10px] font-bold text-amber-950 truncate mb-1">
                                {maintenanceLabel}
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-xs text-amber-600 font-bold">₹</span>
                                <input
                                  type="number"
                                  value={maintAmt === 0 ? '' : maintAmt}
                                  onFocus={(e) => e.target.select()}
                                  placeholder="0"
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    setDraftReadings((prevMap) => ({
                                      ...prevMap,
                                      [flat.id]: {
                                        ...prevMap[flat.id],
                                        maintenanceCharges: val,
                                      },
                                    }));
                                  }}
                                  className="w-full pl-5 pr-2 py-1 text-xs font-mono font-bold rounded-lg border border-amber-300 bg-white text-slate-800 text-right focus:ring-2 focus:ring-amber-500/30"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Custom Charges */}
                          {activeCustomColumns.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {activeCustomColumns.map((col) => {
                                const flatCharges = draftReadings[flat.id]?.customCharges;
                                const val = flatCharges?.[col.id] ?? flatCharges?.[col.name] ?? col.defaultAmount ?? 0;
                                return (
                                  <div key={col.id} className="bg-indigo-50/60 p-2 rounded-xl border border-indigo-200/70">
                                    <label className="block text-[10px] font-bold text-indigo-950 truncate mb-1">
                                      {col.name}
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1.5 text-xs text-indigo-600 font-bold">₹</span>
                                      <input
                                        type="number"
                                        value={val === 0 ? '' : val}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="0"
                                        onChange={(e) =>
                                          handleCustomChargeInputChange(
                                            flat.id,
                                            col.id,
                                            e.target.value === '' ? 0 : Number(e.target.value)
                                          )
                                        }
                                        className="w-full pl-5 pr-2 py-1 text-xs font-mono font-bold rounded-lg border border-indigo-300 bg-white text-indigo-950 text-right focus:ring-2 focus:ring-indigo-500/30"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Balance Adjustments: Pending (+ Dues) & Advance (- Credit) */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-rose-950 uppercase">Pending</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-800">+ Dues</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-rose-600 font-bold">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={pendingAmt === 0 ? '' : pendingAmt}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      pendingAmount: val,
                                    },
                                  }));
                                }}
                                className="w-full pl-5 pr-2 py-1 text-xs font-mono font-bold rounded-lg border border-rose-300 bg-white text-rose-900 text-right focus:ring-2 focus:ring-rose-500/30 shadow-2xs"
                                placeholder="0"
                              />
                            </div>
                          </div>

                          <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-emerald-950 uppercase">Advance</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-800">- Credit</span>
                            </div>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-emerald-600 font-bold">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={advanceAmt === 0 ? '' : advanceAmt}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      advanceAmount: val,
                                    },
                                  }));
                                }}
                                className="w-full pl-5 pr-2 py-1 text-xs font-mono font-bold rounded-lg border border-emerald-300 bg-white text-emerald-900 text-right focus:ring-2 focus:ring-emerald-500/30 shadow-2xs"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Card Net Payable Summary */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 bg-amber-50/80 p-2.5 rounded-xl">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 block">
                              Net Payable Amount:
                            </span>
                            {(pendingAmt > 0 || advanceAmt > 0) && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                Base ₹{totalAmt} {pendingAmt > 0 ? `+ ₹${pendingAmt}` : ''} {advanceAmt > 0 ? `- ₹${advanceAmt}` : ''}
                              </span>
                            )}
                          </div>
                          <span className="text-base font-mono font-extrabold text-amber-950">
                            ₹{netBill.toLocaleString('en-IN')}/-
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* TABLE VIEW: Spreadsheet View with Horizontal Touch Scrolling & Sticky Flat Header */
              <div>
                <div className="sm:hidden px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                    <span>👉 Swipe horizontally for all 14 columns</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setReadingViewMode('cards')}
                    className="font-bold underline text-amber-950 cursor-pointer"
                  >
                    Switch to Cards View 📱
                  </button>
                </div>

                <div className="overflow-x-auto touch-pan-x -mx-1 sm:mx-0 scrollbar-thin">
                  <table className="min-w-[1150px] w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 sticky left-0 bg-slate-100 z-20 min-w-28 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                          Flat No.
                        </th>
                        <th className="p-2.5 min-w-36">Owner / Sub-Meter</th>
                        <th className="p-2.5 w-28">
                          <span className="flex items-center gap-1" title="Editable previous reading">
                            Prev Reading ✏️
                          </span>
                        </th>
                        <th className="p-2.5 w-28">Curr Reading</th>
                        <th className="p-2.5 text-center">Net Units</th>
                        <th className="p-2.5 text-right">Energy Amt</th>
                        <th className="p-2.5 text-center min-w-36">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-sky-300 hover:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/30">
                              <input
                                type="text"
                                value={commonMeterLabel}
                                onChange={(e) => handleUpdateCommonLabel(e.target.value)}
                                className="w-28 text-center text-xs font-bold text-sky-900 bg-transparent focus:outline-hidden"
                                title="Click or type to edit this field label (e.g. Common meter)"
                              />
                              <Edit3 className="w-3 h-3 text-sky-500 shrink-0 pointer-events-none" />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5">(₹) Amount</span>
                          </div>
                        </th>
                        <th className="p-2.5 text-center min-w-32">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-amber-300 hover:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/30">
                              <input
                                type="text"
                                value={maintenanceLabel}
                                onChange={(e) => handleUpdateMaintenanceLabel(e.target.value)}
                                className="w-24 text-center text-xs font-bold text-amber-900 bg-transparent focus:outline-hidden"
                                title="Click or type to edit this field label (e.g. Cleaning or Maintenance)"
                              />
                              <Edit3 className="w-3 h-3 text-amber-500 shrink-0 pointer-events-none" />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-0.5">(₹) Amount</span>
                          </div>
                        </th>

                        {/* Dynamic Custom Fee Columns */}
                        {activeCustomColumns.map((col) => (
                          <th key={col.id} className="p-2.5 text-center min-w-32 bg-indigo-50/50 border-l border-indigo-100">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-indigo-300 hover:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30">
                                <input
                                  type="text"
                                  value={col.name}
                                  onChange={(e) => handleRenameColumn(col.id, e.target.value)}
                                  className="w-24 text-center text-xs font-bold text-indigo-950 bg-transparent focus:outline-hidden"
                                  title="Click or type to edit this column name"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColumn(col.id, col.name)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                                  title={`Remove ${col.name} column`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-[10px] text-indigo-600 mt-0.5 font-medium">(₹) Amount</span>
                            </div>
                          </th>
                        ))}

                        {/* Header button to quickly add column */}
                        <th className="p-2.5 text-center w-28 bg-slate-50 border-l border-slate-200">
                          <button
                            type="button"
                            id="add-column-table-header-btn"
                            onClick={handleOpenAddColumnModal}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-800 bg-white hover:bg-indigo-50 border border-dashed border-indigo-300 hover:border-indigo-400 rounded-lg transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                            title="Add an extra fee column like Building Charge"
                          >
                            <Plus className="w-3 h-3 text-indigo-600" />
                            <span>Add Col</span>
                          </button>
                        </th>

                        {/* Column 1: Pending Amount (Previous Month Dues) */}
                        <th className="p-2.5 text-center min-w-28 bg-rose-50/70 border-l border-rose-200">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-rose-950">Pending</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-200 text-rose-800 leading-none">+ Add</span>
                            </div>
                            <span className="text-[10px] text-rose-600 mt-0.5 font-medium">Prev Dues (₹)</span>
                          </div>
                        </th>

                        {/* Column 2: Advance Amount (Credit Deduction) */}
                        <th className="p-2.5 text-center min-w-28 bg-emerald-50/70 border-l border-emerald-200">
                          <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-emerald-950">Advance</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-200 text-emerald-800 leading-none">- Deduct</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 mt-0.5 font-medium">Credit (₹)</span>
                          </div>
                        </th>

                        <th className="p-2.5 text-right whitespace-nowrap min-w-28">Net Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {flats.map((flat) => {
                        const prev = draftReadings[flat.id]?.previous ?? flat.baselineReading;
                        const curr = draftReadings[flat.id]?.current ?? prev + 100;
                        const units = Math.max(0, curr - prev);
                        const isInvalid = curr < prev;

                        // Calculate flat's rate
                        const rate = flat.customRatePerUnit !== undefined && flat.customRatePerUnit > 0
                          ? flat.customRatePerUnit
                          : previewCalculation.effectiveRatePerUnit;
                        const energyAmt = Math.round(units * rate);
                        const isShopFlat = (flat.flatNumber || '').toLowerCase().includes('shop') || (flat.id || '').toLowerCase().includes('shop');
                        const commonAmt = draftReadings[flat.id]?.commonMeterCharges !== undefined
                          ? draftReadings[flat.id]?.commonMeterCharges
                          : (isShopFlat ? 0 : (settings.defaultCommonMeterCharges ?? 160));
                        const maintAmt = draftReadings[flat.id]?.maintenanceCharges !== undefined
                          ? draftReadings[flat.id]?.maintenanceCharges
                          : (isShopFlat ? 0 : (settings.defaultMaintenanceCharges ?? 110));

                        // Sum all custom charges for this flat
                        let customChargesSum = 0;
                        activeCustomColumns.forEach((col) => {
                          const flatCharges = draftReadings[flat.id]?.customCharges;
                          const val = flatCharges?.[col.id] ?? flatCharges?.[col.name] ?? col.defaultAmount ?? 0;
                          customChargesSum += Number(val) || 0;
                        });

                        const totalAmt = energyAmt + commonAmt + maintAmt + customChargesSum;
                        const pendingAmt = draftReadings[flat.id]?.pendingAmount ?? 0;
                        const advanceAmt = draftReadings[flat.id]?.advanceAmount ?? 0;
                        const netBill = Math.max(0, totalAmt + pendingAmt - advanceAmt);

                        return (
                          <tr key={flat.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-2.5 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center gap-1">
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-900">
                                  Flat {flat.flatNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingFlat(flat)}
                                  className="p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 transition-colors"
                                  title={`Edit Flat ${flat.flatNumber}, resident name, or mobile number`}
                                >
                                  <Edit3 className="w-3 h-3 text-amber-600" />
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <div>
                                  <div className="font-semibold text-slate-800">{flat.ownerName}</div>
                                  <div className="text-[10px] font-mono text-slate-500">
                                    +91 {flat.phone}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditingFlat(flat)}
                                  className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 rounded font-semibold transition-colors shrink-0"
                                  title={`Edit Flat ${flat.flatNumber} details`}
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                value={prev === 0 ? '' : prev}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      previous: val,
                                      current: curr,
                                    },
                                  }));
                                }}
                                className="w-24 px-2 py-1 text-xs font-mono font-semibold rounded-lg border bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/30"
                                title={`Edit previous meter reading for Flat ${flat.flatNumber}`}
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="number"
                                value={curr === 0 ? '' : curr}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      previous: prev,
                                      current: val,
                                    },
                                  }));
                                }}
                                className={`w-24 px-2 py-1 text-xs font-mono font-bold rounded-lg border ${
                                  isInvalid
                                    ? 'bg-rose-50 border-rose-400 text-rose-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30'
                                }`}
                              />
                              {isInvalid && (
                                <span className="text-[9px] text-rose-600 block mt-0.5 font-semibold">
                                  Must be ≥ {prev}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-700">
                              {units} u
                              <span className="text-[10px] font-normal text-slate-400 block">@ ₹{rate.toFixed(1)}/u</span>
                            </td>
                            <td className="p-2.5 text-right font-semibold text-slate-800">
                              ₹{energyAmt.toLocaleString('en-IN')}
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={commonAmt === 0 ? '' : commonAmt}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      commonMeterCharges: val,
                                    },
                                  }));
                                }}
                                className="w-20 px-2 py-1 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 text-center"
                                placeholder="0"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                value={maintAmt === 0 ? '' : maintAmt}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      maintenanceCharges: val,
                                    },
                                  }));
                                }}
                                className="w-20 px-2 py-1 text-xs font-mono font-semibold rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500/30 text-center"
                                placeholder="0"
                              />
                            </td>

                            {/* Dynamic Custom Fee Columns Inputs */}
                            {activeCustomColumns.map((col) => {
                              const flatCharges = draftReadings[flat.id]?.customCharges;
                              const val = flatCharges?.[col.id] ?? flatCharges?.[col.name] ?? col.defaultAmount ?? 0;
                              return (
                                <td key={col.id} className="p-2.5 text-center bg-indigo-50/20 border-l border-indigo-100/60">
                                  <input
                                    type="number"
                                    value={val === 0 ? '' : val}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) =>
                                      handleCustomChargeInputChange(
                                        flat.id,
                                        col.id,
                                        e.target.value === '' ? 0 : Number(e.target.value)
                                      )
                                    }
                                    className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-indigo-200 bg-white focus:ring-2 focus:ring-indigo-500/30 text-center text-indigo-950"
                                    placeholder="0"
                                    title={`${col.name} for Flat ${flat.flatNumber}`}
                                  />
                                </td>
                              );
                            })}

                            {/* Spacer Cell matching '+ Add Col' header button */}
                            <td className="p-2.5 text-center text-[11px] text-slate-300 border-l border-slate-100 select-none">
                              —
                            </td>

                            {/* Column 1: Pending Amount (Previous Month Dues) Input */}
                            <td className="p-2.5 text-center bg-rose-50/20 border-l border-rose-100">
                              <input
                                type="number"
                                min="0"
                                value={pendingAmt === 0 ? '' : pendingAmt}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      pendingAmount: val,
                                    },
                                  }));
                                }}
                                className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-rose-200 bg-white focus:ring-2 focus:ring-rose-500/30 text-center text-rose-800 shadow-2xs"
                                placeholder="0"
                                title={`Pending money from previous month for Flat ${flat.flatNumber}`}
                              />
                            </td>

                            {/* Column 2: Advance Amount (Credit Deduction) Input */}
                            <td className="p-2.5 text-center bg-emerald-50/20 border-l border-emerald-100">
                              <input
                                type="number"
                                min="0"
                                value={advanceAmt === 0 ? '' : advanceAmt}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0);
                                  setDraftReadings((prevMap) => ({
                                    ...prevMap,
                                    [flat.id]: {
                                      ...prevMap[flat.id],
                                      advanceAmount: val,
                                    },
                                  }));
                                }}
                                className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-emerald-200 bg-white focus:ring-2 focus:ring-emerald-500/30 text-center text-emerald-800 shadow-2xs"
                                placeholder="0"
                                title={`Advance credit deduction for Flat ${flat.flatNumber}`}
                              />
                            </td>

                            <td className="p-2.5 text-right font-extrabold whitespace-nowrap">
                              <div className="text-amber-900 text-sm">
                                ₹{netBill.toLocaleString('en-IN')}/-
                              </div>
                              {(pendingAmt > 0 || advanceAmt > 0) && (
                                <div className="text-[10px] font-mono font-medium text-slate-500 space-x-1">
                                  {pendingAmt > 0 && <span className="text-rose-600 font-bold">+{pendingAmt}</span>}
                                  {advanceAmt > 0 && <span className="text-emerald-600 font-bold">-{advanceAmt}</span>}
                                  <span className="text-slate-400">base ₹{totalAmt}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleSaveReadings}
                className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Save className="w-4 h-4" />
                Save & Publish {activeCycle.month} Bills
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS & COLLECTION TRACKER (Requirement 4 & 5) */}
      {activeTab === 'payments' && (
        <div className="space-y-3">
          {/* Filter pills */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs flex-wrap">
              <button
                onClick={() => setFilterPayment('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  filterPayment === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All (15)
              </button>
              <button
                onClick={() => setFilterPayment('paid')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  filterPayment === 'paid'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Paid ({paidCount})
              </button>
              <button
                onClick={() => setFilterPayment('partially_paid')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  filterPayment === 'partially_paid'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                Partially Paid ({partiallyPaidCount})
              </button>
              <button
                onClick={() => setFilterPayment('unpaid')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  filterPayment === 'unpaid'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Unpaid ({unpaidCount})
              </button>
              <button
                onClick={() => setFilterPayment('pending')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  filterPayment === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium mr-1">
                Collected: <strong className="text-emerald-700 font-bold">₹{activeCycle.totalCollectedAmount.toLocaleString('en-IN')}</strong> / ₹{activeCycle.totalBilledAmount.toLocaleString('en-IN')}
              </span>

              {/* Due Date setting */}
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <label htmlFor="admin-payments-due-date-input" className="text-xs font-bold text-amber-950 cursor-pointer">
                  Due:
                </label>
                <input
                  type="date"
                  id="admin-payments-due-date-input"
                  value={cycleDueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-white border border-amber-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                  title="Click to enter or change payment due date"
                />
              </div>

              {/* Reset Month Payment Data Button */}
              <button
                type="button"
                id="reset-month-payments-btn"
                onClick={() => setShowResetConfirmModal('month')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title={`Reset all payments for ${activeCycle.month} back to ₹0 (unpaid)`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset Month Payments</span>
              </button>

              {/* Reset All Months Button */}
              <button
                type="button"
                id="reset-all-payments-btn"
                onClick={() => setShowResetConfirmModal('all')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                title="Reset all payment records across every billing month to ₹0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset All Months</span>
              </button>

              {/* View Switcher: Table View (Spreadsheet with Pending/Advance) vs Cards View */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  id="payment-view-mode-table-btn"
                  onClick={() => setPaymentViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    paymentViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                  title="Spreadsheet Table View with Pending and Advance columns"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  id="payment-view-mode-cards-btn"
                  onClick={() => setPaymentViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                    paymentViewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 font-semibold'
                  }`}
                  title="Card Cards View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards View</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feedback message banner */}
          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setResetSuccessMessage(null)}
                className="text-emerald-600 hover:text-emerald-800 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reset Payment Confirmation Modal */}
          {showResetConfirmModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {showResetConfirmModal === 'month'
                        ? `Reset Payments for ${activeCycle.month}?`
                        : 'Reset All Payments Across All Months?'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {showResetConfirmModal === 'month' ? (
                        <>
                          This will reset all 15 flat payments for{' '}
                          <strong className="text-slate-900">{activeCycle.month}</strong> back to{' '}
                          <strong className="text-rose-700">unpaid</strong>. All recorded UPI/Cash payments, transaction dates, and collected amounts for this month will be cleared back to{' '}
                          <strong className="text-slate-900">₹0</strong>.
                        </>
                      ) : (
                        <>
                          This will assume{' '}
                          <strong className="text-slate-900">no payment has been received from anyone in any month</strong>. All flat records in every billing cycle will be set to{' '}
                          <strong className="text-rose-700">unpaid</strong> with ₹0 collected.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isResettingPayments}
                    onClick={() => setShowResetConfirmModal(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isResettingPayments}
                    onClick={async () => {
                      setIsResettingPayments(true);
                      try {
                        if (showResetConfirmModal === 'month') {
                          await resetMonthPaymentData(activeCycle.id);
                          setResetSuccessMessage(
                            `Payment data for ${activeCycle.month} has been reset: all flats are now unpaid with ₹0 collected.`
                          );
                        } else {
                          await resetAllPaymentsData();
                          setResetSuccessMessage(
                            'All payment records across all months have been reset to unpaid (₹0 collected).'
                          );
                        }
                        setShowResetConfirmModal(null);
                      } catch (err) {
                        alert('Failed to reset payment data: ' + (err instanceof Error ? err.message : String(err)));
                      } finally {
                        setIsResettingPayments(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isResettingPayments ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>
                          {showResetConfirmModal === 'month'
                            ? `Yes, Reset ${activeCycle.month}`
                            : 'Yes, Reset All Months'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SPREADSHEET TABLE or CARDS */}
          {paymentViewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 text-center w-16">Flat</th>
                      <th className="p-3">Resident & Phone</th>
                      <th className="p-3 text-center">Units</th>
                      <th className="p-3 text-right">Energy</th>
                      <th className="p-3 text-right">Common+Maint</th>
                      <th className="p-3 text-right font-semibold text-slate-800">Month Bill</th>
                      <th className="p-3 text-center bg-rose-50/70 border-l border-rose-200 text-rose-950">
                        <div className="flex flex-col items-center">
                          <span>Pending</span>
                          <span className="text-[10px] text-rose-600 font-normal">Prev Dues (+)</span>
                        </div>
                      </th>
                      <th className="p-3 text-center bg-emerald-50/70 border-l border-emerald-200 text-emerald-950">
                        <div className="flex flex-col items-center">
                          <span>Advance</span>
                          <span className="text-[10px] text-emerald-600 font-normal">Credit (-)</span>
                        </div>
                      </th>
                      <th className="p-3 text-right bg-amber-50/70 border-l border-amber-200 font-bold text-amber-950">
                        Net Payable
                      </th>
                      <th className="p-3 text-right">Paid Amt</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReadings.map((reading) => {
                      const flat = flats.find((f) => f.id === reading.flatId);
                      const isPaid = reading.paymentStatus === 'paid';
                      const isPartiallyPaid = reading.paymentStatus === 'partially_paid';
                      const isPending = reading.paymentStatus === 'pending';
                      const pendingAmt = reading.pendingAmount ?? (reading.previousBalance && reading.previousBalance > 0 ? reading.previousBalance : 0);
                      const advanceAmt = reading.advanceAmount ?? (reading.previousBalance && reading.previousBalance < 0 ? Math.abs(reading.previousBalance) : 0);
                      const netAmt = reading.netPayableAmount ?? (reading.totalBillAmount + pendingAmt - advanceAmt);
                      const isShopReading = (reading.flatNumber || '').toLowerCase().includes('shop') || (reading.flatId || '').toLowerCase().includes('shop');
                      const commonPlusMaint = (reading.commonMeterCharges !== undefined ? reading.commonMeterCharges : (isShopReading ? 0 : 160)) + (reading.maintenanceCharges !== undefined ? reading.maintenanceCharges : (isShopReading ? 0 : 110));

                      return (
                        <tr key={reading.flatId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 text-center font-extrabold text-slate-900">
                            {flat?.flatNumber || reading.flatNumber}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{flat?.ownerName || `Flat ${reading.flatNumber}`}</div>
                            <div className="text-[11px] text-slate-400 font-mono">+91 {flat?.phone}</div>
                          </td>
                          <td className="p-3 text-center font-mono font-medium text-slate-700">
                            {reading.unitsConsumed}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            ₹{reading.calculatedAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            ₹{commonPlusMaint.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            ₹{reading.totalBillAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center bg-rose-50/30 border-l border-rose-100 font-mono font-bold">
                            {pendingAmt > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                +₹{pendingAmt.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center bg-emerald-50/30 border-l border-emerald-100 font-mono font-bold">
                            {advanceAmt > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                -₹{advanceAmt.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right bg-amber-50/30 border-l border-amber-100 font-mono font-extrabold text-amber-950 text-sm">
                            ₹{netAmt.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {reading.paidAmount !== undefined && reading.paidAmount > 0 ? (
                              <span className="font-bold text-emerald-700">
                                ₹{reading.paidAmount.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-slate-400">₹0</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                PAID
                              </span>
                            ) : isPartiallyPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                PARTIAL
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                PENDING
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                UNPAID
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openPaymentModal(reading)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Record or edit payment"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>Pay</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => sendWhatsAppBill(reading)}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                title="Send WhatsApp Bill"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice({ reading, cycle: activeCycle })}
                                className="p-1 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="View Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards for each flat */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredReadings.map((reading) => {
              const flat = flats.find((f) => f.id === reading.flatId);
              const isPaid = reading.paymentStatus === 'paid';
              const isPartiallyPaid = reading.paymentStatus === 'partially_paid';
              const isPending = reading.paymentStatus === 'pending';

              return (
                <div
                  key={reading.flatId}
                  className={`bg-white rounded-2xl border p-3.5 shadow-xs transition-all ${
                    isPaid
                      ? 'border-emerald-200'
                      : isPartiallyPaid
                      ? 'border-amber-300 bg-amber-50/10'
                      : isPending
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-slate-900">
                          Flat {flat?.flatNumber || reading.flatNumber}
                        </span>
                        <span className="text-xs text-slate-500">({flat?.ownerName})</span>
                        <button
                          type="button"
                          onClick={() => flat && setEditingFlat(flat)}
                          className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 rounded-md transition-colors"
                          title="Edit flat number, resident name, or mobile number"
                        >
                          <Edit3 className="w-3 h-3 text-amber-600" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        +91 {flat?.phone}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          PAID
                        </span>
                      ) : isPartiallyPaid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          PARTIALLY PAID
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          VERIFY UTR
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          UNPAID
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Consumption & Charges breakdown */}
                  <div className="my-2.5 p-2 bg-slate-50 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {reading.unitsConsumed} Units @ ₹{reading.ratePerUnit.toFixed(1)}/u:
                      </span>
                      <span className="font-semibold text-slate-800">
                        ₹{reading.calculatedAmount.toLocaleString('en-IN')}/-
                      </span>
                    </div>
                    {((reading.commonMeterCharges !== undefined ? reading.commonMeterCharges : ((reading.flatNumber || '').toLowerCase().includes('shop') || (reading.flatId || '').toLowerCase().includes('shop') ? 0 : (settings.defaultCommonMeterCharges ?? 160))) > 0) && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{reading.commonMeterLabel || commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light'}:</span>
                        <span className="font-medium text-slate-700">
                          ₹{(reading.commonMeterCharges !== undefined ? reading.commonMeterCharges : ((reading.flatNumber || '').toLowerCase().includes('shop') || (reading.flatId || '').toLowerCase().includes('shop') ? 0 : (settings.defaultCommonMeterCharges ?? 160))).toLocaleString('en-IN')}/-
                        </span>
                      </div>
                    )}
                    {((reading.maintenanceCharges !== undefined ? reading.maintenanceCharges : ((reading.flatNumber || '').toLowerCase().includes('shop') || (reading.flatId || '').toLowerCase().includes('shop') ? 0 : (settings.defaultMaintenanceCharges ?? 110))) > 0) && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>{reading.maintenanceLabel || maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning'}:</span>
                        <span className="font-medium text-slate-700">
                          ₹{(reading.maintenanceCharges !== undefined ? reading.maintenanceCharges : ((reading.flatNumber || '').toLowerCase().includes('shop') || (reading.flatId || '').toLowerCase().includes('shop') ? 0 : (settings.defaultMaintenanceCharges ?? 110))).toLocaleString('en-IN')}/-
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium">Month Bill:</span>
                      <span className="font-bold text-slate-800">
                        ₹{reading.totalBillAmount.toLocaleString('en-IN')}/-
                      </span>
                    </div>

                    {/* Pending Amount from previous month */}
                    {reading.pendingAmount !== undefined && reading.pendingAmount > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-semibold py-0.5 text-rose-700 bg-rose-50/80 px-1.5 rounded">
                        <span>Pending Dues (+ Prev Mo):</span>
                        <span className="font-mono font-bold">+₹{reading.pendingAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {/* Advance Amount deduction */}
                    {reading.advanceAmount !== undefined && reading.advanceAmount > 0 && (
                      <div className="flex items-center justify-between text-[11px] font-semibold py-0.5 text-emerald-700 bg-emerald-50/80 px-1.5 rounded">
                        <span>Advance Credit (- Deduction):</span>
                        <span className="font-mono font-bold">-₹{reading.advanceAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {/* Fallback to previousBalance if pending/advance not explicitly set */}
                    {reading.pendingAmount === undefined && reading.advanceAmount === undefined && reading.previousBalance !== undefined && reading.previousBalance !== 0 && (
                      <div className="flex items-center justify-between text-[11px] font-semibold py-0.5">
                        <span className={reading.previousBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {reading.previousBalance > 0 ? 'Prev Unpaid Dues:' : 'Prev Advance Credit:'}
                        </span>
                        <span className={reading.previousBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                          {reading.previousBalance > 0 ? '+' : '-'}₹{Math.abs(reading.previousBalance).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-300 pt-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">Net Payable:</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        ₹{(reading.netPayableAmount ?? reading.totalBillAmount).toLocaleString('en-IN')}/-
                      </span>
                    </div>

                    {/* Recorded Amount Paid & Remaining / Advance status */}
                    {reading.paidAmount !== undefined && reading.paidAmount > 0 && (
                      <div className="pt-1 border-t border-dashed border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between text-emerald-700 font-semibold">
                          <span>Amount Paid:</span>
                          <span className="font-mono">₹{reading.paidAmount.toLocaleString('en-IN')}</span>
                        </div>
                        {reading.remainingBalance !== undefined && reading.remainingBalance > 0 && (
                          <div className="flex items-center justify-between text-amber-700 font-bold">
                            <span>Remaining Due (to next mo):</span>
                            <span className="font-mono">₹{reading.remainingBalance.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {reading.advancePaid !== undefined && reading.advancePaid > 0 && (
                          <div className="flex items-center justify-between text-emerald-700 font-bold">
                            <span>Advance Credit (to next mo):</span>
                            <span className="font-mono">₹{reading.advancePaid.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* UTR / payment record note */}
                  {reading.upiReference && (
                    <div className="mb-2 text-[11px] font-mono text-slate-600 bg-slate-100/80 px-2 py-1 rounded-lg">
                      UTR: <span className="font-bold text-slate-800">{reading.upiReference}</span>
                    </div>
                  )}

                  {/* Actions for Admin */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => openPaymentModal(reading)}
                      className="flex-1 py-1.5 px-2 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1"
                    >
                      <CreditCard className="w-3 h-3" />
                      {reading.paidAmount !== undefined && reading.paidAmount > 0 ? 'Edit Payment' : 'Enter Paid Amt'}
                    </button>

                    {(isPaid || isPartiallyPaid) && (
                      <button
                        onClick={() => markPaymentStatus(activeCycle.id, reading.flatId, 'unpaid', { paidAmount: 0 })}
                        className="py-1.5 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                        title="Reset to Unpaid"
                      >
                        Reset
                      </button>
                    )}

                    <button
                      onClick={() => sendWhatsAppBill(reading)}
                      className="py-1.5 px-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 flex items-center gap-1"
                      title="Send WhatsApp Bill"
                    >
                      <Share2 className="w-3 h-3" />
                      WA
                    </button>

                    <button
                      onClick={() => setSelectedInvoice({ reading, cycle: activeCycle })}
                      className="py-1.5 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB: BUILDING EXPENDITURES & SAVINGS ACCOUNTING */}
      {activeTab === 'expenses' && <BuildingExpensesTracker />}

      {/* TAB 3: CALCULATION & CUSTOM RATES (Requirement 2 & 6) */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          {/* Building Identity & Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  Building / Society Name & Information
                </h3>
                <p className="text-xs text-slate-500">
                  Update your building name, address, and electricity board meter details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditBuildingModal(true)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                Change Name & Address
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Building Name *
                </label>
                <input
                  type="text"
                  value={settings.buildingName}
                  onChange={(e) => updateSettings({ buildingName: e.target.value })}
                  placeholder="e.g. Gulshan-e-Iqbal Heights"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Appears on receipts, invoices, and resident portal</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Building Address / Locality
                </label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => updateSettings({ address: e.target.value })}
                  placeholder="e.g. Plot 42, Civil Lines"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Printed on official paper receipts</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Main Electricity Board Meter No.
                </label>
                <input
                  type="text"
                  value={settings.commonMeterNumber}
                  onChange={(e) => updateSettings({ commonMeterNumber: e.target.value })}
                  placeholder="e.g. EB-MAIN-489201"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Electricity Supply Board / Provider
                </label>
                <input
                  type="text"
                  value={settings.electricityBoard}
                  onChange={(e) => updateSettings({ electricityBoard: e.target.value })}
                  placeholder="e.g. State Electricity Board / DISCOM"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          {/* Mode Selector Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Electricity Bill Calculation Mode (Setting)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Choose how your building splits the main meter bill amongst the 15 flats.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Proportional Split */}
              <div
                onClick={() => updateSettings({ calculationMode: 'proportional_main_bill' })}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.calculationMode === 'proportional_main_bill'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">1. Proportional Main Bill</span>
                  {settings.calculationMode === 'proportional_main_bill' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Total Main Bill (e.g. ₹16,000) is divided by total flat units (1,800) = ₹8.89/unit. Sub-meter reads 100 units = ₹889 bill.
                </p>
              </div>

              {/* Option 2: Fixed Rate per Unit */}
              <div
                onClick={() => updateSettings({ calculationMode: 'fixed_rate' })}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.calculationMode === 'fixed_rate'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">2. Fixed Unit Rate</span>
                  {settings.calculationMode === 'fixed_rate' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Fixed rate like ₹9 per unit. 100 units consumed = exactly ₹900 bill, regardless of total bill.
                </p>
              </div>

              {/* Option 3: Flat-Specific Custom Rates (Requirement 6) */}
              <div
                onClick={() => updateSettings({ calculationMode: 'flat_specific' })}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.calculationMode === 'flat_specific'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">3. Flat-Specific Rates</span>
                  {settings.calculationMode === 'flat_specific' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Different rates per flat! (e.g. Flats 1, 2, 3 pay ₹6/unit while other flats pay ₹9/unit).
                </p>
              </div>
            </div>

            {/* Default rate input */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Default Standard Unit Rate (₹ / Unit):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.defaultRatePerUnit}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateSettings({ defaultRatePerUnit: Number(e.target.value) })}
                  className="w-20 px-2.5 py-1 text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-lg"
                  step="0.5"
                />
                <span className="text-xs text-slate-500">₹ / Unit</span>
              </div>
            </div>
          </div>

          {/* Individual Flat-Specific Rates (Requirement 6) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Custom Rate per Unit for Individual Flats
                </h3>
                <p className="text-xs text-slate-500">
                  Flats 101, 102, 103 are set to ₹6/unit, and other flats are set to ₹9/unit. You can modify any flat's rate below:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3">
              {flats.map((flat) => {
                const currentRate = flat.customRatePerUnit ?? settings.defaultRatePerUnit;
                const isSpecial = flat.customRatePerUnit !== undefined;

                return (
                  <div
                    key={flat.id}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isSpecial ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-800">
                        Flat {flat.flatNumber}
                      </span>
                      {isSpecial && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs text-slate-400 font-semibold">₹</span>
                      <input
                        type="number"
                        value={currentRate}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          updateFlatCustomRate(flat.id, val);
                        }}
                        className="w-16 px-1.5 py-1 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg text-slate-900"
                        step="0.5"
                      />
                      <span className="text-[10px] text-slate-400">/ unit</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Default Maintenance & Common Area Charges Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-4 h-4 text-sky-600" />
                  Default Common Area & Maintenance Charges
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set fixed monthly charges. These can be auto-applied across all 15 flat bills or adjusted per flat.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyChargesToAll()}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-200" />
                  <span>Apply to All 15 Flat Bills</span>
                </button>
              </div>
            </div>

            {/* Success alert message */}
            {chargesSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{chargesSuccessMsg}</span>
              </div>
            )}

            {/* Auto-apply toggle */}
            <div className="p-3 mb-4 rounded-xl bg-sky-50/60 border border-sky-200/80 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoApplyCharges}
                  onChange={(e) => setAutoApplyCharges(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Auto-Apply Changes to All 15 Flat Bills
                  </span>
                  <span className="text-[11px] text-slate-500">
                    When enabled, typing a new rate or selecting a preset immediately updates every flat in the active bill statement.
                  </span>
                </div>
              </label>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  autoApplyCharges
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {autoApplyCharges ? 'AUTO-SYNC ON' : 'MANUAL SYNC'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
              {/* Common Area / Motor Light */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    Common Area / Motor Light Label
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateCommonLabel('Common meter');
                      if (autoApplyCharges) {
                        handleApplyChargesToAll(
                          settings.defaultCommonMeterCharges ?? 160,
                          settings.defaultMaintenanceCharges ?? 110,
                          'Common meter',
                          maintenanceLabel
                        );
                      }
                    }}
                    className="text-[10px] text-sky-700 hover:underline font-semibold"
                  >
                    Set "Common meter"
                  </button>
                </div>
                <input
                  type="text"
                  value={commonMeterLabel}
                  onChange={(e) => {
                    handleUpdateCommonLabel(e.target.value);
                    if (autoApplyCharges) {
                      handleApplyChargesToAll(
                        settings.defaultCommonMeterCharges ?? 160,
                        settings.defaultMaintenanceCharges ?? 110,
                        e.target.value,
                        maintenanceLabel
                      );
                    }
                  }}
                  placeholder="e.g. Common meter, Water & stairs light"
                  className="w-full px-3 py-1.5 mb-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold"
                />

                <label className="block font-semibold text-slate-700 mb-1">
                  Default Common Charge per Flat (₹)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                    <span className="font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={settings.defaultCommonMeterCharges ?? 160}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        if (autoApplyCharges) {
                          handleApplyChargesToAll(
                            val,
                            settings.defaultMaintenanceCharges ?? 110,
                            commonMeterLabel,
                            maintenanceLabel
                          );
                        } else {
                          updateSettings({ defaultCommonMeterCharges: val }, false);
                        }
                      }}
                      className="w-20 text-xs font-mono font-bold bg-transparent text-slate-900 outline-hidden"
                      min="0"
                      step="10"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">/ flat / month</span>
                </div>

                {/* Quick presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-400">Presets:</span>
                  {[120, 160, 200, 250, 300].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        if (autoApplyCharges) {
                          handleApplyChargesToAll(
                            amt,
                            settings.defaultMaintenanceCharges ?? 110,
                            commonMeterLabel,
                            maintenanceLabel
                          );
                        } else {
                          updateSettings({ defaultCommonMeterCharges: amt }, false);
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                        (settings.defaultCommonMeterCharges ?? 160) === amt
                          ? 'bg-sky-600 text-white font-bold'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                  <span>15 Flats Total:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ₹{((settings.defaultCommonMeterCharges ?? 160) * 15).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </div>

              {/* Maintenance / Society Charges */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Maintenance / Society Label
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateMaintenanceLabel('Maintenance');
                      if (autoApplyCharges) {
                        handleApplyChargesToAll(
                          settings.defaultCommonMeterCharges ?? 160,
                          settings.defaultMaintenanceCharges ?? 110,
                          commonMeterLabel,
                          'Maintenance'
                        );
                      }
                    }}
                    className="text-[10px] text-amber-700 hover:underline font-semibold"
                  >
                    Set "Maintenance"
                  </button>
                </div>
                <input
                  type="text"
                  value={maintenanceLabel}
                  onChange={(e) => {
                    handleUpdateMaintenanceLabel(e.target.value);
                    if (autoApplyCharges) {
                      handleApplyChargesToAll(
                        settings.defaultCommonMeterCharges ?? 160,
                        settings.defaultMaintenanceCharges ?? 110,
                        commonMeterLabel,
                        e.target.value
                      );
                    }
                  }}
                  placeholder="e.g. Cleaning, Maintenance"
                  className="w-full px-3 py-1.5 mb-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold"
                />

                <label className="block font-semibold text-slate-700 mb-1">
                  Default Maintenance Charge per Flat (₹)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                    <span className="font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={settings.defaultMaintenanceCharges ?? 110}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        if (autoApplyCharges) {
                          handleApplyChargesToAll(
                            settings.defaultCommonMeterCharges ?? 160,
                            val,
                            commonMeterLabel,
                            maintenanceLabel
                          );
                        } else {
                          updateSettings({ defaultMaintenanceCharges: val }, false);
                        }
                      }}
                      className="w-20 text-xs font-mono font-bold bg-transparent text-slate-900 outline-hidden"
                      min="0"
                      step="10"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">/ flat / month</span>
                </div>

                {/* Quick presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-400">Presets:</span>
                  {[50, 100, 110, 150, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        if (autoApplyCharges) {
                          handleApplyChargesToAll(
                            settings.defaultCommonMeterCharges ?? 160,
                            amt,
                            commonMeterLabel,
                            maintenanceLabel
                          );
                        } else {
                          updateSettings({ defaultMaintenanceCharges: amt }, false);
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                        (settings.defaultMaintenanceCharges ?? 110) === amt
                          ? 'bg-amber-600 text-white font-bold'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                  <span>15 Flats Total:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ₹{((settings.defaultMaintenanceCharges ?? 110) * 15).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </div>
            </div>

            {/* Live Combined Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-100">
                    Combined Fixed Society Charges:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/30">
                    ₹{(settings.defaultCommonMeterCharges ?? 160) + (settings.defaultMaintenanceCharges ?? 110)} / flat
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {commonMeterLabel}: ₹{settings.defaultCommonMeterCharges ?? 160} + {maintenanceLabel}: ₹{settings.defaultMaintenanceCharges ?? 110}
                </p>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Total 15 Flats Collection
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    ₹{(((settings.defaultCommonMeterCharges ?? 160) + (settings.defaultMaintenanceCharges ?? 110)) * 15).toLocaleString('en-IN')}/mo
                  </span>
                </div>
                <div className="pl-3 border-l border-slate-800 text-[11px] text-slate-400 text-left">
                  <span className="block text-slate-200 font-medium">✓ Active Status</span>
                  <span>Auto-applied to {activeCycle?.month}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Society UPI & Payee Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Free UPI Payment Configuration (₹0 Transaction Fee)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Payments made via UPI QR code or GPay go directly to your society bank account with zero gateway deduction.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Society UPI ID / VPA
                </label>
                <input
                  type="text"
                  value={settings.societyUpiId}
                  onChange={(e) => updateSettings({ societyUpiId: e.target.value })}
                  placeholder="society@okaxis"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Society Payee Name
                </label>
                <input
                  type="text"
                  value={settings.societyPayeeName}
                  onChange={(e) => updateSettings({ societyPayeeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                />
              </div>
            </div>

            {/* Custom Admin UPI QR Code Upload */}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    Upload Society UPI QR Code (For All Flat Owners)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Upload your society UPI QR code image (PhonePe, Google Pay, Paytm, BHIM, Bank). Logged-in flat owners will see this exact QR code when making payments.
                  </p>
                </div>

                {settings.upiQrCodeUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Active on Resident Portal
                  </span>
                )}
              </div>

              {qrUploadError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {qrUploadError}
                </div>
              )}

              {settings.upiQrCodeUrl ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-32 h-32 bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                    <img
                      src={settings.upiQrCodeUrl}
                      alt="Uploaded Society UPI QR"
                      className="max-h-full max-w-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">Current Active QR Code</span>
                      <span className="text-slate-500 text-[11px]">
                        Displayed to flat owners on their payment screens and receipts.
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        Replace QR Code
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          updateSettings({ upiQrCodeUrl: undefined });
                          setSaveSuccessMsg('Custom QR code removed. Switched back to auto-generated dynamic QR.');
                          setTimeout(() => setSaveSuccessMsg(''), 3000);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove QR
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-5 text-center cursor-pointer transition-all block group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform border border-emerald-100">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Click to Upload UPI QR Code Image
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Supports PNG, JPG, JPEG, WebP • Max 5MB
                  </span>
                  <span className="inline-block mt-2 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Recommended: Download QR from PhonePe / Google Pay / Paytm / Bank App
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Admin PIN & Hidden Access Management */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              Admin Security PIN & Access Protection
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              The Admin Panel is completely invisible to all residents. You can configure your secret Admin PIN below.
            </p>

            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin / Secretary Full Name
                </label>
                <input
                  type="text"
                  value={settings.adminName || 'Mohammad Shariq Ansari'}
                  onChange={(e) => updateSettings({ adminName: e.target.value })}
                  placeholder="Mohammad Shariq Ansari"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin / Secretary Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.adminPhone || '8077649394'}
                  onChange={(e) => updateSettings({ adminPhone: e.target.value.replace(/\D/g, '') })}
                  placeholder="8077649394"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Administrator Email
                </label>
                <input
                  type="email"
                  value={settings.adminEmail || ''}
                  onChange={(e) => updateSettings({ adminEmail: e.target.value.trim() })}
                  placeholder="e.g. secretary@society.org"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Required for admin portal sign-in and password resets.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="text"
                  value={settings.adminPassword || 'My1Build2@3'}
                  onChange={(e) => updateSettings({ adminPassword: e.target.value.trim() })}
                  placeholder="My1Build2@3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Security PIN (4 to 6 Digits)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={settings.adminPin || ''}
                    onChange={(e) => updateSettings({ adminPin: e.target.value.trim() })}
                    maxLength={6}
                    placeholder="••••"
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 tracking-widest text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="text-xs text-slate-500">Active secret PIN</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  How to Access the Hidden Admin Panel
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-indigo-900/90 leading-relaxed">
                  <li>
                    <strong>Registered Admin Email:</strong> Sign-in requires entering your registered email or phone along with your password or PIN.
                  </li>
                  <li>
                    <strong>Triple-Click Building Icon:</strong> Click or tap the yellow lightning icon in the top header 3 times rapidly.
                  </li>
                  <li>
                    <strong>Keyboard Shortcut:</strong> Press <kbd className="px-1.5 py-0.5 bg-white border border-indigo-200 rounded font-mono text-[10px] font-bold">Ctrl + Shift + A</kbd> anywhere on the screen.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Firebase Phone Auth & SMS Gateway Settings Guidance */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              Resident Security PIN Authentication Active
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Overview of how PIN authentication works for flat owners and residents (Zero SMS billing / No Blaze plan needed).
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Individual Resident PIN System Active
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Residents and flat owners log in by entering their registered mobile number. On their first login, the system prompts them to set and confirm their own 4-digit security PIN. For subsequent logins, they simply enter their number and PIN. No SMS gateway charges or pay-as-you-go Firebase plan required!
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="font-bold text-slate-800 mb-1">
                  How Admins Can Reset a Resident's Forgotten PIN
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  If a resident forgets their PIN, navigate to the <strong>Flats Management</strong> tab below and click <strong>Reset PIN</strong> next to their flat. Upon their next login attempt, they will be prompted to choose a brand new PIN.
                </p>
              </div>
            </div>
          </div>

          {/* Secure Admin-Only Danger Zone for Database Baseline */}
          <div className="bg-rose-50/50 rounded-2xl border border-rose-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-rose-900 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Administrative Danger Zone
            </h3>
            <p className="text-xs text-rose-700/80 mb-3">
              This action is strictly restricted to authenticated Society Admins. Only perform this if you wish to wipe all current billing records and reset the database back to default initial values.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    'DANGER: Are you sure you want to reset all data? This will restore the 15 baseline flats and initial ₹16,000 billing cycle. All custom flats and manual entries will be reset.'
                  );
                  if (confirmed) {
                    resetAllData();
                    setSaveSuccessMsg('System reset to baseline sample data successfully.');
                    setTimeout(() => setSaveSuccessMsg(''), 4000);
                  }
                }}
                className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-100 border border-rose-300 px-3.5 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                Reset Database to Initial Baseline
              </button>

              <button
                type="button"
                onClick={async () => {
                  const confirmed = window.confirm(
                    'Are you sure you want to reset all payment records across all months to unpaid (assuming ₹0 received)?'
                  );
                  if (confirmed) {
                    await resetAllPaymentsData();
                    setSaveSuccessMsg('All payment records reset to unpaid (₹0 collected).');
                    setTimeout(() => setSaveSuccessMsg(''), 4000);
                  }
                }}
                className="text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3.5 py-2 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                Reset All Payments (Assume ₹0 Received)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FLATS DIRECTORY */}
      {activeTab === 'flats' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {settings.buildingName} • Directory
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditBuildingModal(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 transition-colors"
                  title="Edit Building Name"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Total 15 flats. Click "Edit" on any flat or building name to change details.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  const ok = await saveToCloud(settings, flats, cycles, activeCycleId);
                  if (ok) {
                    setSaveSuccessMsg('All 15 flats, names, and phone numbers are safely backed up to Cloud Database!');
                  } else {
                    setSaveSuccessMsg('Saved to local device storage.');
                  }
                  setTimeout(() => setSaveSuccessMsg(''), 4000);
                }}
                className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="Backup all resident names and numbers to Cloud Firestore"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>Save to Cloud</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const json = exportBackupJson();
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  const dateStr = new Date().toISOString().split('T')[0];
                  a.href = url;
                  a.download = `building-tracker-backup-${dateStr}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setSaveSuccessMsg('Backup file downloaded! You can import this on any phone or device.');
                  setTimeout(() => setSaveSuccessMsg(''), 4000);
                }}
                className="text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="Download all resident details, flats, and bills to a JSON file"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Export Backup (JSON)</span>
              </button>

              <label
                className="text-[11px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                title="Restore resident names, flats, or billing data from a backup file"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const content = event.target?.result as string;
                      if (content) {
                        const result = importBackupJson(content);
                        setSaveSuccessMsg(result.message);
                        setTimeout(() => setSaveSuccessMsg(''), 5000);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => setShowEditBuildingModal(true)}
                className="text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-amber-600" />
                Edit Building Name
              </button>
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                ✏️ Flat Number, Name & Phone are editable
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-2.5">Flat No.</th>
                  <th className="p-2.5">Resident / Owner Name</th>
                  <th className="p-2.5">Mobile Number</th>
                  <th className="p-2.5 text-center">Login PIN</th>
                  <th className="p-2.5">Sub-Meter No.</th>
                  <th className="p-2.5">Floor</th>
                  <th className="p-2.5 text-right">Custom Unit Rate</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flats.map((flat) => (
                  <tr key={flat.id} className="hover:bg-slate-50/70">
                    <td className="p-2.5 font-bold font-mono text-slate-900">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        Flat {flat.flatNumber}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold text-slate-800">{flat.ownerName}</td>
                    <td className="p-2.5 font-mono text-slate-600 font-semibold">+91 {flat.phone}</td>
                    <td className="p-2.5 text-center">
                      {flat.pin ? (
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PIN Set
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await resetFlatPin(flat.id);
                            }}
                            className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline font-semibold cursor-pointer"
                            title="Reset PIN so resident sets a new PIN next login"
                          >
                            Reset
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Not Set
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500">{flat.meterNumber}</td>
                    <td className="p-2.5 text-slate-600 font-medium">
                      {flat.floor === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          Ground (0)
                        </span>
                      ) : (
                        `Floor ${flat.floor}`
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      {flat.customRatePerUnit ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                          ₹{flat.customRatePerUnit}/u
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">₹{settings.defaultRatePerUnit}/u (Default)</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => switchToResidentView(flat.id)}
                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Preview what Flat ${flat.flatNumber} resident sees`}
                        >
                          <Eye className="w-3 h-3 text-indigo-600" />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFlat(flat)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Edit Flat ${flat.flatNumber}, resident name, or mobile number`}
                        >
                          <Edit3 className="w-3 h-3 text-amber-600" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: NOTICE, APPEAL & ANNOUNCEMENT */}
      {activeTab === 'broadcasts' && (
        <AdminBroadcastsManager />
      )}

      {/* Admin Payment Record Modal with Paid Amount, Remaining Balance & Advance Calculation */}
      {markingFlatId && (() => {
        const targetReading = activeCycle.readings.find((r) => r.flatId === markingFlatId);
        const targetFlat = flats.find((f) => f.id === markingFlatId);
        const netPayable = targetReading?.netPayableAmount ?? targetReading?.totalBillAmount ?? 0;
        const enteredPaidAmount = paymentAmountInput === '' ? 0 : parseFloat(paymentAmountInput) || 0;
        const remaining = netPayable - enteredPaidAmount;

        const isFullyPaid = enteredPaidAmount >= netPayable && netPayable > 0;
        const isPartiallyPaid = enteredPaidAmount > 0 && enteredPaidAmount < netPayable;
        const isAdvancePaid = enteredPaidAmount > netPayable;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-auto">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Record Payment • Flat {targetFlat?.flatNumber || targetReading?.flatNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {targetFlat?.ownerName} ({activeCycle.month})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMarkingFlatId(null);
                    setPaymentUtr('');
                    setPaymentAmountInput('');
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {/* Bill Details Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 mb-3">
                <div className="flex justify-between text-slate-600">
                  <span>Current Month Bill:</span>
                  <span className="font-semibold text-slate-800">
                    ₹{(targetReading?.totalBillAmount ?? 0).toLocaleString('en-IN')}
                  </span>
                </div>
                {targetReading?.pendingAmount !== undefined && targetReading.pendingAmount > 0 && (
                  <div className="flex justify-between font-semibold text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded">
                    <span>Pending Dues (+ Prev Mo):</span>
                    <span className="font-mono font-bold">
                      +₹{targetReading.pendingAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {targetReading?.advanceAmount !== undefined && targetReading.advanceAmount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded">
                    <span>Advance Credit (- Deduction):</span>
                    <span className="font-mono font-bold">
                      -₹{targetReading.advanceAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                {targetReading?.pendingAmount === undefined && targetReading?.advanceAmount === undefined && targetReading?.previousBalance !== undefined && targetReading.previousBalance !== 0 && (
                  <div className="flex justify-between font-medium">
                    <span className={targetReading.previousBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                      {targetReading.previousBalance > 0 ? 'Previous Unpaid Dues:' : 'Previous Advance Credit:'}
                    </span>
                    <span className={`font-mono font-bold ${targetReading.previousBalance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {targetReading.previousBalance > 0 ? '+' : '-'}₹
                      {Math.abs(targetReading.previousBalance).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1 flex justify-between font-extrabold text-sm text-slate-900">
                  <span>Net Total Payable:</span>
                  <span className="text-emerald-700 text-base font-mono">
                    ₹{netPayable.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Amount Paid Input */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-800">
                      Amount Paid by Flat Owner (₹)
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentAmountInput(netPayable.toString())}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                      >
                        Full (₹{netPayable})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentAmountInput('0')}
                        className="text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-200"
                      >
                        Clear (₹0)
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={paymentAmountInput === '0' ? '' : paymentAmountInput}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      placeholder="Enter amount paid"
                      className="w-full pl-8 pr-3 py-2 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-xl text-base font-bold font-mono text-slate-900 focus:outline-none"
                      min="0"
                      step="1"
                    />
                  </div>
                </div>

                {/* Calculation preview: Remaining vs Advance */}
                <div className="p-3 rounded-xl border text-xs">
                  {isAdvancePaid ? (
                    <div className="space-y-1 text-emerald-900">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Paid in Advance
                        </span>
                        <span className="text-emerald-700 font-mono text-sm">
                          +₹{Math.abs(remaining).toLocaleString('en-IN')} Advance
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        👉 <strong>₹{Math.abs(remaining).toLocaleString('en-IN')}</strong> will automatically be deducted from this flat's next month's bill as advance credit.
                      </p>
                    </div>
                  ) : isPartiallyPaid ? (
                    <div className="space-y-1 text-amber-900">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-amber-700">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Partially Paid
                        </span>
                        <span className="text-amber-800 font-mono text-sm">
                          ₹{remaining.toLocaleString('en-IN')} Remaining
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800">
                        👉 Remaining <strong>₹{remaining.toLocaleString('en-IN')}</strong> will automatically be carried over into next month's bill as unpaid dues.
                      </p>
                    </div>
                  ) : isFullyPaid ? (
                    <div className="space-y-1 text-emerald-900">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Fully Settled
                        </span>
                        <span className="text-emerald-700 font-mono text-sm">₹0 Balance</span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        Bill is completely paid. No dues or advance will carry forward.
                      </p>
                    </div>
                  ) : (
                    <div className="text-slate-500">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-rose-600">Unpaid</span>
                        <span className="font-mono text-rose-600">₹{netPayable} Due</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Full amount remains unpaid and will carry forward if next cycle is created.
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['UPI', 'Cash', 'Bank Transfer', 'Cheque'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-1.5 px-2 rounded-lg font-semibold text-xs border ${
                          paymentMethod === m
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference / UTR */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reference / UTR / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentUtr}
                    onChange={(e) => setPaymentUtr(e.target.value)}
                    placeholder="e.g. Received via Cash / UPI 10298"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMarkingFlatId(null);
                      setPaymentUtr('');
                      setPaymentAmountInput('');
                    }}
                    className="flex-1 py-2 text-slate-600 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const status = isFullyPaid || isAdvancePaid ? 'paid' : (isPartiallyPaid ? 'partially_paid' : 'unpaid');
                      markPaymentStatus(activeCycle.id, markingFlatId, status, {
                        method: paymentMethod,
                        upiRef: paymentUtr || undefined,
                        paidAmount: enteredPaidAmount,
                      });
                      setMarkingFlatId(null);
                      setPaymentUtr('');
                      setPaymentAmountInput('');
                      setSaveSuccessMsg(`Payment of ₹${enteredPaidAmount} saved for Flat ${targetFlat?.flatNumber || ''}!`);
                      setTimeout(() => setSaveSuccessMsg(''), 4000);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Save Payment Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Invoice Modal for Admin */}
      {selectedInvoice && (
        <BillInvoiceModal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          reading={selectedInvoice.reading}
          cycle={selectedInvoice.cycle}
        />
      )}

      {/* Edit Flat Details Modal (Flat No., Name, Phone) */}
      {editingFlat && (
        <EditFlatModal
          flat={editingFlat}
          isOpen={true}
          onClose={() => setEditingFlat(null)}
          onSave={handleSaveFlatDetails}
        />
      )}

      {/* Edit Building Details Modal */}
      {showEditBuildingModal && (
        <EditBuildingModal
          settings={settings}
          isOpen={true}
          onClose={() => setShowEditBuildingModal(false)}
          onSave={(updates) => {
            updateSettings(updates);
            setSaveSuccessMsg(`Building details updated!`);
            setTimeout(() => setSaveSuccessMsg(''), 3000);
          }}
        />
      )}

      {/* Dynamic Add Column Modal (Requirement: Add new column for fees like Building Charge) */}
      {isAddColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Fee Column</h3>
                  <p className="text-[11px] text-slate-500">
                    Add extra fee to table, receipts & WhatsApp bills
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddColumnModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateColumn} className="mt-4 space-y-4">
              {columnErrorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{columnErrorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Column / Fee Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => {
                    setNewColumnName(e.target.value);
                    if (columnErrorMsg) setColumnErrorMsg('');
                  }}
                  placeholder="e.g. Building Charge, Lift Maintenance, Generator"
                  className="w-full px-3 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  autoFocus
                />

                {/* Quick Presets */}
                <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                  {[
                    'Building Charge',
                    'Lift Maintenance',
                    'Generator Backup',
                    'Security Guard',
                    'Water Tanker',
                    'Festival Fund',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewColumnName(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 font-medium transition-colors"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Default Amount per Flat (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newColumnAmount === 0 ? '' : newColumnAmount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNewColumnAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded-xl focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-slate-900"
                    placeholder="100"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can also edit this amount for any flat individually directly in the table.
                </p>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyColumnToAll}
                    onChange={(e) => setApplyColumnToAll(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <div>
                    <span className="text-xs font-bold text-indigo-950 block">
                      Apply this fee to all 15 flats automatically
                    </span>
                    <span className="text-[11px] text-indigo-700/80 block leading-relaxed mt-0.5">
                      Adds ₹{newColumnAmount || 0} to all flat bills and recalculates total bills immediately.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddColumnModalOpen(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Column to Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Billing Cycle Modal with Manual Due Date */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Start Next Month Bill</h3>
                  <p className="text-[11px] text-slate-500">Auto-carries unpaid dues and advance balances</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCycleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Billing Month Name:
                </label>
                <input
                  type="text"
                  value={newCycleMonthName}
                  onChange={(e) => setNewCycleMonthName(e.target.value)}
                  placeholder="e.g. October 2026"
                  className="w-full px-3 py-2 text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Due Date (Set by You):
                </label>
                <input
                  type="date"
                  value={newCycleDueDate}
                  onChange={(e) => setNewCycleDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 focus:bg-white border border-amber-300 focus:border-amber-500 rounded-xl font-bold text-slate-900 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  You can enter any payment due date you prefer. It will be printed on bills, WhatsApp messages, and receipts.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                <span className="font-bold">Automatic Balance Forwarding:</span>
                <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                  Any flat that has not paid previous dues will automatically have their pending amount carried forward. Any flat that paid in advance will have their credit deducted.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowNewCycleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateCycle}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Create Month with this Due Date</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {columnSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 bg-indigo-950 text-white rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200 border border-indigo-700 max-w-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{columnSuccessToast}</span>
        </div>
      )}
    </div>
  );
};
