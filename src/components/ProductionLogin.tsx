import React, { useState } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { FlatInfo } from '../types';
import {
  Smartphone,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Eye,
  EyeOff,
  Building,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  KeyRound,
  UserCheck,
  Mail,
} from 'lucide-react';

interface ProductionLoginProps {
  isModal?: boolean;
  onClose?: () => void;
}

export const ProductionLogin: React.FC<ProductionLoginProps> = ({
  isModal = false,
  onClose,
}) => {
  const {
    settings,
    flats,
    checkPhoneRegistration,
    setFlatPin,
    loginResidentWithPin,
    loginDirectlyAsFlat,
    loginAsAdminWithPassword,
    loginAsAdmin,
    sendAdminEmailOtp,
    verifyAdminEmailOtp,
  } = useBuilding();

  // Navigation steps:
  // 'phone'       -> Resident enters registered 10-digit mobile number
  // 'select_unit' -> Multi-flat resident chooses which unit to view
  // 'set_pin'     -> First-time login: Resident sets and confirms 4-digit PIN
  // 'enter_pin'   -> Returning resident: Enters their existing 4-digit PIN
  const [step, setStep] = useState<'phone' | 'select_unit' | 'set_pin' | 'enter_pin'>('phone');

  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeFlat, setActiveFlat] = useState<FlatInfo | null>(null);
  const [matchingFlats, setMatchingFlats] = useState<FlatInfo[]>([]);
  const [isSecretaryUser, setIsSecretaryUser] = useState(false);

  // Set PIN inputs (First-time user)
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Enter PIN inputs (Returning user)
  const [enteredPin, setEnteredPin] = useState('');
  const [showEnteredPin, setShowEnteredPin] = useState(false);

  // Status and feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPinHelp, setShowForgotPinHelp] = useState(false);

  // Discrete Office / Admin login dialog state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminTab, setAdminTab] = useState<'email' | 'password'>('email');
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccessNotice, setAdminSuccessNotice] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // Admin Real Email OTP state
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminEmailOtp, setAdminEmailOtp] = useState('');
  const [adminEmailStep, setAdminEmailStep] = useState<'request' | 'verify'>('request');

  const getCleanDigits = (input: string) => input.replace(/\D/g, '');

  const selectFlatAndProceed = (selectedFlat: FlatInfo) => {
    setActiveFlat(selectedFlat);
    setErrorMessage('');
    setSuccessMessage('');

    const hasPin = Boolean(selectedFlat.pin && selectedFlat.pin.trim().length >= 4);
    const anyMatchingHasPin = matchingFlats.some((f) => f.pin && f.pin.trim().length >= 4);

    if (hasPin || anyMatchingHasPin) {
      setStep('enter_pin');
      setEnteredPin('');
    } else {
      setStep('set_pin');
      setNewPin('');
      setConfirmPin('');
      const unitName = selectedFlat.flatNumber.toLowerCase().includes('shop')
        ? selectedFlat.flatNumber
        : `Flat ${selectedFlat.flatNumber}`;
      setSuccessMessage(
        `Welcome ${selectedFlat.ownerName}! Please set your 4-digit security PIN for ${unitName}.`
      );
    }
  };

  // STEP 1: Verify phone number is registered
  const handleVerifyPhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setShowForgotPinHelp(false);

    const clean = getCleanDigits(phoneNumber);
    const tenDigit = clean.length > 10 ? clean.slice(-10) : clean;

    if (tenDigit.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);

    try {
      const checkResult = checkPhoneRegistration(tenDigit);

      if (!checkResult.isRegistered) {
        setErrorMessage(
          checkResult.error ||
            `Mobile number +91 ${tenDigit} is not registered with any flat in ${
              settings.buildingName || 'the building'
            }. Please contact Society Secretary Mohammad Shariq Ansari (+91 8077649394) to register your number.`
        );
        setIsLoading(false);
        return;
      }

      setMatchingFlats(checkResult.matchingFlats);
      setIsSecretaryUser(Boolean(checkResult.isSecretary));

      // If registered with multiple flats OR (isSecretary AND has at least 1 flat)
      if (checkResult.matchingFlats.length > 1 || (checkResult.isSecretary && checkResult.matchingFlats.length > 0)) {
        setStep('select_unit');
        setIsLoading(false);
        return;
      }

      // If Secretary with 0 flats
      if (checkResult.isSecretary && checkResult.matchingFlats.length === 0) {
        setShowAdminLogin(true);
        setAdminIdentifier(tenDigit);
        setAdminError('');
        setIsLoading(false);
        return;
      }

      // Single flat resident
      if (checkResult.flat) {
        setActiveFlat(checkResult.flat);

        if (checkResult.hasPin) {
          // Returning user -> Prompt for existing PIN
          setStep('enter_pin');
          setEnteredPin('');
        } else {
          // First-time user -> Prompt to set new PIN
          setStep('set_pin');
          setNewPin('');
          setConfirmPin('');
          const unitName = checkResult.flat.flatNumber.toLowerCase().includes('shop')
            ? checkResult.flat.flatNumber
            : `Flat ${checkResult.flat.flatNumber}`;
          setSuccessMessage(
            `Welcome ${checkResult.flat.ownerName}! Please set your 4-digit security PIN for ${unitName}.`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2A: Set & Confirm PIN (First-Time Resident)
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlat) return;

    setErrorMessage('');
    setSuccessMessage('');

    const cleanNewPin = newPin.trim();
    const cleanConfirmPin = confirmPin.trim();

    if (!/^\d{4,6}$/.test(cleanNewPin)) {
      setErrorMessage('Security PIN must be 4 to 6 digits (numbers only).');
      return;
    }

    if (cleanNewPin !== cleanConfirmPin) {
      setErrorMessage('PINs do not match. Please re-enter both PIN fields carefully.');
      return;
    }

    setIsLoading(true);
    try {
      // Save PIN permanently to flat record (saved to Firestore and local state)
      await setFlatPin(activeFlat.id, cleanNewPin);

      // Sign in resident directly
      loginDirectlyAsFlat(activeFlat.id, phoneNumber);

      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save security PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2B: Enter Existing PIN (Returning Resident)
  const handleResidentPinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFlat) return;

    setErrorMessage('');
    setSuccessMessage('');

    const trimmedPin = enteredPin.trim();
    if (!trimmedPin) {
      setErrorMessage('Please enter your 4-digit security PIN.');
      return;
    }

    setIsLoading(true);
    try {
      const result = loginResidentWithPin(phoneNumber, trimmedPin, activeFlat.id);

      if (!result.success) {
        setErrorMessage(result.error || 'Incorrect security PIN. Please try again.');
        setIsLoading(false);
        return;
      }

      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Office / Admin Login Handler
  const handleOfficeAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setIsAdminLoading(true);

    try {
      const result = loginAsAdminWithPassword(adminIdentifier, adminPassword);
      if (!result.success) {
        // Fallback to direct PIN login if single PIN entered
        const pinResult = loginAsAdmin(adminPassword);
        if (pinResult.success) {
          setShowAdminLogin(false);
          if (onClose) onClose();
          return;
        }
        setAdminError(result.error || 'Invalid administrator credentials.');
      } else {
        setShowAdminLogin(false);
        if (onClose) onClose();
      }
    } catch (err: any) {
      setAdminError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  // Office / Admin Real Email OTP Handlers
  const handleSendAdminEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccessNotice('');
    setIsAdminLoading(true);

    try {
      const cleanEmail = adminEmailInput.trim().toLowerCase();
      if (!cleanEmail) {
        setAdminError('Please enter your administrator email address.');
        return;
      }

      const res = await sendAdminEmailOtp(cleanEmail);
      if (!res.success) {
        setAdminError(res.error || 'Failed to dispatch email verification.');
        return;
      }

      setAdminEmailStep('verify');
      const maskedEmail = cleanEmail.includes('@')
        ? `${cleanEmail.split('@')[0].slice(0, 2)}•••@${cleanEmail.split('@')[1]}`
        : 'your inbox';
      setAdminSuccessNotice(`A 6-digit OTP code was sent to ${maskedEmail}. Check your inbox or spam folder.`);
    } catch (err: any) {
      setAdminError(err?.message || 'Failed to request email OTP.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleVerifyAdminEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setIsAdminLoading(true);

    try {
      const cleanCode = adminEmailOtp.trim().replace(/\D/g, '');
      if (cleanCode.length !== 6) {
        setAdminError('Please enter the full 6-digit OTP code received in your email.');
        return;
      }

      const res = await verifyAdminEmailOtp(cleanCode, adminEmailInput.trim().toLowerCase());
      if (!res.success) {
        setAdminError(res.error || 'Invalid or expired OTP code.');
        return;
      }

      setShowAdminLogin(false);
      if (onClose) onClose();
    } catch (err: any) {
      setAdminError(err?.message || 'Verification error.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleResetToPhoneStep = () => {
    setStep('phone');
    setActiveFlat(null);
    setMatchingFlats([]);
    setIsSecretaryUser(false);
    setEnteredPin('');
    setNewPin('');
    setConfirmPin('');
    setErrorMessage('');
    setSuccessMessage('');
    setShowForgotPinHelp(false);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-7 relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-100/50 via-amber-50/20 to-transparent rounded-full blur-2xl pointer-events-none -mr-12 -mt-12" />

      {/* Modal Close Button */}
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* App Header Branding */}
      <div className="text-center mb-6 relative">
        <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 mb-3">
          <Building className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight">
          {settings.buildingName || 'Society Electricity Portal'}
        </h2>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Sub-meter Billing & Resident Account Access
        </p>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed font-medium">{successMessage}</div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: ENTER REGISTERED MOBILE NUMBER */}
      {/* ========================================================================= */}
      {step === 'phone' && (
        <form onSubmit={handleVerifyPhone} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Registered Mobile Number
              </label>
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                PIN Protected
              </span>
            </div>

            <div className="relative flex rounded-2xl border border-slate-300 focus-within:ring-2 focus-within:ring-amber-500/30 focus-within:border-amber-600 bg-slate-50/70 transition-all overflow-hidden">
              <span className="inline-flex items-center px-3.5 text-xs font-bold text-slate-700 bg-slate-100/90 border-r border-slate-200 select-none">
                🇮🇳 +91
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Enter 10-digit number (e.g. 9876554327)"
                maxLength={14}
                className="w-full px-3.5 py-3 text-sm font-semibold bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                autoFocus
                required
              />
              <div className="flex items-center pr-3">
                <Smartphone className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Enter the mobile number registered for your flat. First-time users will set their 4-digit PIN.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || getCleanDigits(phoneNumber).length < 10}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Flat Records...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Secure 4-Digit PIN &bull; Private Flat Access &bull; Bank-Grade Security</span>
          </div>

          {/* Discreet Office Access Link */}
          <div className="pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setShowAdminLogin(true);
                setAdminError('');
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Society Secretary / Office Sign In</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 1.5: MULTI-UNIT SELECTION (e.g. Flat 101 & Flat 402, Shops -02 & Flat 01) */}
      {/* ========================================================================= */}
      {step === 'select_unit' && (
        <div className="space-y-4">
          <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs text-sm">
              {matchingFlats.length}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                Multiple Units Registered
              </h4>
              <p className="text-xs text-amber-800 leading-snug mt-0.5">
                Mobile number <span className="font-mono font-bold">+91 {getCleanDigits(phoneNumber).slice(-10)}</span> is linked with <strong>{matchingFlats.length} units</strong>. Select which one you want to view:
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {matchingFlats.map((flatItem) => {
              const isShop = flatItem.flatNumber.toLowerCase().includes('shop');
              const displayTitle = flatItem.flatNumber.toLowerCase().startsWith('flat') || isShop
                ? flatItem.flatNumber
                : `Flat ${flatItem.flatNumber}`;
              const hasPin = Boolean(flatItem.pin && flatItem.pin.trim().length >= 4);

              return (
                <button
                  key={flatItem.id}
                  type="button"
                  onClick={() => selectFlatAndProceed(flatItem)}
                  className="w-full text-left p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 bg-white transition-all shadow-xs hover:shadow-md flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs transition-colors ${
                        isShop
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white group-hover:bg-amber-600'
                      }`}
                    >
                      {isShop ? '🏪' : '🏠'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm group-hover:text-amber-900 truncate">
                          View as {displayTitle}
                        </span>
                        {hasPin ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            PIN Protected
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            Setup PIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5 truncate">
                        <span className="font-medium text-slate-700">{flatItem.ownerName}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          Meter: {flatItem.meterNumber}
                        </span>
                        <span>&bull;</span>
                        <span>{flatItem.floor === 0 ? 'Ground' : `Fl. ${flatItem.floor}`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 group-hover:translate-x-1 transition-transform shrink-0 pl-2">
                    <span className="hidden sm:inline">Select</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}

            {/* If user is also Secretary / Admin (e.g. Mohammad Shariq Ansari) */}
            {isSecretaryUser && (
              <button
                type="button"
                onClick={() => {
                  setShowAdminLogin(true);
                  setAdminIdentifier(getCleanDigits(phoneNumber).slice(-10));
                  setAdminError('');
                }}
                className="w-full text-left p-3.5 rounded-2xl border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50/50 bg-white transition-all shadow-xs flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-indigo-950 text-sm truncate">
                        Secretary Admin Console
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">
                        Admin Portal
                      </span>
                    </div>
                    <div className="text-xs text-indigo-700 mt-0.5">
                      Full society management, billing, expenses & settings
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 group-hover:translate-x-1 transition-transform shrink-0 pl-2">
                  <span className="hidden sm:inline">Access</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            )}
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleResetToPhoneStep}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              &larr; Use a different mobile number
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2A: FIRST-TIME LOGIN -> SET & CONFIRM 4-DIGIT PIN */}
      {/* ========================================================================= */}
      {step === 'set_pin' && activeFlat && (
        <form onSubmit={handleSavePin} className="space-y-4">
          {/* Flat details banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                {activeFlat.flatNumber.toLowerCase().includes('shop') ? '🏪' : '🏠'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>View as {activeFlat.flatNumber.toLowerCase().startsWith('flat') || activeFlat.flatNumber.toLowerCase().includes('shop') ? activeFlat.flatNumber : `Flat ${activeFlat.flatNumber}`}</span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                    First-Time Setup
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  {activeFlat.ownerName} &bull; +91 {getCleanDigits(phoneNumber).slice(-10)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {matchingFlats.length > 1 && (
                <button
                  type="button"
                  onClick={() => setStep('select_unit')}
                  className="text-xs text-amber-800 hover:text-amber-950 font-bold bg-amber-100/80 hover:bg-amber-200/80 px-2 py-1 rounded-lg shrink-0 cursor-pointer transition-colors"
                >
                  Switch Unit
                </button>
              )}
              <button
                type="button"
                onClick={handleResetToPhoneStep}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          <div className="text-center pt-1">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mb-1.5">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Set Security PIN for {activeFlat.flatNumber}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
              Choose a 4-digit PIN to securely access your bills and receipts anytime without waiting for SMS OTPs.
            </p>
          </div>

          {/* New PIN Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Create 4-Digit PIN <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-digit PIN"
                className="w-full pl-3.5 pr-10 py-3 text-base tracking-widest font-mono font-bold bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 text-slate-900"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm PIN Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Confirm 4-Digit PIN <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter same PIN"
                className="w-full pl-3.5 pr-10 py-3 text-base tracking-widest font-mono font-bold bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 text-slate-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={matchingFlats.length > 1 ? () => setStep('select_unit') : handleResetToPhoneStep}
              className="py-3 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
            >
              {matchingFlats.length > 1 ? '← Back to Units' : 'Back'}
            </button>
            <button
              type="submit"
              disabled={isLoading || newPin.length < 4 || confirmPin.length < 4}
              className="flex-1 py-3 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving PIN...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save PIN & Sign In</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 2B: RETURNING RESIDENT -> ENTER EXISTING PIN */}
      {/* ========================================================================= */}
      {step === 'enter_pin' && activeFlat && (
        <form onSubmit={handleResidentPinLogin} className="space-y-4">
          {/* Flat details banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                {activeFlat.flatNumber.toLowerCase().includes('shop') ? '🏪' : '🏠'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>View as {activeFlat.flatNumber.toLowerCase().startsWith('flat') || activeFlat.flatNumber.toLowerCase().includes('shop') ? activeFlat.flatNumber : `Flat ${activeFlat.flatNumber}`}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {activeFlat.ownerName} &bull; +91 {getCleanDigits(phoneNumber).slice(-10)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {matchingFlats.length > 1 && (
                <button
                  type="button"
                  onClick={() => setStep('select_unit')}
                  className="text-xs text-amber-800 hover:text-amber-950 font-bold bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg shrink-0 cursor-pointer transition-colors"
                >
                  Switch Unit
                </button>
              )}
              <button
                type="button"
                onClick={handleResetToPhoneStep}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Enter Security PIN <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPinHelp(!showForgotPinHelp)}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                Forgot PIN?
              </button>
            </div>

            <div className="relative">
              <input
                type={showEnteredPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value.replace(/\D/g, ''));
                  setErrorMessage('');
                }}
                placeholder="• • • •"
                className="w-full pl-3.5 pr-10 py-3.5 text-center text-2xl tracking-widest font-mono font-black bg-slate-50 border border-slate-300 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 text-slate-900"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowEnteredPin(!showEnteredPin)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex={-1}
              >
                {showEnteredPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 text-center">
              Enter your 4-digit security PIN for {activeFlat.flatNumber}.
            </p>
          </div>

          {/* Help box for forgot PIN */}
          {showForgotPinHelp && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 animate-in fade-in duration-150">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                Forgot your PIN?
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Please contact Society Secretary Mohammad Shariq Ansari (+91 8077649394) to reset the PIN for Flat {activeFlat.flatNumber}. Once reset in the Flats Management panel, you can set a brand new PIN right here on your next login.
              </p>
            </div>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={matchingFlats.length > 1 ? () => setStep('select_unit') : handleResetToPhoneStep}
              className="py-3.5 px-4 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
            >
              {matchingFlats.length > 1 ? '← Back to Units' : 'Back'}
            </button>
            <button
              type="submit"
              disabled={isLoading || enteredPin.length < 4}
              className="flex-1 py-3.5 px-4 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In to {activeFlat.flatNumber.toLowerCase().startsWith('flat') || activeFlat.flatNumber.toLowerCase().includes('shop') ? activeFlat.flatNumber : `Flat ${activeFlat.flatNumber}`}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* DISCRETE OFFICE / ADMIN SIGN IN MODAL */}
      {/* ========================================================================= */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => {
                setShowAdminLogin(false);
                setAdminError('');
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Society Office Sign In</h4>
                <p className="text-[11px] text-slate-500">Secretary: Mohammad Shariq Ansari (+91 8077649394)</p>
              </div>
            </div>

            {/* Admin Login Mode Switcher: Email OTP vs Password/PIN */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-3.5">
              <button
                type="button"
                onClick={() => {
                  setAdminTab('email');
                  setAdminError('');
                  setAdminSuccessNotice('');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  adminTab === 'email'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email OTP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminTab('password');
                  setAdminError('');
                  setAdminSuccessNotice('');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  adminTab === 'password'
                    ? 'bg-white text-indigo-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span>Password / PIN</span>
              </button>
            </div>

            {adminError && (
              <div className="mb-3.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            {adminSuccessNotice && (
              <div className="mb-3.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{adminSuccessNotice}</span>
              </div>
            )}

            {adminTab === 'email' ? (
              /* Real Email OTP Flow */
              <div className="space-y-3.5">
                {adminEmailStep === 'request' ? (
                  <form onSubmit={handleSendAdminEmailOtp} className="space-y-3.5" autoComplete="off">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Registered Secretary Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={adminEmailInput}
                        onChange={(e) => setAdminEmailInput(e.target.value)}
                        placeholder="Enter registered secretary email"
                        required
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium font-mono"
                      />
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        A real 6-digit one-time passcode will be dispatched directly to your inbox.
                      </p>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={isAdminLoading || !adminEmailInput.trim()}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        {isAdminLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Dispatching Email...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Send OTP to My Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyAdminEmailOtp} className="space-y-3.5">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Passcode sent to</span>
                        <span className="font-mono text-slate-800 font-semibold">
                          {adminEmailInput.includes('@')
                            ? `${adminEmailInput.split('@')[0].slice(0, 2)}•••@${adminEmailInput.split('@')[1]}`
                            : '••••••••'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminEmailStep('request');
                          setAdminEmailOtp('');
                          setAdminError('');
                          setAdminSuccessNotice('');
                        }}
                        className="text-[11px] text-indigo-600 hover:underline font-bold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Enter 6-Digit Email Code <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={adminEmailOtp}
                        onChange={(e) => setAdminEmailOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        required
                        className="w-full px-3 py-2.5 text-lg tracking-widest font-mono text-center font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <p className="text-[11px] text-slate-400 text-center mt-1">
                        Check your Inbox and Spam/Junk folder. Valid for 10 minutes.
                      </p>
                    </div>

                    <div className="pt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminEmailStep('request');
                          setAdminEmailOtp('');
                          setAdminError('');
                        }}
                        className="py-2.5 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isAdminLoading || adminEmailOtp.length !== 6}
                        className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        {isAdminLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Sign In</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* Password / Security PIN Flow */
              <form onSubmit={handleOfficeAdminLogin} className="space-y-3.5" autoComplete="off">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Email or Registered Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="admin_login_id"
                    autoComplete="username"
                    value={adminIdentifier}
                    onChange={(e) => setAdminIdentifier(e.target.value)}
                    placeholder="Enter admin email or phone number"
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Password or Security PIN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      name="admin_login_secret"
                      autoComplete="current-password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter password or secret PIN"
                      required
                      className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      tabIndex={-1}
                    >
                      {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isAdminLoading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {isAdminLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying credentials...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Sign In as Administrator</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <span className="text-[11px] text-slate-400">
                    Authorized access for Society Committee & Secretary only.
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
