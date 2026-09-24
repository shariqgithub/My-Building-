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
  Download,
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
  const { settings, flats, updateCycleDueDate, currentSession } = useBuilding();
  const [isEditingDueDate, setIsEditingDueDate] = React.useState(false);
  const [dueDateInput, setDueDateInput] = React.useState(cycle.dueDate || '');

  React.useEffect(() => {
    setDueDateInput(cycle.dueDate || '');
  }, [cycle.dueDate]);

  if (!isOpen) return null;

  const flat = flats.find((f) => f.id === reading.flatId || f.flatNumber === reading.flatNumber);
  const isAdmin = currentSession?.role === 'admin';

  // Strict custom rate enforcement: if flat has special rate (e.g. 6 rs/unit for 101, 102, 103), always calculate with it
  const effectiveRate =
    flat?.customRatePerUnit !== undefined && flat.customRatePerUnit > 0
      ? flat.customRatePerUnit
      : reading.ratePerUnit;
  const effectiveEnergyAmount =
    flat?.customRatePerUnit !== undefined && flat.customRatePerUnit > 0
      ? Math.round(reading.unitsConsumed * flat.customRatePerUnit)
      : (reading.calculatedAmount ?? Math.round(reading.unitsConsumed * effectiveRate));

  const isShopUnit = (flat?.flatNumber || reading.flatNumber || '').toLowerCase().includes('shop') || (flat?.id || reading.flatId || '').toLowerCase().includes('shop');
  const commonChg = reading.commonMeterCharges !== undefined ? reading.commonMeterCharges : (isShopUnit ? 0 : (settings.defaultCommonMeterCharges ?? 160));
  const maintChg = reading.maintenanceCharges !== undefined ? reading.maintenanceCharges : (isShopUnit ? 0 : (settings.defaultMaintenanceCharges ?? 110));

  let customSum = 0;
  if (reading.customCharges) {
    Object.values(reading.customCharges).forEach((val) => {
      customSum += Number(val) || 0;
    });
  }

  const effectiveTotalBill = effectiveEnergyAmount + commonChg + maintChg + customSum;
  const pendingAmt = reading.pendingAmount ?? 0;
  const advanceAmt = reading.advanceAmount ?? 0;
  const effectiveNetPayable = Math.max(0, effectiveTotalBill + pendingAmt - advanceAmt);

  // Generate clean, self-contained HTML for printing and downloading
  const generatePrintableHtml = () => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Electricity Sub-Meter Bill - Flat ${reading.flatNumber} - ${cycle.month}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { padding: 32px 24px; color: #0f172a; background: #fff; font-size: 13px; line-height: 1.5; max-width: 600px; margin: 0 auto; }
    .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #64748b; }
    .meta-box { text-align: right; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; margin-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 16px; }
    .grid-label { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px; }
    .grid-val { font-weight: 700; color: #1e293b; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .table th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 1px solid #cbd5e1; }
    .table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    .charges-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
    .charge-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; color: #334155; }
    .total-row { display: flex; justify-content: space-between; padding-top: 8px; margin-top: 6px; border-top: 2px solid #f59e0b; font-size: 15px; font-weight: 800; color: #78350f; }
    .status-paid { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 6px; padding: 8px 12px; font-weight: 700; font-size: 12px; margin-bottom: 16px; text-align: center; }
    .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print {
      body { padding: 10mm; max-width: 100%; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${settings.buildingName}</div>
      <div class="subtitle">${settings.address}</div>
      <div class="subtitle">Main Meter: ${settings.commonMeterNumber} | ${settings.electricityBoard}</div>
    </div>
    <div class="meta-box">
      <div class="badge">${cycle.month}</div>
      <div style="font-size: 11px; color: #64748b;">Bill Date: ${cycle.generatedDate}</div>
      ${cycle.dueDate ? `<div style="font-size: 11px; color: #b45309; font-weight: 600;">Due: ${cycle.dueDate}</div>` : ''}
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="grid-label">Flat / Shop Information</div>
      <div class="grid-val">${reading.flatNumber.toLowerCase().includes('shop') ? reading.flatNumber : `Flat ${reading.flatNumber}`}</div>
      <div style="color: #475569; font-size: 12px;">${flat?.ownerName || `Resident`}</div>
      <div style="color: #64748b; font-size: 11px;">+91 ${flat?.phone || ''}</div>
    </div>
    <div>
      <div class="grid-label">Sub-Meter Number</div>
      <div class="grid-val">${flat?.meterNumber || `SUB-${reading.flatNumber}`}</div>
      <div style="color: #475569; font-size: 12px;">Floor: ${flat?.floor ?? 1}</div>
      <div style="font-size: 11px; font-weight: 700; color: ${reading.paymentStatus === 'paid' ? '#059669' : '#e11d48'};">
        STATUS: ${reading.paymentStatus.toUpperCase()}
      </div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Prev Reading</th>
        <th>Curr Reading</th>
        <th style="text-align: center;">Units Consumed</th>
        <th style="text-align: right;">Rate / Unit</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${reading.previousReading}</td>
        <td>${reading.currentReading}</td>
        <td style="text-align: center; font-weight: 700;">${reading.unitsConsumed} Units</td>
        <td style="text-align: right;">₹${effectiveRate}/unit</td>
        <td style="text-align: right; font-weight: 700;">₹${effectiveEnergyAmount.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="charges-box">
    <div class="charge-row">
      <span>Electricity / Energy (${reading.unitsConsumed} units @ ₹${effectiveRate}/u):</span>
      <span style="font-weight: 600;">₹${effectiveEnergyAmount.toLocaleString('en-IN')}/-</span>
    </div>
    ${commonChg > 0 ? `<div class="charge-row">
      <span>${reading.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light'}:</span>
      <span style="font-weight: 600;">₹${commonChg.toLocaleString('en-IN')}/-</span>
    </div>` : ''}
    ${maintChg > 0 ? `<div class="charge-row">
      <span>${reading.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning'}:</span>
      <span style="font-weight: 600;">₹${maintChg.toLocaleString('en-IN')}/-</span>
    </div>` : ''}
    ${cycle.customColumns?.map(col => {
      const val = reading.customCharges?.[col.id] ?? reading.customCharges?.[col.name] ?? col.defaultAmount ?? 0;
      return `<div class="charge-row"><span>${col.name}:</span><span style="font-weight: 600;">₹${Number(val).toLocaleString('en-IN')}/-</span></div>`;
    }).join('') || ''}
    ${pendingAmt > 0 ? `<div class="charge-row" style="color: #e11d48; font-weight: 600;"><span>Pending / Unpaid Carry-Forward:</span><span>+₹${pendingAmt.toLocaleString('en-IN')}/-</span></div>` : ''}
    ${advanceAmt > 0 ? `<div class="charge-row" style="color: #059669; font-weight: 600;"><span>Advance Paid Credit Deducted:</span><span>-₹${advanceAmt.toLocaleString('en-IN')}/-</span></div>` : ''}
    <div class="total-row">
      <span>Net Payable Amount:</span>
      <span>₹${effectiveNetPayable.toLocaleString('en-IN')}/-</span>
    </div>
    ${reading.paidAmount !== undefined && reading.paidAmount > 0 ? `
    <div class="charge-row" style="margin-top: 6px; color: #065f46; font-weight: 700;">
      <span>Amount Paid:</span>
      <span>₹${reading.paidAmount.toLocaleString('en-IN')}/-</span>
    </div>` : ''}
  </div>

  ${reading.paymentStatus === 'paid' ? `
  <div class="status-paid">
    ✔ PAYMENT RECEIVED IN FULL ${reading.paidDate ? `• ${reading.paidDate}` : ''} ${reading.upiReference ? `(Ref: ${reading.upiReference})` : ''}
  </div>` : ''}

  <div class="footer">
    This is an official computer-generated sub-meter electricity bill for ${settings.buildingName}.
  </div>
</body>
</html>`;
  };

  const handlePrint = () => {
    try {
      let printFrame = document.getElementById('receipt-print-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.id = 'receipt-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
      }

      const html = generatePrintableHtml();
      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(html);
        frameDoc.close();

        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            window.print();
          }
        }, 250);
        return;
      }
    } catch {
      // Fallback
    }
    window.print();
  };

  const handleDownloadReceipt = () => {
    const html = generatePrintableHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bill_Flat_${reading.flatNumber}_${cycle.month.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppBillMessage({
      month: cycle.month,
      dueDate: cycle.dueDate,
      flatNumber: reading.flatNumber,
      ownerName: flat?.ownerName || `Flat ${reading.flatNumber} Owner`,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      unitsConsumed: reading.unitsConsumed,
      calculatedAmount: effectiveEnergyAmount,
      commonMeterCharges: commonChg,
      commonMeterLabel: reading.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light',
      maintenanceCharges: maintChg,
      maintenanceLabel: reading.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning',
      customColumns: cycle.customColumns,
      customCharges: reading.customCharges,
      totalBillAmount: effectiveTotalBill,
      pendingAmount: pendingAmt,
      advanceAmount: advanceAmt,
      previousBalance: reading.previousBalance,
      netPayableAmount: effectiveNetPayable,
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
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Print receipt or save as PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadReceipt}
              className="p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Download bill receipt (.html)"
            >
              <Download className="w-4 h-4" />
            </button>
            {/* Share to WhatsApp is strictly restricted to Admin only */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                title="Share Bill via WhatsApp (Admin Only)"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
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
              <div className="mt-1">
                {isEditingDueDate ? (
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="date"
                      value={dueDateInput}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      className="text-[11px] font-bold text-slate-800 border border-amber-300 rounded px-1.5 py-0.5 bg-white shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (dueDateInput && cycle.id) {
                          updateCycleDueDate(cycle.id, dueDateInput);
                          setIsEditingDueDate(false);
                        }
                      }}
                      className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDueDateInput(cycle.dueDate || '');
                        setIsEditingDueDate(false);
                      }}
                      className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] rounded"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span
                    onClick={() => setIsEditingDueDate(true)}
                    className="text-[11px] font-semibold text-rose-600 block cursor-pointer hover:underline"
                    title="Click to change payment due date"
                  >
                    Due Date: {cycle.dueDate} ✏️
                  </span>
                )}
              </div>
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
                  <th className="p-2.5 font-semibold text-right">Rate / Unit</th>
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
                  <td className="p-2.5 text-right font-semibold text-emerald-700">
                    ₹{effectiveRate}/u
                  </td>
                  <td className="p-2.5 text-right font-bold text-slate-900">
                    ₹{effectiveEnergyAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bill Calculation Explanation */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
            <div className="flex justify-between font-medium text-amber-950">
              <span>
                Energy Charges ({reading.unitsConsumed} units @ ₹{effectiveRate}/unit)
                {flat?.customRatePerUnit && (
                  <span className="ml-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                    Special Rate ₹{flat.customRatePerUnit}/u
                  </span>
                )}
              </span>
              <span className="font-bold">₹{effectiveEnergyAmount.toLocaleString('en-IN')}/-</span>
            </div>
            {commonChg > 0 && (
              <div className="flex justify-between text-slate-700 text-xs">
                <span>{reading.commonMeterLabel || settings.defaultCommonMeterLabel || 'Water & stairs light'}</span>
                <span className="font-semibold">₹{commonChg.toLocaleString('en-IN')}/-</span>
              </div>
            )}
            {maintChg > 0 && (
              <div className="flex justify-between text-slate-700 text-xs">
                <span>{reading.maintenanceLabel || settings.defaultMaintenanceLabel || 'Cleaning'}</span>
                <span className="font-semibold">₹{maintChg.toLocaleString('en-IN')}/-</span>
              </div>
            )}

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
              <span className="font-bold">₹{effectiveTotalBill.toLocaleString('en-IN')}/-</span>
            </div>

            {/* Pending Amount from Previous Month */}
            {reading.pendingAmount !== undefined && reading.pendingAmount > 0 && (
              <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="font-semibold text-rose-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  Pending Amount (Previous Month Dues Added):
                </span>
                <span className="font-bold font-mono text-rose-700">
                  +₹{reading.pendingAmount.toLocaleString('en-IN')}/-
                </span>
              </div>
            )}

            {/* Advance Amount Deduction */}
            {reading.advanceAmount !== undefined && reading.advanceAmount > 0 && (
              <div className="flex justify-between items-center py-1.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Advance Amount (Credit Deduction):
                </span>
                <span className="font-bold font-mono text-emerald-700">
                  -₹{reading.advanceAmount.toLocaleString('en-IN')}/-
                </span>
              </div>
            )}

            {/* Fallback to previousBalance if pending/advance not explicitly set */}
            {reading.pendingAmount === undefined && reading.advanceAmount === undefined && (reading.previousBalance !== undefined && reading.previousBalance !== 0) && (
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
                ₹{effectiveNetPayable.toLocaleString('en-IN')}/-
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
        <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-slate-100 print:hidden">
          {/* Send on WhatsApp is ONLY visible to Admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Send on WhatsApp
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            className={`${isAdmin ? 'py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700' : 'flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white shadow-xs'} font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer`}
            title="Print receipt or save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Download formatted receipt file"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
