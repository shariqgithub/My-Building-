import React, { useState, useEffect } from 'react';
import { BuildingSettings } from '../types';
import { X, Check, Building2, MapPin, Zap, ShieldCheck, Lock, Mail, Phone, KeyRound, Eye, EyeOff } from 'lucide-react';

interface EditBuildingModalProps {
  settings: BuildingSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<BuildingSettings>) => void;
}

export const EditBuildingModal: React.FC<EditBuildingModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [buildingName, setBuildingName] = useState('');
  const [address, setAddress] = useState('');
  const [commonMeterNumber, setCommonMeterNumber] = useState('');
  const [electricityBoard, setElectricityBoard] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings) {
      setBuildingName(settings.buildingName);
      setAddress(settings.address || '');
      setCommonMeterNumber(settings.commonMeterNumber || '');
      setElectricityBoard(settings.electricityBoard || '');
      setAdminEmail(settings.adminEmail || 'admin@building.local');
      setAdminPassword(settings.adminPassword || 'My1Build2@3');
      setAdminPhone(settings.adminPhone || '9876543201');
      setAdminPin(settings.adminPin || '1234');
      setError('');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = buildingName.trim();
    if (!cleanName) {
      setError('Building name cannot be empty.');
      return;
    }

    onSave({
      buildingName: cleanName,
      address: address.trim(),
      commonMeterNumber: commonMeterNumber.trim(),
      electricityBoard: electricityBoard.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword: adminPassword.trim() || 'My1Build2@3',
      adminPhone: adminPhone.trim(),
      adminPin: adminPin.trim() || '1234',
    });
    onClose();
  };

  return (
    <div
      id="edit-building-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="edit-building-modal-container"
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-none">
                Edit Building Name & Details
              </h3>
              <p className="text-[11px] text-amber-100 mt-0.5">
                Updates appear on all bills, invoices, receipts & WhatsApp
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Building Name */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              Building / Society / Apartment Name *
            </label>
            <input
              type="text"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="e.g. Gulshan-e-Iqbal Heights, Sunrise Apartments"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-sm"
              required
              autoFocus
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Displayed in header, receipts, invoices, and resident portal
            </p>
          </div>

          {/* Building Address */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              Building Address / Locality
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Plot 42, Civil Lines, Near Jama Masjid"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Printed on PDF/printable invoices and official receipts
            </p>
          </div>

          {/* Electricity Board & Main Meter Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Main Meter No.
              </label>
              <input
                type="text"
                value={commonMeterNumber}
                onChange={(e) => setCommonMeterNumber(e.target.value)}
                placeholder="e.g. EB-MAIN-489201"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                Electricity Board
              </label>
              <input
                type="text"
                value={electricityBoard}
                onChange={(e) => setElectricityBoard(e.target.value)}
                placeholder="e.g. MSEDCL, Tata Power"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs"
              />
            </div>
          </div>

          {/* Admin Credentials & Fixed Password */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-800 text-xs">
                Admin Security & Fixed Password
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full ml-auto">
                No OTP Needed
              </span>
            </div>

            <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@building.local"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    Admin Phone
                  </label>
                  <input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543201"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-600" />
                    Fixed Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Set admin password"
                      className="w-full pl-2.5 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-slate-400" />
                    Fallback PIN
                  </label>
                  <input
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="1234"
                    maxLength={6}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                You can sign in with this password from any device without requiring SMS delivery or phone balance recharge.
              </p>
            </div>
          </div>

          {/* Action buttons */}
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
              Save Building Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
