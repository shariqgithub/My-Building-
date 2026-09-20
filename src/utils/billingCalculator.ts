import { FlatInfo, MainMeterBillInput, CalculationMode, FlatReadingEntry } from '../types';

export interface ComputeBillParams {
  flats: FlatInfo[];
  mainMeter: MainMeterBillInput;
  calculationMode: CalculationMode;
  defaultRatePerUnit: number;
  readings: Array<{
    flatId: string;
    previousReading: number;
    currentReading: number;
    maintenanceCharges?: number;
    maintenanceLabel?: string;
    commonMeterCharges?: number;
    commonMeterLabel?: string;
    previousBalance?: number;
    paidAmount?: number;
  }>;
}

export function computeMonthlyBills(params: ComputeBillParams): {
  flatReadings: FlatReadingEntry[];
  totalSubMeterUnits: number;
  effectiveRatePerUnit: number;
  totalBilledAmount: number;
} {
  const { flats, mainMeter, calculationMode, defaultRatePerUnit, readings } = params;

  // 1. Calculate units consumed and store manual charges for each flat
  const flatDataMap = new Map<
    string,
    {
      previous: number;
      current: number;
      units: number;
      maintenanceCharges: number;
      maintenanceLabel: string;
      commonMeterCharges: number;
      commonMeterLabel: string;
      previousBalance: number;
      paidAmount?: number;
    }
  >();
  let totalSubMeterUnits = 0;

  readings.forEach((r) => {
    const units = Math.max(0, r.currentReading - r.previousReading);
    flatDataMap.set(r.flatId, {
      previous: r.previousReading,
      current: r.currentReading,
      units,
      maintenanceCharges: r.maintenanceCharges ?? 110,
      maintenanceLabel: r.maintenanceLabel || 'Cleaning',
      commonMeterCharges: r.commonMeterCharges ?? 160,
      commonMeterLabel: r.commonMeterLabel || 'Water & stairs light',
      previousBalance: r.previousBalance ?? 0,
      paidAmount: r.paidAmount,
    });
    totalSubMeterUnits += units;
  });

  // 2. Determine rates and calculate amounts
  let effectiveRatePerUnit = defaultRatePerUnit;
  const flatReadings: FlatReadingEntry[] = [];
  let totalBilledAmount = 0;

  const buildEntry = (f: FlatInfo, rate: number): FlatReadingEntry => {
    const data = flatDataMap.get(f.id) || {
      previous: 0,
      current: 0,
      units: 0,
      maintenanceCharges: 110,
      maintenanceLabel: 'Cleaning',
      commonMeterCharges: 160,
      commonMeterLabel: 'Water & stairs light',
      previousBalance: 0,
    };
    const energyAmount = Math.round(data.units * rate);
    const totalBill = energyAmount + (data.maintenanceCharges || 0) + (data.commonMeterCharges || 0);
    const prevBal = data.previousBalance || 0;
    const netPayable = totalBill + prevBal;
    const paid = data.paidAmount;
    const remaining = paid !== undefined ? netPayable - paid : undefined;
    const advance = remaining !== undefined && remaining < 0 ? Math.abs(remaining) : 0;

    let status: 'paid' | 'unpaid' | 'pending' | 'partially_paid' = 'unpaid';
    if (paid !== undefined && paid > 0) {
      status = paid >= netPayable ? 'paid' : 'partially_paid';
    }

    totalBilledAmount += totalBill;

    return {
      flatId: f.id,
      flatNumber: f.flatNumber,
      previousReading: data.previous,
      currentReading: data.current,
      unitsConsumed: data.units,
      ratePerUnit: rate,
      calculatedAmount: energyAmount,
      commonShareAmount: data.commonMeterCharges || 0,
      maintenanceCharges: data.maintenanceCharges || 0,
      maintenanceLabel: data.maintenanceLabel || 'Cleaning',
      commonMeterCharges: data.commonMeterCharges || 0,
      commonMeterLabel: data.commonMeterLabel || 'Water & stairs light',
      totalBillAmount: totalBill,
      previousBalance: prevBal,
      netPayableAmount: netPayable,
      paidAmount: paid,
      remainingBalance: remaining,
      advancePaid: advance,
      paymentStatus: status,
    };
  };

  if (calculationMode === 'proportional_main_bill') {
    // Mode A: Dynamic Split from Main Meter Bill
    const customRateFlats = flats.filter((f) => f.customRatePerUnit !== undefined && f.customRatePerUnit > 0);
    const standardFlats = flats.filter((f) => f.customRatePerUnit === undefined || f.customRatePerUnit === 0);

    if (customRateFlats.length > 0 && standardFlats.length > 0) {
      let customBilledTotal = 0;
      let customUnitsTotal = 0;

      customRateFlats.forEach((f) => {
        const data = flatDataMap.get(f.id);
        const units = data ? data.units : 0;
        const rate = f.customRatePerUnit!;
        customBilledTotal += Math.round(units * rate);
        customUnitsTotal += units;
      });

      const remainingBill = Math.max(0, mainMeter.mainMeterBillAmount - customBilledTotal);
      const remainingUnits = Math.max(1, totalSubMeterUnits - customUnitsTotal);
      const standardRate = remainingUnits > 0 ? Number((remainingBill / remainingUnits).toFixed(2)) : defaultRatePerUnit;
      effectiveRatePerUnit = standardRate;

      flats.forEach((f) => {
        const rate = f.customRatePerUnit !== undefined && f.customRatePerUnit > 0 ? f.customRatePerUnit : standardRate;
        flatReadings.push(buildEntry(f, rate));
      });
    } else {
      const calculatedRate = totalSubMeterUnits > 0 
        ? Number((mainMeter.mainMeterBillAmount / totalSubMeterUnits).toFixed(2))
        : defaultRatePerUnit;
      effectiveRatePerUnit = calculatedRate;

      flats.forEach((f) => {
        flatReadings.push(buildEntry(f, calculatedRate));
      });
    }
  } else if (calculationMode === 'flat_specific') {
    flats.forEach((f) => {
      const rate = f.customRatePerUnit !== undefined && f.customRatePerUnit > 0 
        ? f.customRatePerUnit 
        : defaultRatePerUnit;
      flatReadings.push(buildEntry(f, rate));
    });
    effectiveRatePerUnit = defaultRatePerUnit;
  } else {
    // Mode B: Fixed Rate
    effectiveRatePerUnit = defaultRatePerUnit;
    flats.forEach((f) => {
      flatReadings.push(buildEntry(f, defaultRatePerUnit));
    });
  }

  // Sort flatReadings by flat number numerically
  flatReadings.sort((a, b) => parseInt(a.flatNumber, 10) - parseInt(b.flatNumber, 10));

  return {
    flatReadings,
    totalSubMeterUnits,
    effectiveRatePerUnit,
    totalBilledAmount,
  };
}

