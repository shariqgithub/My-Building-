import React, { useState, useEffect } from 'react';
import { FlatInfo } from '../types';
import { X, Check, Building2, User, Phone, Zap, Hash, KeyRound } from 'lucide-react';

interface EditFlatModalProps {
  flat: FlatInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (flatId: string, updates: Partial<FlatInfo>) => void;
}

export const EditFlatModal: React.FC<EditFlatModalProps> = ({
  flat,
  isOpen,
  onClose,
  onSave,
}) => {
  const [flatNumber, setFlatNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [floor, setFloor] = useState<number>(0);
  const [customRate, setCustomRate] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (flat) {
      setFlatNumber(flat.flatNumber);
      setOwnerName(flat.ownerName);
      setPhone(flat.phone);
      setMeterNumber(flat.meterNumber);
      setFloor(flat.floor !== undefined ? flat.floor : 0);
      setCustomRate(flat.customRatePerUnit !== undefined ? String(flat.customRatePerUnit) : '');
      setPin(flat.pin || '');
      setError('');
    }
  }, [flat]);

  if (!isOpen || !flat) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFlatNum = flatNumber.trim();
    const cleanName = ownerName.trim();
    const cleanPhone = phone.replace(/\D/g, '');

    if (!cleanFlatNum) {
      setError('Flat number cannot be empty.');
      return;
    }

    if (!cleanName) {
      setError('Resident/Owner name cannot be empty.');
      return;
    }

    if (cleanPhone.length !== 10) {
      setError('Phone number must be exactly 10 digits (e.g. 9820123456).');
      return;
    }

    const parsedFloor = Number(floor);
    const cleanFloor = isNaN(parsedFloor) ? 0 : Math.max(0, parsedFloor);

    const cleanPin = pin.trim();
    if (cleanPin && !/^\d{4,6}$/.test(cleanPin)) {
      setError('PIN must be 4 to 6 digits (numbers only) or left blank to clear.');
      return;
    }

    const updates: Partial<FlatInfo> = {
      flatNumber: cleanFlatNum,
      ownerName: cleanName,
      phone: cleanPhone,
      meterNumber: meterNumber.trim() || `SM-${cleanFlatNum}`,
      floor: cleanFloor,
      customRatePerUnit: customRate.trim() ? Number(customRate) : undefined,
      pin: cleanPin || undefined,
    };

    onSave(flat.id, updates);
    onClose();
  };

  return (
    <div
      id="edit-flat-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="edit-flat-modal-container"
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-none">
                Edit Flat Details • {flat.flatNumber}
              </h3>
              <p className="text-[11px] text-amber-100 mt-0.5">
                Update flat number, resident name, and mobile number
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Flat Number & Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-amber-600" />
                Flat Number *
              </label>
              <input
                type="text"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                placeholder="e.g. 101, F-103"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Displayed on bills & invoices</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Floor *</label>
              <select
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              >
                <option value={0}>Ground Floor (0)</option>
                <option value={1}>1st Floor</option>
                <option value={2}>2nd Floor</option>
                <option value={3}>3rd Floor</option>
                <option value={4}>4th Floor</option>
                <option value={5}>5th Floor</option>
                <option value={6}>6th Floor</option>
                <option value={7}>7th Floor</option>
                <option value={8}>8th Floor</option>
                <option value={9}>9th Floor</option>
                <option value={10}>10th Floor</option>
                <option value={11}>11th Floor</option>
                <option value={12}>12th Floor</option>
                <option value={13}>13th Floor</option>
                <option value={14}>14th Floor</option>
                <option value={15}>15th Floor</option>
                <option value={16}>16th Floor</option>
                <option value={17}>17th Floor</option>
                <option value={18}>18th Floor</option>
                <option value={19}>19th Floor</option>
                <option value={20}>20th Floor</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">Select floor level (0 = Ground)</p>
            </div>
          </div>

          {/* Owner / Resident Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-600" />
              Flat Name / Resident Name *
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Nasir Bhai, Mr. Sharma"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              required
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Used in WhatsApp bill greeting (*Nasir Bhai*)</p>
          </div>

          {/* Mobile / Phone Number */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              Mobile Number (10 Digits) *
            </label>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-2 rounded-xl bg-slate-100 border border-slate-300 font-mono font-bold text-slate-600 text-xs select-none">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9820123456"
                maxLength={10}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold tracking-wide focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Used for WhatsApp bill delivery & Resident PIN sign-in</p>
          </div>

          {/* Security PIN for Resident Login */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                Resident Security PIN (4-6 Digits)
              </label>
              {flat.pin ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-1.5 py-0.5 rounded">
                  PIN Active
                </span>
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded">
                  Not Set Yet
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={flat.pin ? "Enter new PIN to change" : "Leave blank to let resident set on login"}
                maxLength={6}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold tracking-wider text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              {flat.pin && (
                <button
                  type="button"
                  onClick={() => setPin('')}
                  className="px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl whitespace-nowrap cursor-pointer transition-colors"
                  title="Clear PIN so resident can set a fresh PIN upon next login"
                >
                  Reset PIN
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Residents set this on first login. Resetting allows them to choose a new PIN if forgotten.
            </p>
          </div>

          {/* Sub-Meter Hardware Serial Number */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-slate-400" />
                Sub-Meter No.
              </label>
              <input
                type="text"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
                placeholder="e.g. SM-101-LNT"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Custom Unit Rate (₹)
              </label>
              <input
                type="number"
                step="0.5"
                value={customRate}
                onChange={(e) => setCustomRate(e.target.value)}
                placeholder="Leave blank for auto"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
