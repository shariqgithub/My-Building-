export type CalculationMode = 'proportional_main_bill' | 'fixed_rate' | 'flat_specific';

export interface FlatInfo {
  id: string; // e.g. "flat-101"
  flatNumber: string; // e.g. "101"
  floor: number;
  ownerName: string;
  phone: string;
  meterNumber: string;
  customRatePerUnit?: number; // e.g. ₹6 for flats 101, 102, 103; ₹9 for others
  baselineReading: number; // initial reading when sub-meter was installed
  pin?: string; // 4-6 digit security PIN set by resident for login
}

export interface MainMeterBillInput {
  mainMeterPreviousReading: number;
  mainMeterCurrentReading: number;
  mainMeterUnits: number; // e.g. 2000 units
  mainMeterBillAmount: number; // e.g. ₹16,000
  commonAreaRule: 'divide_by_flat_units' | 'split_loss_equally' | 'none';
}

export interface FlatReadingEntry {
  flatId: string;
  flatNumber: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  ratePerUnit: number; // rate applied for this flat
  calculatedAmount: number; // unitsConsumed * ratePerUnit
  commonShareAmount: number; // legacy alias
  maintenanceCharges?: number; // Maintenance charges (e.g. Cleaning ₹110)
  maintenanceLabel?: string; // e.g. "Cleaning" or "Maintenance"
  commonMeterCharges?: number; // Common meter/area charges (e.g. Water & stairs light ₹160)
  commonMeterLabel?: string; // e.g. "Water & stairs light" or "Common area"
  totalBillAmount: number; // calculatedAmount + maintenanceCharges + commonMeterCharges
  previousBalance?: number; // Previous month unpaid dues (+ve) or advance credit (-ve)
  netPayableAmount?: number; // totalBillAmount + (previousBalance || 0)
  paymentStatus: 'paid' | 'unpaid' | 'pending' | 'partially_paid';
  paidAmount?: number; // Actual amount paid by the flat owner
  remainingBalance?: number; // netPayableAmount - (paidAmount || 0) (if > 0, remaining due; if < 0, advance paid)
  advancePaid?: number; // Advance amount paid (when paidAmount > netPayableAmount)
  paidDate?: string;
  paymentMethod?: 'UPI' | 'Cash' | 'Bank Transfer';
  upiReference?: string;
  adminNotes?: string;
}

export interface BillingCycle {
  id: string; // e.g. "cycle-2026-09"
  month: string; // e.g. "September 2026"
  monthKey: string; // "2026-09"
  generatedDate: string;
  dueDate: string;
  mainMeter: MainMeterBillInput;
  totalSubMeterUnits: number;
  effectiveRatePerUnit: number; // average or standard rate
  calculationMode: CalculationMode;
  readings: FlatReadingEntry[];
  totalBilledAmount: number;
  totalCollectedAmount: number;
  isLocked: boolean; // whether month is finalized
}

export interface BuildingSettings {
  buildingName: string;
  address: string;
  commonMeterNumber: string;
  electricityBoard: string; // e.g. "State Electricity Distribution Co."
  calculationMode: CalculationMode;
  defaultRatePerUnit: number; // e.g. 9
  defaultMaintenanceCharges: number; // e.g. 110 (Cleaning)
  defaultMaintenanceLabel: string; // e.g. "Cleaning"
  defaultCommonMeterCharges: number; // e.g. 160 (Water & stairs light)
  defaultCommonMeterLabel: string; // e.g. "Water & stairs light"
  societyUpiId: string; // e.g. "buildingadmin@okaxis"
  societyPayeeName: string; // e.g. "Green Heights Co-op Society"
  upiQrCodeUrl?: string; // Custom uploaded UPI QR code image data URL
  adminPin: string; // e.g. "1234" (backup PIN)
  adminPhone: string; // e.g. "9876543210"
  adminEmail?: string; // e.g. "secretary@society.com"
  adminPassword?: string; // Fixed secure password e.g. "My1Build2@3"
  adminFlatId?: string; // e.g. "flat-101" - Flat belonging to the admin/secretary
}

export interface UserSession {
  role: 'admin' | 'resident';
  flatId?: string; // if resident or committee member linked flat
  flatNumber?: string;
  phone: string;
  email?: string;
  name: string;
  isCommitteeMember?: boolean; // Set to true if this user has admin / committee privileges
  isPhoneVerified?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'bill_generated' | 'payment_received' | 'due_reminder' | 'system';
  targetFlatId?: string; // empty means all flats
  isRead: boolean;
}

export type ExpenseCategory =
  | 'electricity_bill'
  | 'house_cleaning'
  | 'plumber'
  | 'electrician'
  | 'sewer_cleaning'
  | 'water_tank_motor'
  | 'security_guard'
  | 'garbage_collection'
  | 'maintenance_repair'
  | 'other';

export interface BuildingExpense {
  id: string;
  cycleId?: string; // e.g. "cycle-2026-09"
  monthKey: string; // e.g. "2026-09" or "September 2026"
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paidTo?: string; // e.g. "Electricity Distribution Board", "Ramesh Plumber"
  paymentMethod: 'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque';
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface MonthlyAccounting {
  monthKey: string; // "2026-09"
  monthName: string; // "September 2026"
  totalBilledToFlats: number;
  totalCollectedFromFlats: number;
  manualCollectionAdjustment?: number; // In case admin overrides/adjusts
  totalExpenses: number;
  netSavings: number; // positive = surplus/savings, negative = out-of-pocket deficit
  status: 'surplus' | 'deficit' | 'break_even';
}

export type SocietyBroadcastCategory = 'notice' | 'appeal' | 'announcement';

export interface SocietyBroadcast {
  id: string;
  category: SocietyBroadcastCategory;
  title: string;
  content: string;
  date: string; // e.g. "20 Sep 2026" or "2026-09-20"
  priority?: 'normal' | 'important' | 'urgent';
  author?: string; // e.g. "Society Secretary", "Managing Committee"
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