/**
 * Generate standard NPCI compliant UPI payment URL
 * Works across GPay, PhonePe, Paytm, BHIM, Cred, Amazon Pay
 */
export function generateUpiUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
}): string {
  const { upiId, payeeName, amount, transactionNote } = params;
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanNote = encodeURIComponent(transactionNote.trim());
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount.toFixed(2)}&cu=INR&tn=${cleanNote}`;
}

/**
 * Generate WhatsApp bill notification message matching user's exact required format:
 *
 * July 2026 Bill
 * *Nasir Bhai* *F-103*
 * Previous reading - *8966*
 * Current reading - *9525*
 * Total unit - *559*
 * Amount - *5031/-*
 * Water & stairs light - *160/-*
 * Cleaning - *110/-*
 * *Total amount - *5301/-*
 *
 * (Excludes amount per unit or other non-necessary details as requested)
 */
export function generateWhatsAppBillMessage(params: {
  month: string;
  flatNumber: string;
  ownerName: string;
  previousReading: number;
  currentReading: number;
  unitsConsumed: number;
  calculatedAmount: number;
  commonMeterCharges?: number;
  commonMeterLabel?: string;
  maintenanceCharges?: number;
  maintenanceLabel?: string;
  totalBillAmount: number;
  previousBalance?: number;
  netPayableAmount?: number;
}): string {
  const {
    month,
    flatNumber,
    ownerName,
    previousReading,
    currentReading,
    unitsConsumed,
    calculatedAmount,
    commonMeterCharges = 160,
    commonMeterLabel = 'Water & stairs light',
    maintenanceCharges = 110,
    maintenanceLabel = 'Cleaning',
    totalBillAmount,
    previousBalance = 0,
    netPayableAmount,
  } = params;

  // Format flat display e.g. "F-103"
  const flatDisplay = flatNumber.toUpperCase().startsWith('F-') ? flatNumber : `F-${flatNumber}`;

  // Lines for common area & maintenance
  const commonMeterLine = `${commonMeterLabel} - *${commonMeterCharges}/-*`;
  const maintenanceLine = `${maintenanceLabel} - *${maintenanceCharges}/-*`;

  const previousBalanceLine =
    previousBalance > 0
      ? `Previous unpaid dues - *+${previousBalance}/-*`
      : previousBalance < 0
      ? `Previous advance credit - *-₹${Math.abs(previousBalance)}/-*`
      : '';

  const netPayable = netPayableAmount ?? (totalBillAmount + previousBalance);
  const finalTotalLine =
    previousBalance !== 0
      ? `*Bill Total - *${totalBillAmount}/-*\n*Net Payable (after dues/advance) - *${netPayable}/-*`
      : `*Total amount - *${totalBillAmount}/-*`;

  return `${month} Bill
*${ownerName}* *${flatDisplay}*
Previous reading - *${previousReading}*
Current reading - *${currentReading}*
Total unit - *${unitsConsumed}*
Amount - *${calculatedAmount}/-*
${commonMeterLine}
${maintenanceLine}${previousBalanceLine ? `\n${previousBalanceLine}` : ''}
${finalTotalLine}`;
}

