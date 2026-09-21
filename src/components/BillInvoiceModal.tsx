import React from 'react';
import { useBuilding } from '../context/BuildingContext';
import { FlatReadingEntry, BillingCycle } from '../types';
import { generateWhatsAppBillMessage } from '../utils/billingCalculator';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Building2,
  Calendar,
} from 'lucide-react';

interface BillInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  reading: FlatReadingEntry;
  cycle: BillingCycle;
}

export const BillInvoiceModal: React.FC<BillInvoiceModalProps> = ({
  isOpen,
  onClose,
  reading,
  cycle,
}) => {
  const { settings, flats } = useBuilding();

  if (!isOpen) return null;

  const flat = flats.find((f) => f.id === reading.flatId);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppBillMessage({
      month: cycle.month,
      flatNumber: reading.flatNumber,
      ownerName: flat?.ownerName || `Flat ${reading.flatNumber} Owner`,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      unitsConsumed: reading.unitsConsumed,
      calculatedAmount: reading.calculatedAmount,
      commonMeterCharges: reading.commonMeterCharges ?? settings.defaultCommonMeterCharges ?? 160,
      commonMeterLabel: reading.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light',
      maintenanceCharges: reading.maintenanceCharges ?? settings.defaultMaintenanceCharges ?? 110,
      maintenanceLabel: reading.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning',
      customColumns: cycle.customColumns,
      customCharges: reading.customCharges,
      totalBillAmount: reading.totalBillAmount,
      previousBalance: reading.previousBalance,
      netPayableAmount: reading.netPayableAmount,
    });

    const phone = flat?.phone.replace(/\D/g, '') || '';
    const url = phone.length === 10
      ? `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-500" />
            Official Electricity Sub-Meter Bill
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
              title="Share Bill via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* INVOICE CONTENT */}
        <div id="printable-bill" className="pt-4 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-5 h-5 text-amber-500" />
                {settings.buildingName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{settings.address}</p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Main Meter: {settings.commonMeterNumber} | {settings.electricityBoard}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 block mb-1">
                {cycle.month}
              </span>
              <span className="text-[11px] text-slate-400 block">
                Bill Date: {cycle.generatedDate}
              </span>
              <span className="text-[11px] font-semibold text-rose-600 block">
                Due Date: {cycle.dueDate}
              </span>
            </div>
          </div>

          {/* Consumer Details */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Flat Details</span>
              <p className="font-bold text-slate-900 text-sm">Flat No. {reading.flatNumber}</p>
              <p className="text-slate-600 font-medium">{flat?.ownerName}</p>
              <p className="text-slate-500 font-mono text-[11px]">+91 {flat?.phone}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sub-Meter Info</span>
              <p className="font-mono text-slate-700 font-medium">{flat?.meterNumber || `SUB-${reading.flatNumber}`}</p>
              <p className="text-slate-500 text-[11px]">
                Floor:{' '}
                {flat?.floor === 0
                  ? 'Ground Floor'
                  : `${flat?.floor ?? 1}${
                      flat?.floor === 1 ? 'st' : flat?.floor === 2 ? 'nd' : flat?.floor === 3 ? 'rd' : 'th'
                    } Floor`}
              </p>
              <div className="mt-1">
                {reading.paymentStatus === 'paid' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> PAID
                  </span>
                ) : reading.paymentStatus === 'pending' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3" /> PENDING VERIFICATION
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> UNPAID
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meter Readings Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="p-2.5 font-semibold">Previous</th>
                  <th className="p-2.5 font-semibold">Current</th>
                  <th className="p-2.5 font-semibold text-center">Units Consumed</th>
                  <th className="p-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="p-2.5 font-mono">{reading.previousReading}</td>
                  <td className="p-2.5 font-mono">{reading.currentReading}</td>
                  <td className="p-2.5 text-center font-bold text-slate-900">
                    {reading.unitsConsumed} Units
                  </td>
                  <td className="p-2.5 text-right font-bold text-slate-900">
                    ₹{reading.calculatedAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bill Calculation Explanation */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between font-medium text-amber-950">
              <span>Energy Charges ({reading.unitsConsumed} units)</span>
              <span>₹{reading.calculatedAmount.toLocaleString('en-IN')}/-</span>
            </div>
            <div className="flex justify-between text-slate-700 text-xs">
              <span>{reading.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light'}</span>
              <span className="font-semibold">₹{(reading.commonMeterCharges ?? settings.defaultCommonMeterCharges ?? 160).toLocaleString('en-IN')}/-</span>
            </div>
            <div className="flex justify-between text-slate-700 text-xs">
              <span>{reading.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning'}</span>
              <span className="font-semibold">₹{(reading.maintenanceCharges ?? settings.defaultMaintenanceCharges ?? 110).toLocaleString('en-IN')}/-</span>
            </div>

            {/* Custom Fee Columns */}
            {cycle.customColumns && cycle.customColumns.length > 0 &&
              cycle.customColumns.map((col) => {
                const amount =
                  reading.customCharges?.[col.id] ??
                  reading.customCharges?.[col.name] ??
                  col.defaultAmount ??
                  0;
                return (
                  <div key={col.id} className="flex justify-between text-slate-700 text-xs">
                    <span>{col.name}</span>
                    <span className="font-semibold">₹{Number(amount).toLocaleString('en-IN')}/-</span>
                  </div>
                );
              })}

            {/* Additional Custom Charges */}
            {reading.customCharges &&
              Object.entries(reading.customCharges).map(([key, val]) => {
                if (cycle.customColumns?.some((c) => c.id === key || c.name === key)) return null;
                return (
                  <div key={key} className="flex justify-between text-slate-700 text-xs">
                    <span>{key}</span>
                    <span className="font-semibold">₹{Number(val).toLocaleString('en-IN')}/-</span>
                  </div>
                );
              })}

            <div className="border-t border-amber-200/80 pt-1.5 flex justify-between text-slate-800">
              <span>Current Month Total Bill:</span>
              <span className="font-bold">₹{reading.totalBillAmount.toLocaleString('en-IN')}/-</span>
            </div>

            {(reading.previousBalance !== undefined && reading.previousBalance !== 0) && (
              <div className="flex justify-between items-center py-1 px-2 rounded-lg bg-white border border-amber-200">
                <span className="font-semibold text-slate-700">
                  {reading.previousBalance > 0
                    ? 'Previous Unpaid Dues (Carried forward):'
                    : 'Previous Advance Credit (Carried forward):'}
                </span>
                <span
                  className={`font-bold font-mono ${
                    reading.previousBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {reading.previousBalance > 0 ? '+' : '-'}₹
                  {Math.abs(reading.previousBalance).toLocaleString('en-IN')}/-
                </span>
              </div>
            )}

            <div className="border-t-2 border-amber-300 pt-1.5 flex justify-between font-extrabold text-sm text-slate-900">
              <span>Net Payable Amount:</span>
              <span className="text-amber-900 text-base">
                ₹{(reading.netPayableAmount ?? reading.totalBillAmount).toLocaleString('en-IN')}/-
              </span>
            </div>

            {reading.paidAmount !== undefined && reading.paidAmount > 0 && (
              <div className="pt-1.5 border-t border-dashed border-amber-300 space-y-1">
                <div className="flex justify-between text-emerald-800 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">₹{reading.paidAmount.toLocaleString('en-IN')}/-</span>
                </div>
                {reading.remainingBalance !== undefined && reading.remainingBalance > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded">
                    <span>Remaining Balance (Will carry to next month):</span>
                    <span className="font-mono">₹{reading.remainingBalance.toLocaleString('en-IN')}/-</span>
                  </div>
                )}
                {reading.advancePaid !== undefined && reading.advancePaid > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    <span>Advance Credit (Will deduct from next month):</span>
                    <span className="font-mono">₹{reading.advancePaid.toLocaleString('en-IN')}/-</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Status Info (Shown when payment is confirmed) */}
          {reading.paymentStatus === 'paid' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-0.5 text-emerald-900">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Payment Received in Full
              </div>
              <p className="text-[11px]">
                Paid Date: <span className="font-semibold">{reading.paidDate || cycle.generatedDate}</span> | Mode: <span className="font-semibold">{reading.paymentMethod || 'UPI'}</span>
              </p>
              {reading.upiReference && (
                <p className="text-[11px] font-mono">
                  Ref/UTR: <span className="font-bold">{reading.upiReference}</span>
                </p>
              )}
            </div>
          )}

          {/* Footer Note */}
          <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-slate-100">
            This is a computer generated sub-meter billing statement for {settings.buildingName}.
          </div>
        </div>

        {/* Action Buttons (Hidden when printing) */}
        <div className="flex gap-2.5 pt-4 mt-4 border-t border-slate-100 print:hidden">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            Send on WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  );
};
