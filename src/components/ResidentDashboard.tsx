import React, { useState, useMemo } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { UpiPaymentModal } from './UpiPaymentModal';
import { BillInvoiceModal } from './BillInvoiceModal';
import { CATEGORY_CONFIG } from './BuildingExpensesTracker';
import { ExpenseCategory } from '../types';
import {
  Zap,
  Home,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  QrCode,
  Share2,
  Calendar,
  Activity,
  ChevronRight,
  TrendingUp,
  Info,
  ShieldCheck,
  KeyRound,
  Lock,
  X,
  Check,
  Receipt,
  PiggyBank,
  Building,
  Sparkles,
  Filter,
  Search,
  IndianRupee,
  Bell,
  HeartHandshake,
  Megaphone,
  User,
} from 'lucide-react';

export const ResidentDashboard: React.FC = () => {
  const { flats, activeCycle, cycles, currentSession, settings, setFlatPin, expenses, broadcasts } = useBuilding();

  // Tab State: 'dashboard' (Main statement + current month expenses), 'bills_history', 'building_expenses'
  const [residentTab, setResidentTab] = useState<'dashboard' | 'bills_history' | 'building_expenses'>('dashboard');

  // Broadcasts filter state ('all', 'notice', 'appeal', 'announcement')
  const [broadcastFilter, setBroadcastFilter] = useState<'all' | 'notice' | 'appeal' | 'announcement'>('all');

  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCycleForInvoice, setSelectedCycleForInvoice] = useState(activeCycle);

  // Filter for historical building expenses tab
  const [selectedExpenseMonthKey, setSelectedExpenseMonthKey] = useState<string>(() => {
    return activeCycle?.monthKey || '2026-09';
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');

  // Change PIN state
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');

  // Find flat details
  const flat = flats.find((f) => f.id === currentSession?.flatId) || flats[0];
  const activeReading = activeCycle?.readings.find((r) => r.flatId === flat.id);

  // Current Month Key for active cycle
  const currentMonthKey = activeCycle?.monthKey || '2026-09';

  // Current Month Building Expenses (added by admin, excluding main government electricity bill)
  const currentMonthExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Exclude main government electricity bill - only display extra expenses
        if (exp.category === 'electricity_bill') return false;
        if (exp.monthKey) return exp.monthKey === currentMonthKey;
        if (exp.cycleId && activeCycle) return exp.cycleId === activeCycle.id;
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, currentMonthKey, activeCycle]);

  // Current month expenses total
  const currentMonthExpensesTotal = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [currentMonthExpenses]);

  // Historical / Filtered Expenses for the Building Expenses tab
  const historicalExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Month filter
        if (selectedExpenseMonthKey !== 'all') {
          const matchMonth = exp.monthKey === selectedExpenseMonthKey ||
            (exp.cycleId && cycles.find((c) => c.id === exp.cycleId)?.monthKey === selectedExpenseMonthKey);
          if (!matchMonth) return false;
        }

        // Category filter
        if (selectedCategoryFilter !== 'all' && exp.category !== selectedCategoryFilter) {
          return false;
        }

        // Search query
        if (expenseSearchQuery.trim()) {
          const query = expenseSearchQuery.toLowerCase();
          const matchTitle = exp.title.toLowerCase().includes(query);
          const matchPaidTo = exp.paidTo ? exp.paidTo.toLowerCase().includes(query) : false;
          const matchNotes = exp.notes ? exp.notes.toLowerCase().includes(query) : false;
          if (!matchTitle && !matchPaidTo && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedExpenseMonthKey, selectedCategoryFilter, expenseSearchQuery, cycles]);

  const historicalExpensesTotal = useMemo(() => {
    return historicalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [historicalExpenses]);

  // Get month label for the selected historical month
  const selectedHistoricalMonthName = useMemo(() => {
    if (selectedExpenseMonthKey === 'all') return 'All Months Combined';
    const cycleMatch = cycles.find((c) => c.monthKey === selectedExpenseMonthKey);
    if (cycleMatch) return cycleMatch.month;
    return selectedExpenseMonthKey;
  }, [selectedExpenseMonthKey, cycles]);

  // Active Society Broadcasts for Notice, Appeal & Announcement
  const activeBroadcasts = useMemo(() => {
    return (broadcasts || []).filter((b) => b.isActive !== false);
  }, [broadcasts]);

  const notices = useMemo(() => activeBroadcasts.filter((b) => b.category === 'notice'), [activeBroadcasts]);
  const appeals = useMemo(() => activeBroadcasts.filter((b) => b.category === 'appeal'), [activeBroadcasts]);
  const announcements = useMemo(() => activeBroadcasts.filter((b) => b.category === 'announcement'), [activeBroadcasts]);

  if (!activeReading || !activeCycle) {
    return (
      <div className="p-8 text-center text-slate-500">
        No active electricity bill found for this flat.
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Welcome & Flat Profile Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white font-black text-lg flex items-center justify-center shadow-xs">
            {flat.flatNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Flat {flat.flatNumber} • {flat.ownerName}
              </h2>
              {flat.customRatePerUnit && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Custom Rate: ₹{flat.customRatePerUnit}/u
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
              <span className="font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">{settings.buildingName}</span>
              <span>•</span>
              <span>Sub-Meter: <strong className="font-mono text-slate-700">{flat.meterNumber}</strong></span>
              <span>•</span>
              <span>{flat.floor === 0 ? 'Ground Floor' : `Floor ${flat.floor}`}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowChangePinModal(true);
              setCurrentPinInput('');
              setNewPinInput('');
              setConfirmPinInput('');
              setPinChangeError('');
              setPinChangeSuccess('');
            }}
            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Change your 4-digit login PIN"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Change PIN</span>
          </button>
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Billing Month</span>
            <span className="text-xs font-bold text-slate-800">{activeCycle.month}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Flat Owner */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold overflow-x-auto shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setResidentTab('dashboard')}
          className={`flex-1 py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            residentTab === 'dashboard'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-amber-600" />
          <span>Current Statement & Expenses</span>
        </button>

        <button
          type="button"
          onClick={() => setResidentTab('bills_history')}
          className={`flex-1 py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            residentTab === 'bills_history'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Previous Bills History ({cycles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setResidentTab('building_expenses')}
          className={`flex-1 py-2.5 px-3.5 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
            residentTab === 'building_expenses'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
          <span>Building Expenses ({expenses.length})</span>
        </button>
      </div>

      {/* TAB 1: MAIN DASHBOARD VIEW (Current Statement + Current Month Expenses) */}
      {residentTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Privacy & Data Isolation Indicator */}
          <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-950 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Confidential Resident Portal:</strong> You are logged into <strong>Flat {flat.flatNumber}</strong>. Only your personal meter consumption, breakdown, and payment history are visible to you.
              </span>
            </div>
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] bg-white border border-emerald-300 text-emerald-800 font-semibold px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
              🔒 Private View
            </span>
          </div>

          {/* Main Bill Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
            {/* Status ribbon */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Current Statement
                </span>
                <span className="text-xs font-medium text-slate-500">• Due: {activeCycle.dueDate}</span>
              </div>

              <div>
                {activeReading.paymentStatus === 'paid' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    PAID
                  </span>
                ) : activeReading.paymentStatus === 'partially_paid' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    PARTIALLY PAID
                  </span>
                ) : activeReading.paymentStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    VERIFICATION PENDING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    UNPAID
                  </span>
                )}
              </div>
            </div>

            {/* Amount & Units */}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Total Net Payable</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                    ₹{(activeReading.netPayableAmount ?? activeReading.totalBillAmount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    (@ ₹{activeReading.ratePerUnit.toFixed(2)}/unit)
                  </span>
                </div>
                {((activeReading.previousBalance ?? 0) > 0) && (
                  <span className="text-xs text-rose-600 font-semibold block mt-1">
                    Includes +₹{(activeReading.previousBalance ?? 0).toLocaleString('en-IN')} previous unpaid dues
                  </span>
                )}
                {((activeReading.previousBalance ?? 0) < 0) && (
                  <span className="text-xs text-emerald-600 font-semibold block mt-1">
                    Includes -₹{Math.abs(activeReading.previousBalance ?? 0).toLocaleString('en-IN')} advance credit deduction
                  </span>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 inline-flex items-center gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Units Consumed
                  </span>
                  <span className="text-lg font-black text-amber-600 font-mono">
                    {activeReading.unitsConsumed} <span className="text-xs font-normal text-slate-600">Units</span>
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-[11px] text-slate-500">
                  <div>Curr: <strong className="font-mono text-slate-800">{activeReading.currentReading}</strong></div>
                  <div>Prev: <span className="font-mono text-slate-600">{activeReading.previousReading}</span></div>
                </div>
              </div>
            </div>

            {/* Sub-Meter Calculation Details */}
            <div className="pt-3 pb-2 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Net Consumption: <strong>{activeReading.currentReading} - {activeReading.previousReading} = {activeReading.unitsConsumed} Units</strong>
                </span>
              </div>
              {flat.customRatePerUnit ? (
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                  Special Flat Rate: ₹{flat.customRatePerUnit}/unit applied
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  Rate: ₹{activeReading.ratePerUnit.toFixed(2)}/unit
                </span>
              )}
            </div>

            {/* Breakdown of Charges (Energy + Water & stairs + Cleaning + Previous Balance) */}
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-700">
                <span>Electricity / Energy Amount ({activeReading.unitsConsumed} Units)</span>
                <span className="font-semibold text-slate-900">₹{activeReading.calculatedAmount.toLocaleString('en-IN')}/-</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{activeReading.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light'}</span>
                <span className="font-semibold text-slate-900">₹{(activeReading.commonMeterCharges ?? settings.defaultCommonMeterCharges ?? 160).toLocaleString('en-IN')}/-</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{activeReading.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning'}</span>
                <span className="font-semibold text-slate-900">₹{(activeReading.maintenanceCharges ?? settings.defaultMaintenanceCharges ?? 110).toLocaleString('en-IN')}/-</span>
              </div>

              <div className="border-t border-slate-200 pt-1.5 flex justify-between text-slate-700 font-medium">
                <span>Current Month Total Bill:</span>
                <span className="font-bold text-slate-900">₹{activeReading.totalBillAmount.toLocaleString('en-IN')}/-</span>
              </div>

              {/* Previous Balance / Advance Carryover */}
              {(activeReading.previousBalance !== undefined && activeReading.previousBalance !== 0) && (
                <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-white border border-slate-200">
                  <span className="font-semibold text-slate-700">
                    {activeReading.previousBalance > 0
                      ? 'Previous Unpaid Dues (Carried forward):'
                      : 'Previous Advance Credit (Carried forward):'}
                  </span>
                  <span
                    className={`font-bold font-mono ${
                      activeReading.previousBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {activeReading.previousBalance > 0 ? '+' : '-'}₹
                    {Math.abs(activeReading.previousBalance).toLocaleString('en-IN')}/-
                  </span>
                </div>
              )}

              <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-sm text-slate-900">
                <span>Net Payable Amount:</span>
                <span className="text-emerald-700 text-base">
                  ₹{(activeReading.netPayableAmount ?? activeReading.totalBillAmount).toLocaleString('en-IN')}/-
                </span>
              </div>

              {/* If already partially or fully paid */}
              {activeReading.paidAmount !== undefined && activeReading.paidAmount > 0 && (
                <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Amount Paid:</span>
                    <span className="font-bold font-mono">₹{activeReading.paidAmount.toLocaleString('en-IN')}/-</span>
                  </div>
                  {activeReading.remainingBalance !== undefined && activeReading.remainingBalance > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded-md">
                      <span>Remaining Unpaid (Carries to next month):</span>
                      <span className="font-mono">₹{activeReading.remainingBalance.toLocaleString('en-IN')}/-</span>
                    </div>
                  )}
                  {activeReading.advancePaid !== undefined && activeReading.advancePaid > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md">
                      <span>Advance Credit (Will deduct from next month):</span>
                      <span className="font-mono">₹{activeReading.advancePaid.toLocaleString('en-IN')}/-</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              {activeReading.paymentStatus !== 'paid' && (
                <button
                  type="button"
                  onClick={() => setShowUpiModal(true)}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  Pay via UPI {settings.upiQrCodeUrl ? '(Scan Society QR)' : '(GPay / PhonePe)'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedCycleForInvoice(activeCycle);
                  setShowInvoiceModal(true);
                }}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                View Bill Receipt / PDF
              </button>
            </div>

            {activeReading.paymentStatus === 'paid' && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Paid on {activeReading.paidDate} via {activeReading.paymentMethod || 'UPI'}
                </span>
                {activeReading.upiReference && (
                  <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {activeReading.upiReference}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* CURRENT MONTH EXPENSES SECTION (Replaces previous bill history on the main page) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Current Month Building Expenses ({activeCycle.month})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct transparency of all expenditures recorded by society admin for {activeCycle.month} (stairs cleaning, sewer cleaning, electrician, repairs, broomstick, etc.).
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs text-slate-500 font-medium">Total Spent:</span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold font-mono text-sm rounded-lg border border-rose-200">
                  ₹{currentMonthExpensesTotal.toLocaleString('en-IN')}
                </span>
                <button
                  type="button"
                  onClick={() => setResidentTab('building_expenses')}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 ml-1 cursor-pointer"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {currentMonthExpenses.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No building expenses recorded yet for {activeCycle.month}.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Whenever the society admin adds an expenditure (e.g. stairs cleaning, sewer cleaning, broomstick), it will instantly display here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentMonthExpenses.map((expense) => {
                  const catConfig = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
                  return (
                    <div
                      key={expense.id}
                      className="p-3.5 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl ${catConfig.bg} ${catConfig.border} border flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          {catConfig.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {expense.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catConfig.bg} ${catConfig.color} border ${catConfig.border}`}
                            >
                              {catConfig.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                            <span>Date: <strong className="text-slate-700">{expense.date}</strong></span>
                            {expense.paidTo && (
                              <span>Paid to: <strong className="text-slate-700">{expense.paidTo}</strong></span>
                            )}
                            <span className="inline-flex items-center gap-1 bg-white px-1.5 py-0.2 rounded border border-slate-200 font-medium text-slate-600">
                              Method: {expense.paymentMethod}
                            </span>
                            {expense.receiptNumber && (
                              <span className="font-mono text-[10px] text-slate-500">
                                Ref: {expense.receiptNumber}
                              </span>
                            )}
                          </div>

                          {expense.notes && (
                            <p className="text-[11px] text-slate-600 mt-1 bg-white/80 p-1.5 rounded-lg border border-slate-200/70 italic">
                              "{expense.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pl-12 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <span className="text-xs text-slate-400 sm:hidden">Amount Paid:</span>
                        <div className="text-right">
                          <span className="font-black text-sm sm:text-base text-rose-700 font-mono">
                            ₹{expense.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 block sm:mt-0.5">Society Fund</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTIONS: NOTICE, APPEAL & ANNOUNCEMENT (Only rendered when there is active content) */}
          {activeBroadcasts.length > 0 && (() => {
            const hasNotices = notices.length > 0;
            const hasAppeals = appeals.length > 0;
            const hasAnnouncements = announcements.length > 0;
            const visibleCount = (hasNotices ? 1 : 0) + (hasAppeals ? 1 : 0) + (hasAnnouncements ? 1 : 0);

            // Determine effective filter
            const effectiveFilter =
              broadcastFilter === 'all'
                ? 'all'
                : (broadcastFilter === 'notice' && hasNotices)
                ? 'notice'
                : (broadcastFilter === 'appeal' && hasAppeals)
                ? 'appeal'
                : (broadcastFilter === 'announcement' && hasAnnouncements)
                ? 'announcement'
                : 'all';

            const gridClass =
              effectiveFilter !== 'all' || visibleCount === 1
                ? 'grid-cols-1'
                : visibleCount === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 lg:grid-cols-3';

            return (
              <div className="space-y-3 pt-2">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shrink-0">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Society Communications
                    </h3>
                  </div>

                  {/* Filter tabs only if more than 1 section has content */}
                  {visibleCount > 1 && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setBroadcastFilter('all')}
                        className={`py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                          effectiveFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All
                      </button>
                      {hasNotices && (
                        <button
                          type="button"
                          onClick={() => setBroadcastFilter('notice')}
                          className={`py-1 px-2.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                            effectiveFilter === 'notice'
                              ? 'bg-white text-blue-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Bell className="w-3 h-3 text-blue-600" />
                          Notice
                        </button>
                      )}
                      {hasAppeals && (
                        <button
                          type="button"
                          onClick={() => setBroadcastFilter('appeal')}
                          className={`py-1 px-2.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                            effectiveFilter === 'appeal'
                              ? 'bg-white text-amber-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <HeartHandshake className="w-3 h-3 text-amber-600" />
                          Appeal
                        </button>
                      )}
                      {hasAnnouncements && (
                        <button
                          type="button"
                          onClick={() => setBroadcastFilter('announcement')}
                          className={`py-1 px-2.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                            effectiveFilter === 'announcement'
                              ? 'bg-white text-emerald-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Megaphone className="w-3 h-3 text-emerald-600" />
                          Announcement
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Visible Content Cards - Only renders sections with active items */}
                <div className={`grid gap-4 ${gridClass}`}>
                  {/* NOTICE SECTION - Only shown if it has items */}
                  {hasNotices && (effectiveFilter === 'all' || effectiveFilter === 'notice') && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                      <div className="p-3 bg-blue-50/80 border-b border-blue-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                          Notice
                        </h4>
                      </div>

                      <div className="p-3.5 flex-1 space-y-3">
                        {notices.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all ${
                              item.priority === 'urgent'
                                ? 'bg-rose-50/60 border-rose-200 ring-1 ring-rose-300'
                                : item.priority === 'important'
                                ? 'bg-amber-50/40 border-amber-200'
                                : 'bg-slate-50/70 border-slate-200 hover:border-blue-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {item.date}
                              </span>
                              {item.priority === 'urgent' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                  Urgent
                                </span>
                              )}
                              {item.priority === 'important' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Important
                                </span>
                              )}
                            </div>

                            <h5 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                              {item.title}
                            </h5>

                            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {item.content}
                            </p>

                            {item.author && (
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center gap-1 text-[10px] text-slate-500">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>Issued By: <strong>{item.author}</strong></span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* APPEAL SECTION - Only shown if it has items */}
                  {hasAppeals && (effectiveFilter === 'all' || effectiveFilter === 'appeal') && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                      <div className="p-3 bg-amber-50/80 border-b border-amber-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <HeartHandshake className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Appeal
                        </h4>
                      </div>

                      <div className="p-3.5 flex-1 space-y-3">
                        {appeals.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all ${
                              item.priority === 'urgent'
                                ? 'bg-rose-50/60 border-rose-200 ring-1 ring-rose-300'
                                : item.priority === 'important'
                                ? 'bg-amber-50/40 border-amber-200'
                                : 'bg-slate-50/70 border-slate-200 hover:border-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {item.date}
                              </span>
                              {item.priority === 'urgent' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                  Urgent
                                </span>
                              )}
                              {item.priority === 'important' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Important
                                </span>
                              )}
                            </div>

                            <h5 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                              {item.title}
                            </h5>

                            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {item.content}
                            </p>

                            {item.author && (
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center gap-1 text-[10px] text-slate-500">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>By: <strong>{item.author}</strong></span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ANNOUNCEMENT SECTION - Only shown if it has items */}
                  {hasAnnouncements && (effectiveFilter === 'all' || effectiveFilter === 'announcement') && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                      <div className="p-3 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Megaphone className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Announcement
                        </h4>
                      </div>

                      <div className="p-3.5 flex-1 space-y-3">
                        {announcements.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all ${
                              item.priority === 'urgent'
                                ? 'bg-rose-50/60 border-rose-200 ring-1 ring-rose-300'
                                : item.priority === 'important'
                                ? 'bg-amber-50/40 border-amber-200'
                                : 'bg-slate-50/70 border-slate-200 hover:border-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {item.date}
                              </span>
                              {item.priority === 'urgent' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                  Urgent
                                </span>
                              )}
                              {item.priority === 'important' && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                  Important
                                </span>
                              )}
                            </div>

                            <h5 className="text-xs font-bold text-slate-900 mb-1 leading-snug">
                              {item.title}
                            </h5>

                            <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {item.content}
                            </p>

                            {item.author && (
                              <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center gap-1 text-[10px] text-slate-500">
                                <User className="w-3 h-3 text-slate-400" />
                                <span>By: <strong>{item.author}</strong></span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: PREVIOUS BILLS HISTORY TAB */}
      {residentTab === 'bills_history' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Previous Bills History
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete archive of your monthly sub-meter electricity bills, units consumed, and payment receipts for Flat {flat.flatNumber}.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg self-start sm:self-auto">
                {cycles.length} Total Billing Statements
              </span>
            </div>

            <div className="space-y-2.5">
              {cycles.map((c) => {
                const r = c.readings.find((entry) => entry.flatId === flat.id);
                if (!r) return null;
                const isCurrent = c.id === activeCycle.id;
                return (
                  <div
                    key={c.id}
                    className={`p-4 bg-slate-50 hover:bg-slate-100/70 border rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isCurrent ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                    }`}
                    onClick={() => {
                      setSelectedCycleForInvoice(c);
                      setShowInvoiceModal(true);
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{c.month}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Current Cycle
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : r.paymentStatus === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {r.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Meter Reading: <strong className="text-slate-700 font-mono">{r.previousReading}</strong> → <strong className="text-slate-700 font-mono">{r.currentReading}</strong> ({r.unitsConsumed} Units @ ₹{r.ratePerUnit}/unit)
                      </p>
                      {r.paidDate && (
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Paid on {r.paidDate} {r.paymentMethod ? `via ${r.paymentMethod}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="font-black text-sm sm:text-base text-slate-900 block font-mono">
                          ₹{r.totalBillAmount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-indigo-600 font-semibold hover:underline">
                          View Receipt
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEPARATE TAB FOR BUILDING EXPENSES (All previous months & current month expenses) */}
      {residentTab === 'building_expenses' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Building-Wide Expenses Archive
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transparent public audit log of all maintenance, electricity bills, stairs cleaning, sewer cleaning, and repairs paid from society funds.
                </p>
              </div>

              {/* Month Selector Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                  <select
                    value={selectedExpenseMonthKey}
                    onChange={(e) => setSelectedExpenseMonthKey(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Months</option>
                    {cycles.map((c) => (
                      <option key={c.id} value={c.monthKey}>
                        {c.month}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs font-bold font-mono">
                  Total: ₹{historicalExpensesTotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="mt-3.5 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={expenseSearchQuery}
                  onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  placeholder="Search cleaning, sewer, electrician, plumber, vendor..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-500 text-slate-900 placeholder-slate-400"
                />
                {expenseSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setExpenseSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Dropdown Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-emerald-500 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expenses List */}
            <div className="mt-4 space-y-2.5">
              {historicalExpenses.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No building expenses found matching your filter.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try selecting "All Months" or clearing your search term.
                  </p>
                </div>
              ) : (
                historicalExpenses.map((expense) => {
                  const catConfig = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
                  return (
                    <div
                      key={expense.id}
                      className="p-3.5 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl ${catConfig.bg} ${catConfig.border} border flex items-center justify-center shrink-0 mt-0.5`}
                        >
                          {catConfig.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                              {expense.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catConfig.bg} ${catConfig.color} border ${catConfig.border}`}
                            >
                              {catConfig.label}
                            </span>
                            {expense.monthKey && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                                {cycles.find((c) => c.monthKey === expense.monthKey)?.month || expense.monthKey}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                            <span>Date: <strong className="text-slate-700">{expense.date}</strong></span>
                            {expense.paidTo && (
                              <span>Paid to: <strong className="text-slate-700">{expense.paidTo}</strong></span>
                            )}
                            <span className="inline-flex items-center gap-1 bg-white px-1.5 py-0.2 rounded border border-slate-200 font-medium text-slate-600">
                              Method: {expense.paymentMethod}
                            </span>
                            {expense.receiptNumber && (
                              <span className="font-mono text-[10px] text-slate-500">
                                Ref: {expense.receiptNumber}
                              </span>
                            )}
                          </div>

                          {expense.notes && (
                            <p className="text-[11px] text-slate-600 mt-1 bg-white/80 p-1.5 rounded-lg border border-slate-200/70 italic">
                              "{expense.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pl-12 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <span className="text-xs text-slate-400 sm:hidden">Amount Paid:</span>
                        <div className="text-right">
                          <span className="font-black text-sm sm:text-base text-rose-700 font-mono">
                            ₹{expense.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 block sm:mt-0.5">Society Fund</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Free UPI Modal */}
      {showUpiModal && (
        <UpiPaymentModal
          isOpen={showUpiModal}
          onClose={() => setShowUpiModal(false)}
          reading={activeReading}
          monthName={activeCycle.month}
        />
      )}

      {/* Bill Invoice Modal */}
      {showInvoiceModal && selectedCycleForInvoice && (
        <BillInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          reading={
            selectedCycleForInvoice.readings.find((r) => r.flatId === flat.id) || activeReading
          }
          cycle={selectedCycleForInvoice}
        />
      )}

      {/* Change Security PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowChangePinModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Change Security PIN</h4>
                <p className="text-[11px] text-slate-500">Flat {flat.flatNumber} • {flat.ownerName}</p>
              </div>
            </div>

            {pinChangeError && (
              <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{pinChangeError}</span>
              </div>
            )}

            {pinChangeSuccess && (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>{pinChangeSuccess}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPinChangeError('');
                setPinChangeSuccess('');

                if (flat.pin && currentPinInput.trim() !== flat.pin) {
                  setPinChangeError('Current PIN is incorrect.');
                  return;
                }

                const cleanNew = newPinInput.trim();
                const cleanConfirm = confirmPinInput.trim();

                if (!/^\d{4,6}$/.test(cleanNew)) {
                  setPinChangeError('New PIN must be 4 to 6 digits.');
                  return;
                }

                if (cleanNew !== cleanConfirm) {
                  setPinChangeError('New PIN and confirmation PIN do not match.');
                  return;
                }

                await setFlatPin(flat.id, cleanNew);
                setPinChangeSuccess('Security PIN updated successfully!');
                setTimeout(() => setShowChangePinModal(false), 1500);
              }}
              className="space-y-3"
            >
              {flat.pin && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Current PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter current PIN"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-center tracking-widest text-slate-900 focus:bg-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter new 4-digit PIN"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-center tracking-widest text-slate-900 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Confirm New PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter new PIN"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-center tracking-widest text-slate-900 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
