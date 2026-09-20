import React, { useState } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { UpiPaymentModal } from './UpiPaymentModal';
import { BillInvoiceModal } from './BillInvoiceModal';
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
} from 'lucide-react';

export const ResidentDashboard: React.FC = () => {
  const { flats, activeCycle, cycles, currentSession, settings, setFlatPin } = useBuilding();

  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedCycleForInvoice, setSelectedCycleForInvoice] = useState(activeCycle);

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
              onClick={() => setShowUpiModal(true)}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Pay via UPI {settings.upiQrCodeUrl ? '(Scan Society QR)' : '(GPay / PhonePe)'}
            </button>
          )}

          <button
            onClick={() => {
              setSelectedCycleForInvoice(activeCycle);
              setShowInvoiceModal(true);
            }}
            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
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

      {/* Building Common Meter Transparency Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Building Main Meter Calculation Breakdown
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          Our building has 1 main meter for the entire building and sub-meters in each flat. Here is how this month's bill was computed:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block font-medium">Main Meter Bill</span>
            <span className="font-bold text-slate-900 text-sm">
              ₹{activeCycle.mainMeter.mainMeterBillAmount.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block font-medium">Main Meter Units</span>
            <span className="font-bold text-slate-900 text-sm">
              {activeCycle.mainMeter.mainMeterUnits} Units
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block font-medium">All 15 Flats Units</span>
            <span className="font-bold text-amber-600 text-sm">
              {activeCycle.totalSubMeterUnits} Units
            </span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block font-medium">Calculation Rule</span>
            <span className="font-semibold text-slate-700 text-xs">
              {activeCycle.calculationMode === 'proportional_main_bill'
                ? 'Proportional Bill Split'
                : 'Fixed Unit Rate'}
            </span>
          </div>
        </div>
      </div>

      {/* Bill History Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            Previous Bills History
          </h3>
          <span className="text-[11px] text-slate-400">{cycles.length} Statements</span>
        </div>

        <div className="space-y-2">
          {cycles.map((c) => {
            const r = c.readings.find((entry) => entry.flatId === flat.id);
            if (!r) return null;
            return (
              <div
                key={c.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedCycleForInvoice(c);
                  setShowInvoiceModal(true);
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{c.month}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        r.paymentStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Reading: {r.previousReading} → {r.currentReading} ({r.unitsConsumed} Units @ ₹{r.ratePerUnit}/u)
                  </p>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <span className="font-bold text-sm text-slate-900 block">
                      ₹{r.totalBillAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400">View Receipt</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
