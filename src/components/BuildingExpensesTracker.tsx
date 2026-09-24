import React, { useState, useMemo } from 'react';
import {
  IndianRupee,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Copy,
  Printer,
  Calendar,
  Filter,
  Zap,
  Wrench,
  Droplets,
  ShieldCheck,
  Check,
  Building,
  Sparkles,
  Search,
  X,
  CreditCard,
  Banknote,
  Sliders,
} from 'lucide-react';
import { useBuilding } from '../context/BuildingContext';
import { BuildingExpense, ExpenseCategory } from '../types';

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  electricity_bill: {
    label: 'Electricity Bill',
    icon: <Zap className="w-4 h-4 text-amber-600" />,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  house_cleaning: {
    label: 'House / Stairs Cleaning',
    icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  plumber: {
    label: 'Plumber Payment',
    icon: <Wrench className="w-4 h-4 text-blue-600" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  electrician: {
    label: 'Electrician Payment',
    icon: <Zap className="w-4 h-4 text-violet-600" />,
    color: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
  },
  sewer_cleaning: {
    label: 'Sewer & Drain Cleaning',
    icon: <Droplets className="w-4 h-4 text-cyan-600" />,
    color: 'text-cyan-700',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  water_tank_motor: {
    label: 'Water Tank & Motor Pump',
    icon: <Droplets className="w-4 h-4 text-teal-600" />,
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  security_guard: {
    label: 'Security / Guard',
    icon: <ShieldCheck className="w-4 h-4 text-indigo-600" />,
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  garbage_collection: {
    label: 'Garbage Collection',
    icon: <Trash2 className="w-4 h-4 text-stone-600" />,
    color: 'text-stone-700',
    bg: 'bg-stone-50',
    border: 'border-stone-200',
  },
  maintenance_repair: {
    label: 'Repairs & Maintenance',
    icon: <Wrench className="w-4 h-4 text-orange-600" />,
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  other: {
    label: 'Other / Miscellaneous',
    icon: <Receipt className="w-4 h-4 text-slate-600" />,
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
  },
};

export const BuildingExpensesTracker: React.FC = () => {
  const {
    settings,
    cycles,
    activeCycle,
    expenses,
    monthlyManualCollections,
    addExpense,
    updateExpense,
    deleteExpense,
    setMonthlyManualCollection,
  } = useBuilding();

  // Selected Month / Cycle
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    return activeCycle?.monthKey || '2026-09';
  });

  // Modal State for adding/editing expense
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('electricity_bill');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paidTo, setPaidTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Category Filter & Search in Table
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom / Override Collection Modal or Inline Toggle
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [customCollectionInput, setCustomCollectionInput] = useState<string>('');

  // Copy notification banner
  const [copiedMsg, setCopiedMsg] = useState('');

  // Identify the matching cycle for the selected month
  const targetCycle = useMemo(() => {
    return (
      cycles.find((c) => c.monthKey === selectedMonthKey) ||
      cycles.find((c) => c.month.toLowerCase().includes(selectedMonthKey.toLowerCase())) ||
      activeCycle
    );
  }, [cycles, selectedMonthKey, activeCycle]);

  // Selected Month Display Name
  const selectedMonthName = useMemo(() => {
    if (targetCycle?.month) return targetCycle.month;
    const [y, m] = selectedMonthKey.split('-');
    if (y && m) {
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }
    return selectedMonthKey;
  }, [targetCycle, selectedMonthKey]);

  // Filter expenses strictly for this month
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.cycleId && targetCycle && e.cycleId === targetCycle.id) return true;
      if (e.monthKey === selectedMonthKey) return true;
      if (e.date && e.date.startsWith(selectedMonthKey)) return true;
      return false;
    });
  }, [expenses, selectedMonthKey, targetCycle]);

  // Total Expenses for the month
  const totalMonthExpenses = useMemo(() => {
    return currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [currentMonthExpenses]);

  // Total Collections from individuals (flats) for this month:
  // 1. If secretary manually overrode/entered total collection, use that
  // 2. Otherwise, auto-sum the verified paid amounts from the flats in this cycle
  const autoCalculatedCollection = useMemo(() => {
    if (!targetCycle) return 0;
    return targetCycle.readings.reduce((sum, r) => {
      if (r.paymentStatus === 'paid' || r.paymentStatus === 'partially_paid') {
        return sum + (r.paidAmount !== undefined ? r.paidAmount : (r.netPayableAmount ?? r.totalBillAmount));
      }
      return sum;
    }, 0);
  }, [targetCycle]);

  const totalBilledToFlats = useMemo(() => {
    if (!targetCycle) return 0;
    return targetCycle.readings.reduce((sum, r) => sum + (r.netPayableAmount ?? r.totalBillAmount), 0);
  }, [targetCycle]);

  const paidFlatsCount = useMemo(() => {
    if (!targetCycle) return 0;
    return targetCycle.readings.filter((r) => r.paymentStatus === 'paid').length;
  }, [targetCycle]);

  const totalFlatsCount = useMemo(() => {
    return targetCycle?.readings.length || 15;
  }, [targetCycle]);

  // Active Effective Collection for calculation
  const manualCollectionVal = monthlyManualCollections[selectedMonthKey];
  const isUsingManualCollection = manualCollectionVal !== undefined && !isNaN(manualCollectionVal);
  const effectiveCollection = isUsingManualCollection ? manualCollectionVal : autoCalculatedCollection;

  // The Core Metric: Savings vs Spent Over From Pocket
  const netDifference = effectiveCollection - totalMonthExpenses;
  const isSurplus = netDifference >= 0;
  const netDifferenceAbs = Math.abs(netDifference);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    currentMonthExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([cat, total]) => ({
        category: cat,
        total,
        percentage: totalMonthExpenses > 0 ? (total / totalMonthExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentMonthExpenses, totalMonthExpenses]);

  // Filtered expenses list for search & category filter
  const displayedExpenses = useMemo(() => {
    return currentMonthExpenses.filter((e) => {
      const matchesCat = selectedCategoryFilter === 'all' || e.category === selectedCategoryFilter;
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [currentMonthExpenses, selectedCategoryFilter, searchQuery]);

  // Open modal for new expense
  const openNewExpenseModal = (presetCategory?: ExpenseCategory, presetTitle?: string, presetAmount?: number) => {
    setEditingExpenseId(null);
    setCategory(presetCategory || 'electricity_bill');
    setTitle(presetTitle || (presetCategory ? CATEGORY_CONFIG[presetCategory]?.label : ''));
    setAmount(presetAmount !== undefined && presetAmount > 0 ? String(presetAmount) : '');
    setDate(new Date().toISOString().split('T')[0]);
    setPaidTo('');
    setPaymentMethod('UPI');
    setReceiptNumber('');
    setNotes('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const openEditExpenseModal = (exp: BuildingExpense) => {
    setEditingExpenseId(exp.id);
    setCategory(exp.category);
    setTitle(exp.title);
    setAmount(String(exp.amount));
    setDate(exp.date);
    setPaidTo(exp.paidTo || '');
    setPaymentMethod(exp.paymentMethod);
    setReceiptNumber(exp.receiptNumber || '');
    setNotes(exp.notes || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!title.trim()) {
      setFormError('Please enter a description or title for the expenditure.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense amount in ₹.');
      return;
    }

    if (editingExpenseId) {
      updateExpense(editingExpenseId, {
        category,
        title: title.trim(),
        amount: numAmount,
        date,
        paidTo: paidTo.trim() || undefined,
        paymentMethod,
        receiptNumber: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addExpense({
        cycleId: targetCycle?.id,
        monthKey: selectedMonthKey,
        category,
        title: title.trim(),
        amount: numAmount,
        date,
        paidTo: paidTo.trim() || undefined,
        paymentMethod,
        receiptNumber: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  // Quick Preset Actions
  const handleAddMainElectricityBillPreset = () => {
    const mainBillAmt = targetCycle?.mainMeter?.mainMeterBillAmount || 14200;
    openNewExpenseModal(
      'electricity_bill',
      `${settings.electricityBoard || 'MSEDCL'} Main Govt Electricity Bill (${selectedMonthName})`,
      mainBillAmt
    );
  };

  const handleAddCleaningPreset = () => {
    const cleaningTotal = (settings.defaultMaintenanceCharges || 110) * 15;
    openNewExpenseModal(
      'house_cleaning',
      `Staircase & Building House Cleaning Payment (${selectedMonthName})`,
      cleaningTotal
    );
  };

  // WhatsApp Summary Formatter
  const generateWhatsAppSummary = () => {
    const header = `🏢 *${settings.buildingName.toUpperCase()}*\n📊 *Monthly Financial Report - ${selectedMonthName}*\n${'═'.repeat(30)}`;
    const collectionsText = `💰 *Total Collections from Flats:* ₹${effectiveCollection.toLocaleString('en-IN')}${
      !isUsingManualCollection ? ` (${paidFlatsCount}/${totalFlatsCount} Flats Paid)` : ' (Recorded by Secretary)'
    }`;
    const expensesHeader = `\n💸 *Total Expenditures Paid:* ₹${totalMonthExpenses.toLocaleString('en-IN')}`;

    const expenseLines = currentMonthExpenses
      .map((exp) => `  • ${exp.title}: ₹${exp.amount.toLocaleString('en-IN')} (${exp.paymentMethod})`)
      .join('\n');

    let outcomeText = '';
    if (isSurplus) {
      outcomeText = `\n${'─'.repeat(30)}\n🎉 *NET SAVINGS / SURPLUS (बचत): +₹${netDifferenceAbs.toLocaleString(
        'en-IN'
      )}*\n✅ Saved from individual collections and carried into society reserve fund!`;
    } else {
      outcomeText = `\n${'─'.repeat(30)}\n⚠️ *NET DEFICIT / OUT OF POCKET: -₹${netDifferenceAbs.toLocaleString(
        'en-IN'
      )}*\n⚠️ Society expenses exceeded collections by ₹${netDifferenceAbs.toLocaleString('en-IN')}.`;
    }

    const footer = `\n${'═'.repeat(30)}\n_Prepared by Society Secretary on ${new Date().toLocaleDateString('en-IN')}_`;

    return `${header}\n${collectionsText}\n${expensesHeader}\n${expenseLines || '  (No expenses recorded yet)'}\n${outcomeText}\n${footer}`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppSummary();
    navigator.clipboard.writeText(text);
    setCopiedMsg('WhatsApp summary copied to clipboard! You can paste it directly into your society WhatsApp group.');
    setTimeout(() => setCopiedMsg(''), 4000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="building-expenses-section">
      {/* Top Header & Month Selector */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
              <span>Building Expenses & Savings Accounting</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Monthly Expenditures & Balance Sheet
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Track building bills (electricity, plumber, cleaning, sewer, etc.), compare against individual collections,
              and see monthly savings or out-of-pocket spend.
            </p>
          </div>

          {/* Month Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-2 mr-1" />
              <select
                value={selectedMonthKey}
                onChange={(e) => setSelectedMonthKey(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none pr-3 py-1 cursor-pointer"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.monthKey}>
                    {c.month}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => openNewExpenseModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expenditure</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Copy WhatsApp formatted financial summary for society group"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp Summary</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="Print Monthly Expense & Balance Statement"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Copied Feedback Notification */}
        {copiedMsg && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{copiedMsg}</span>
          </div>
        )}
      </div>

      {/* PRIMARY SAVINGS VS SPENT OUT-OF-POCKET BALANCE SHEET */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Total Collections from Individuals */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                1. Total Collected from Individuals
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  ₹{effectiveCollection.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400 font-medium">collected</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Building className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Residents Paid Status:</span>
              <span className="font-bold text-slate-800">
                {paidFlatsCount} / {totalFlatsCount} Flats Paid
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-600">
              <span>Total Billed to Flats:</span>
              <span className="font-semibold text-slate-700">₹{totalBilledToFlats.toLocaleString('en-IN')}</span>
            </div>

            {/* Collection Mode Info & Override Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                {isUsingManualCollection ? (
                  <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                    <Sliders className="w-3 h-3" /> Manually specified
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto-sum of verified flat payments
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCustomCollectionInput(effectiveCollection > 0 ? String(effectiveCollection) : '');
                  setIsEditingCollection(!isEditingCollection);
                }}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                {isEditingCollection ? 'Close' : 'Adjust Amount'}
              </button>
            </div>

            {/* Inline Custom Collection Editor */}
            {isEditingCollection && (
              <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in">
                <label className="block text-[11px] font-bold text-slate-700">
                  Mention Exact Total Bill Collected (₹):
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={customCollectionInput === '0' ? '' : customCollectionInput}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setCustomCollectionInput(e.target.value)}
                      placeholder="e.g. 15400"
                      className="w-full pl-6 pr-2 py-1 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:outline-emerald-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(customCollectionInput);
                      if (!isNaN(val)) {
                        setMonthlyManualCollection(selectedMonthKey, val);
                        setIsEditingCollection(false);
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                  >
                    Save
                  </button>
                  {isUsingManualCollection && (
                    <button
                      type="button"
                      onClick={() => {
                        setMonthlyManualCollection(selectedMonthKey, undefined);
                        setIsEditingCollection(false);
                      }}
                      className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-800 underline cursor-pointer"
                      title="Reset back to auto-sum of verified flat payments"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Total Building Expenditures Paid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                2. Total Building Expenditures Paid
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-rose-700">
                  ₹{totalMonthExpenses.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-slate-400 font-medium">expenses</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Expenses Recorded:</span>
              <span className="font-bold text-slate-800">{currentMonthExpenses.length} entries</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Main Categories:</span>
              <span className="text-slate-700 font-medium">Electricity, Cleaning, Repairs</span>
            </div>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">For {selectedMonthName}</span>
              <button
                type="button"
                onClick={() => openNewExpenseModal()}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                + Add Expense
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: The Golden Result - SAVINGS or SPENT OVER FROM POCKET */}
        <div
          className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden flex flex-col justify-between transition-all ${
            isSurplus
              ? 'bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white border-emerald-300'
              : 'bg-gradient-to-br from-rose-50 via-amber-50/60 to-white border-rose-300'
          }`}
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span
                  className={`text-[11px] font-extrabold uppercase tracking-wider ${
                    isSurplus ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isSurplus ? '🎉 3. Saved From Collections (बचत)' : '⚠️ 3. Spent Over from Pocket (घाटा)'}
                </span>

                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-2xl sm:text-3xl font-black ${
                      isSurplus ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isSurplus ? '+' : '-'}₹{netDifferenceAbs.toLocaleString('en-IN')}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isSurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isSurplus ? 'Surplus' : 'Deficit'}
                  </span>
                </div>
              </div>

              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSurplus
                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-700'
                    : 'bg-rose-100 border border-rose-300 text-rose-700'
                }`}
              >
                {isSurplus ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-700">
              {isSurplus ? (
                <>
                  You collected <strong>₹{effectiveCollection.toLocaleString('en-IN')}</strong> and spent{' '}
                  <strong>₹{totalMonthExpenses.toLocaleString('en-IN')}</strong> in total building expenses.{' '}
                  <span className="font-bold text-emerald-800">
                    ₹{netDifferenceAbs.toLocaleString('en-IN')} remains saved in your society funds!
                  </span>
                </>
              ) : (
                <>
                  Building expenses (<strong>₹{totalMonthExpenses.toLocaleString('en-IN')}</strong>) exceeded
                  individual collections (<strong>₹{effectiveCollection.toLocaleString('en-IN')}</strong>).{' '}
                  <span className="font-bold text-rose-800">
                    ₹{netDifferenceAbs.toLocaleString('en-IN')} was paid extra over from your pocket!
                  </span>
                </>
              )}
            </p>
          </div>

          <div
            className={`mt-4 pt-3 border-t text-[11px] font-semibold flex items-center justify-between ${
              isSurplus ? 'border-emerald-200/80 text-emerald-800' : 'border-rose-200/80 text-rose-800'
            }`}
          >
            <span>
              {isSurplus
                ? 'Society Reserve Fund: Positive Growth'
                : `Action: Collect dues from ${totalFlatsCount - paidFlatsCount} remaining flats`}
            </span>
            <span className="underline cursor-pointer" onClick={handleCopyWhatsApp}>
              Share Report →
            </span>
          </div>
        </div>
      </div>

      {/* QUICK PRESETS: 1-CLICK ADD FREQUENT BUILDING EXPENDITURES */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick 1-Click Expenditure Templates ({selectedMonthName}):</span>
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Click any button to pre-fill and record instantly
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {/* Electricity Preset */}
          <button
            type="button"
            onClick={handleAddMainElectricityBillPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-800 hover:text-amber-900 text-xs font-semibold rounded-xl border border-slate-200 hover:border-amber-300 shadow-2xs transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>⚡ Main Electricity Bill (₹{targetCycle?.mainMeter?.mainMeterBillAmount || 14200})</span>
          </button>

          {/* Cleaning Preset */}
          <button
            type="button"
            onClick={handleAddCleaningPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 text-xs font-semibold rounded-xl border border-slate-200 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>🧹 House / Stairs Cleaning (₹{(settings.defaultMaintenanceCharges || 110) * 15})</span>
          </button>

          {/* Plumber Preset */}
          <button
            type="button"
            onClick={() =>
              openNewExpenseModal(
                'plumber',
                'Plumber Payment - Common Tap & Pipeline Maintenance',
                650
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-900 text-xs font-semibold rounded-xl border border-slate-200 hover:border-blue-300 shadow-2xs transition-all cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5 text-blue-500" />
            <span>🔧 Plumber Payment</span>
          </button>

          {/* Electrician Preset */}
          <button
            type="button"
            onClick={() =>
              openNewExpenseModal(
                'electrician',
                'Electrician Payment - Motor Wiring & Stair Lights',
                500
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-violet-50 text-slate-800 hover:text-violet-900 text-xs font-semibold rounded-xl border border-slate-200 hover:border-violet-300 shadow-2xs transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-violet-500" />
            <span>💡 Electrician Payment</span>
          </button>

          {/* Sewer Cleaning Preset */}
          <button
            type="button"
            onClick={() =>
              openNewExpenseModal(
                'sewer_cleaning',
                'Sewer & Drainage Line Chamber Cleaning',
                1000
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-cyan-50 text-slate-800 hover:text-cyan-900 text-xs font-semibold rounded-xl border border-slate-200 hover:border-cyan-300 shadow-2xs transition-all cursor-pointer"
          >
            <Droplets className="w-3.5 h-3.5 text-cyan-500" />
            <span>🕳️ Sewer Cleaning</span>
          </button>

          {/* Water Tank Motor Preset */}
          <button
            type="button"
            onClick={() =>
              openNewExpenseModal(
                'water_tank_motor',
                'Water Tank Cleaning & Motor Pump Servicing',
                1200
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 text-xs font-semibold rounded-xl border border-slate-200 hover:border-teal-300 shadow-2xs transition-all cursor-pointer"
          >
            <Droplets className="w-3.5 h-3.5 text-teal-500" />
            <span>💧 Water Tank & Motor</span>
          </button>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN VISUAL BARS (IF ANY EXPENSES) */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Expenditure Breakdown by Category ({selectedMonthName})
            </h3>
            <span className="text-xs font-bold text-slate-600">
              Total: ₹{totalMonthExpenses.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-2">
            {categoryBreakdown.map((item) => {
              const conf = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      {conf.icon}
                      <span>{conf.label}</span>
                    </span>
                    <span className="font-bold text-slate-900">
                      ₹{item.total.toLocaleString('en-IN')}{' '}
                      <span className="text-slate-400 font-normal">({item.percentage.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DETAILED EXPENDITURES TABLE & CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Search / Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Expenses List ({displayedExpenses.length})
            </h3>
            <span className="text-xs text-slate-400 font-medium">for {selectedMonthName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search expense..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-emerald-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <Filter className="w-3 h-3 text-slate-400 mr-1.5" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="electricity_bill">Electricity Bill</option>
                <option value="house_cleaning">House / Stairs Cleaning</option>
                <option value="plumber">Plumber Payment</option>
                <option value="electrician">Electrician Payment</option>
                <option value="sewer_cleaning">Sewer & Drain Cleaning</option>
                <option value="water_tank_motor">Water Tank & Motor</option>
                <option value="security_guard">Security Guard</option>
                <option value="garbage_collection">Garbage Collection</option>
                <option value="maintenance_repair">Repairs & Maintenance</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Title</th>
                <th className="py-3 px-4">Paid To</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {displayedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No expenditures recorded for {selectedMonthName}.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click "+ Add Expenditure" above or use one of the quick 1-click templates.
                    </p>
                  </td>
                </tr>
              ) : (
                displayedExpenses.map((exp) => {
                  const conf = CATEGORY_CONFIG[exp.category] || CATEGORY_CONFIG.other;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {exp.date}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${conf.bg} ${conf.color} ${conf.border}`}
                        >
                          {conf.icon}
                          <span>{conf.label}</span>
                        </span>
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{exp.title}</div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{exp.notes}</div>
                        )}
                        {exp.receiptNumber && (
                          <div className="text-[10px] font-mono text-slate-400">
                            Receipt: {exp.receiptNumber}
                          </div>
                        )}
                      </td>

                      {/* Paid To */}
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {exp.paidTo || <span className="text-slate-400 italic">Not specified</span>}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {exp.paymentMethod === 'Cash' ? (
                            <Banknote className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <CreditCard className="w-3 h-3 text-blue-600" />
                          )}
                          <span>{exp.paymentMethod}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-black text-sm text-slate-900">
                          ₹{exp.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditExpenseModal(exp)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Expenditure"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${exp.title}" (₹${exp.amount})?`)) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Expenditure"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Total */}
        {displayedExpenses.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Total Shown ({displayedExpenses.length} items):</span>
            <span className="text-base font-black text-slate-900">
              ₹{displayedExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* ADD / EDIT EXPENDITURE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingExpenseId ? 'Edit Expenditure' : 'Record New Expenditure'}
                  </h3>
                  <p className="text-xs text-slate-500">For {selectedMonthName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-4 sm:p-5 space-y-4">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expenditure Category *</label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as ExpenseCategory;
                    setCategory(newCat);
                    if (!editingExpenseId && (!title || Object.values(CATEGORY_CONFIG).some((c) => c.label === title))) {
                      setTitle(CATEGORY_CONFIG[newCat]?.label || '');
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                >
                  <option value="electricity_bill">⚡ Electricity Bill (Main Govt Meter)</option>
                  <option value="house_cleaning">🧹 House & Staircase Cleaning</option>
                  <option value="plumber">🔧 Plumber Payment (Pipeline, Taps, Tank)</option>
                  <option value="electrician">💡 Electrician Payment (Wiring, Lights, Motor)</option>
                  <option value="sewer_cleaning">🕳️ Sewer & Drainage Cleaning</option>
                  <option value="water_tank_motor">💧 Water Tank & Motor Pump Repair</option>
                  <option value="security_guard">🛡️ Security Guard / Chowkidar Salary</option>
                  <option value="garbage_collection">🗑️ Garbage Collection / Waste</option>
                  <option value="maintenance_repair">🛠️ General Maintenance & Repairs</option>
                  <option value="other">📝 Other / Miscellaneous</option>
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. MSEDCL Main Govt Electricity Bill, Ramesh Plumber pipe fix..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      min="1"
                      value={amount === '0' ? '' : amount}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 14200"
                      className="w-full pl-7 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date Paid *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Paid To & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Paid To (Vendor / Person)
                  </label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="e.g. Electricity Board, Ramesh Plumber..."
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Receipt / Invoice Number & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receipt / Bill Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="e.g. EB-98421 or Bill #104"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Common line replacement..."
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-emerald-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingExpenseId ? 'Save Changes' : 'Record Expenditure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
