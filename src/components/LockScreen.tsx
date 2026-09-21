import React, { useState, useEffect, useRef } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  Delete,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Smartphone,
  KeyRound,
  Shield,
  Home,
  Check,
  RefreshCw,
} from 'lucide-react';

export const LockScreen: React.FC = () => {
  const {
    currentSession,
    settings,
    flats,
    lockReason,
    unlockAppWithPin,
    setFlatPin,
    logout,
    loginAsAdminWithPassword,
  } = useBuilding();

  const [enteredPin, setEnteredPin] = useState('');
  const [showPinDigits, setShowPinDigits] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // First-time setup PIN fallback if flat has no PIN
  const [isSettingPinMode, setIsSettingPinMode] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [setupPinError, setSetupPinError] = useState('');
  const [setupPinSuccess, setSetupPinSuccess] = useState('');

  // Admin Master Password recovery state
  const [adminMasterPassword, setAdminMasterPassword] = useState('');
  const [adminRecoveryError, setAdminRecoveryError] = useState('');
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Find user details
  const flat = currentSession?.flatId
    ? flats.find((f) => f.id === currentSession.flatId)
    : flats.find((f) => f.phone && currentSession?.phone && f.phone.replace(/\D/g, '') === currentSession.phone.replace(/\D/g, ''));

  const isResident = currentSession?.role === 'resident';
  const isAdmin = currentSession?.role === 'admin';

  // Check if resident flat has no PIN set yet
  useEffect(() => {
    if (isResident && flat && (!flat.pin || flat.pin.trim().length === 0)) {
      setIsSettingPinMode(true);
    }
  }, [isResident, flat]);

  // Keep hidden input focused for physical keyboard typing
  useEffect(() => {
    hiddenInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus hidden input if user starts typing numbers
      if (/^[0-9]$/.test(e.key) || e.key === 'Backspace') {
        hiddenInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDigitPress = (digit: string) => {
    if (isVerifying || isSuccess) return;
    setErrorMessage('');
    if (enteredPin.length < 6) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      // Auto verify when 4 digits are entered
      if (nextPin.length === 4) {
        verifyPinSubmission(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying || isSuccess) return;
    setErrorMessage('');
    setEnteredPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isVerifying || isSuccess) return;
    setErrorMessage('');
    setEnteredPin('');
  };

  const verifyPinSubmission = async (pinToVerify: string) => {
    setIsVerifying(true);
    setErrorMessage('');

    // Short timeout for pleasant optical feedback
    await new Promise((resolve) => setTimeout(resolve, 180));

    const result = unlockAppWithPin(pinToVerify);

    if (result.success) {
      setIsSuccess(true);
      setIsVerifying(false);
    } else {
      setIsVerifying(false);
      if (result.requiresPinSetup) {
        setIsSettingPinMode(true);
      } else {
        setErrorMessage(result.error || 'Incorrect security PIN. Please try again.');
        // Clear entered PIN on error so user can re-type immediately
        setEnteredPin('');
        hiddenInputRef.current?.focus();
      }
    }
  };

  // Handle saving new PIN if flat had none
  const handleSaveInitialPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupPinError('');
    setSetupPinSuccess('');

    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!/^\d{4,6}$/.test(cleanNew)) {
      setSetupPinError('PIN must be 4 to 6 digits (numbers only).');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setSetupPinError('PINs do not match. Please enter the same PIN in both fields.');
      return;
    }
    if (!flat) {
      setSetupPinError('Flat profile could not be found.');
      return;
    }

    try {
      setIsVerifying(true);
      await setFlatPin(flat.id, cleanNew);
      setSetupPinSuccess('PIN saved! Unlocking application...');
      await new Promise((r) => setTimeout(r, 400));
      unlockAppWithPin(cleanNew);
    } catch {
      setSetupPinError('Failed to save PIN. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Admin Master Password Unlock
  const handleAdminPasswordUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminRecoveryError('');
    if (!adminMasterPassword.trim()) {
      setAdminRecoveryError('Please enter administrator password.');
      return;
    }

    const res = loginAsAdminWithPassword(
      settings.adminEmail || settings.adminPhone || currentSession?.phone || '',
      adminMasterPassword
    );

    if (res.success) {
      setShowAdminPasswordModal(false);
      setIsSuccess(true);
    } else {
      setAdminRecoveryError(res.error || 'Incorrect password.');
    }
  };

  return (
    <div className="max-w-md mx-auto my-3 sm:my-6 px-3">
      {/* Background card container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden"
      >
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 text-center relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              10-Min Inactivity Auto-Lock
            </span>
          </div>

          <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
            {isSuccess ? (
              <Unlock className="w-7 h-7 text-emerald-400 animate-pulse" />
            ) : (
              <Lock className="w-7 h-7 text-amber-400" />
            )}
          </div>

          <h2 className="text-xl font-black tracking-tight text-white">
            {settings.buildingName || 'Society Meter Engine'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {lockReason === 'killed'
              ? 'App was closed. Enter PIN to resume your session'
              : lockReason === 'inactivity'
              ? 'Screen locked after 10 minutes of inactivity'
              : 'Security PIN required to access dashboard'}
          </p>
        </div>

        {/* User Profile Card */}
        <div className="px-5 pt-4 pb-2">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                  isAdmin
                    ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700'
                    : 'bg-gradient-to-tr from-amber-500 to-amber-600'
                }`}
              >
                {isAdmin ? <Shield className="w-5 h-5" /> : flat?.flatNumber || 'Flat'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>
                    {isAdmin
                      ? 'Mohammad Shariq Ansari'
                      : (currentSession?.name || flat?.ownerName || 'Active Resident')}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isAdmin
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isAdmin ? 'Secretary / Admin' : `Flat ${flat?.flatNumber || currentSession?.flatNumber}`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  +91 {isAdmin ? '8077649394' : (currentSession?.phone?.slice(-10) || flat?.phone?.slice(-10) || 'Registered Number')}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Sign out and switch to a different phone number?')) {
                  logout();
                }
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="Sign out this account"
            >
              <LogOut className="w-3.5 h-3.5" />
              Switch
            </button>
          </div>
        </div>

        {/* First-Time PIN Setup Mode (if resident flat has no PIN) */}
        {isSettingPinMode ? (
          <form onSubmit={handleSaveInitialPin} className="p-5 space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>Set your Security PIN</strong>: To protect your electricity bill records, please create a 4-digit PIN for your flat.
            </div>

            {setupPinError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{setupPinError}</span>
              </div>
            )}

            {setupPinSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{setupPinSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Create 4-Digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Re-enter PIN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || !newPin || !confirmPin}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving PIN...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save PIN &amp; Unlock App
                </>
              )}
            </button>
          </form>
        ) : (
          /* Normal PIN Unlock Flow */
          <div className="p-5 pt-2">
            {/* Hidden Input for Physical Keyboard capture */}
            <input
              ref={hiddenInputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={enteredPin}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '');
                setEnteredPin(clean);
                if (clean.length === 4) {
                  verifyPinSubmission(clean);
                }
              }}
              className="sr-only"
              aria-label="Enter Security PIN"
            />

            {/* Error Message */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center justify-center gap-2 text-center"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Success Animation */}
            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center justify-center gap-2 text-center"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                <span>PIN verified! Unlocking dashboard...</span>
              </motion.div>
            )}

            {/* PIN Bubble Slots Display */}
            <div className="flex flex-col items-center my-3">
              <div
                onClick={() => hiddenInputRef.current?.focus()}
                className="flex items-center justify-center gap-3.5 py-2 px-6 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer select-none"
              >
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = enteredPin.length > index;
                  const char = enteredPin[index];

                  return (
                    <div
                      key={index}
                      className={`w-11 h-12 rounded-xl flex items-center justify-center transition-all duration-150 ${
                        isFilled
                          ? 'bg-slate-900 text-white font-mono font-bold text-lg border-2 border-slate-900 shadow-xs'
                          : 'bg-white border-2 border-slate-200 text-transparent'
                      }`}
                    >
                      {isFilled ? (
                        showPinDigits ? (
                          char
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm" />
                        )
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Show/Hide PIN Toggle */}
              <button
                type="button"
                onClick={() => setShowPinDigits(!showPinDigits)}
                className="mt-2 text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                {showPinDigits ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Hide Digits
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Peek PIN
                  </>
                )}
              </button>
            </div>

            {/* On-Screen Touch Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto my-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="h-13 rounded-2xl bg-slate-100/90 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-slate-200/60"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-13 rounded-2xl bg-slate-100/60 hover:bg-slate-200 active:bg-slate-300 text-slate-500 font-semibold text-xs flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-slate-200/50"
                title="Clear all digits"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="h-13 rounded-2xl bg-slate-100/90 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs border border-slate-200/60"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-13 rounded-2xl bg-slate-100/60 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-slate-200/50"
                title="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Manual Unlock Submit (if 4+ digits typed and not auto-submitted) */}
            {enteredPin.length >= 4 && (
              <button
                type="button"
                onClick={() => verifyPinSubmission(enteredPin)}
                disabled={isVerifying}
                className="w-full mt-3 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying PIN...
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Unlock Dashboard
                  </>
                )}
              </button>
            )}

            {/* Bottom Actions: Forgot PIN & Sign Out */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowForgotHelp(true)}
                className="text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                Forgot PIN?
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to sign out? You will need to log in again.')) {
                    logout();
                  }
                }}
                className="text-slate-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200/60 text-center text-[10px] text-slate-400">
          Smart Society Sub-Meter Security &bull; Automatically locks every 10 min
        </div>
      </motion.div>

      {/* Forgot PIN / Help Modal */}
      {showForgotHelp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Forgot Security PIN Assistance
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 mb-4">
              {isAdmin ? (
                <>
                  <p>
                    As the <strong>Society Administrator</strong>, you can unlock using your secret Administrator Master Password:
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotHelp(false);
                      setShowAdminPasswordModal(true);
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    Enter Admin Password
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Security PINs are stored securely for Flat {flat?.flatNumber || currentSession?.flatNumber}.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    <p className="font-semibold mb-1">To reset your PIN:</p>
                    <p>
                      Please contact your society secretary (Mohammad Shariq Ansari) at{' '}
                      <strong>+91 {settings.adminPhone || '8077649394'}</strong> or society office to reset your flat's PIN.
                    </p>
                  </div>
                  <p>
                    Alternatively, you can sign out and log in with your phone number again.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForgotHelp(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotHelp(false);
                  logout();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Sign Out &amp; Relogin
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Admin Password Recovery Modal */}
      {showAdminPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
              <Shield className="w-4 h-4 text-indigo-600" />
              Administrator Password Unlock
            </div>

            <form onSubmit={handleAdminPasswordUnlock} className="space-y-3">
              {adminRecoveryError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {adminRecoveryError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Enter Admin Password (e.g. My1Build2@3)
                </label>
                <input
                  type="password"
                  value={adminMasterPassword}
                  onChange={(e) => setAdminMasterPassword(e.target.value)}
                  placeholder="Master Admin Password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdminPasswordModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  Unlock Admin
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
