import React, { useState } from 'react';
import { useBuilding } from '../context/BuildingContext';
import { EditBuildingModal } from './EditBuildingModal';
import {
  Zap,
  Bell,
  LogOut,
  UserCheck,
  Shield,
  ShieldCheck,
  Home,
  CheckCircle2,
  X,
  ChevronDown,
  Edit3,
  ArrowRightLeft,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  onOpenLogin?: () => void;
  isMobileFrame: boolean;
  setIsMobileFrame: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  isMobileFrame,
  setIsMobileFrame,
}) => {
  const {
    settings,
    flats,
    cycles,
    activeCycleId,
    setActiveCycleId,
    currentSession,
    notifications,
    unreadCount,
    logout,
    switchRoleQuickly,
    switchToResidentView,
    switchToAdminView,
    isCommitteeMember,
    isAppLocked,
    lockApp,
    markAllNotificationsRead,
    updateSettings,
    cloudSyncStatus,
  } = useBuilding();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showEditBuildingModal, setShowEditBuildingModal] = useState(false);

  const requestPushPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(settings.buildingName, {
          body: 'Free push notifications enabled for electricity bill updates!',
          icon: '/favicon.ico',
        });
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Committee Switcher Top Banner: Only visible when Admin/Committee Member is viewing as Resident */}
      {currentSession?.isCommitteeMember && currentSession.role === 'resident' && (
        <div className="bg-indigo-900 text-white px-3 sm:px-4 py-1.5 border-b border-indigo-950">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-indigo-200">
                Committee Mode: Viewing <strong className="text-white">Flat {currentSession.flatNumber}</strong> ({currentSession.name})
              </span>
            </div>
            <button
              type="button"
              onClick={switchToAdminView}
              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Shield className="w-3.5 h-3.5 text-slate-900" />
              <span>Back to Admin Console</span>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Brand / Society Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0 border border-amber-500/20 shadow-xs select-none"
          >
            <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate tracking-tight">
                {settings.buildingName}
              </h1>
              {currentSession?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setShowEditBuildingModal(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-100/70 transition-colors"
                  title="Edit Building Name & Details"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                </button>
              )}
              <span className="hidden sm:inline-flex text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 border border-slate-200">
                15 Flats
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Main Meter: <span className="font-mono text-slate-700">{settings.commonMeterNumber}</span>
            </p>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Billing Cycle Selector - only when logged in */}
          {currentSession && (
            <div className="relative">
              <select
                value={activeCycleId}
                onChange={(e) => setActiveCycleId(e.target.value)}
                className="text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                title="Select Billing Month"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.month}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Cloud Sync Status Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg border ${
              cloudSyncStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : cloudSyncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title={
              cloudSyncStatus === 'connected'
                ? 'Cloud Firestore Connected: All resident names, numbers, and bills are automatically synchronized across all devices.'
                : cloudSyncStatus === 'syncing'
                ? 'Connecting to Cloud Database...'
                : 'Local Storage Active: Changes are saved on this phone/browser. Publish Firebase rules to sync across all phones in real-time.'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudSyncStatus === 'connected'
                  ? 'bg-emerald-500'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline">
              {cloudSyncStatus === 'connected'
                ? 'Cloud Synced'
                : cloudSyncStatus === 'syncing'
                ? 'Syncing...'
                : 'Local Storage'}
            </span>
          </div>

          {/* Desktop/Mobile Preview Toggle */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            className="hidden md:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Toggle Mobile Simulator Frame"
          >
            {isMobileFrame ? '📱 Mobile Frame' : '🖥️ Full Width'}
          </button>

          {/* Notification Bell - only when logged in */}
          {currentSession && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs) markAllNotificationsRead();
                }}
                className="relative p-1.5 sm:p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Notifications & Alerts
                    </span>
                    <button
                      onClick={() => setShowNotifs(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Native push enable button */}
                  {'Notification' in window && Notification.permission !== 'granted' && (
                    <div className="my-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2">
                      <span className="text-[11px] text-amber-900 font-medium">
                        Enable free browser alerts for new bills
                      </span>
                      <button
                        onClick={requestPushPermission}
                        className="text-[10px] font-bold px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md shrink-0 shadow-xs"
                      >
                        Allow
                      </button>
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs mt-1">
                    {notifications.length === 0 ? (
                      <div className="py-4 text-center text-slate-400">No notifications yet</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="py-2.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {n.title}
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Lock Screen Button */}
          {currentSession && (
            isAppLocked ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold"
                title="Application is locked"
              >
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Locked</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => lockApp('manual')}
                className="relative p-1.5 sm:p-2 rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                title="Lock Screen Now (Auto-locks after 10 min inactivity)"
              >
                <Lock className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )
          )}

          {/* User / Role Switcher Pill */}
          {currentSession ? (
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors"
              >
                {currentSession.role === 'admin' ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Admin:</span>
                    <span className="text-indigo-700">Secretary</span>
                  </>
                ) : (
                  <>
                    <Home className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Flat {currentSession.flatNumber}</span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Quick Committee Switcher Button if viewing as Resident */}
              {currentSession.isCommitteeMember && currentSession.role === 'resident' && (
                <button
                  type="button"
                  onClick={switchToAdminView}
                  className="hidden md:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition-colors"
                  title="Switch to Secretary Admin Console"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Admin Console</span>
                </button>
              )}

              {/* User Account / Role Menu */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {currentSession.role === 'resident' ? (
                    <div>
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                          {currentSession.flatNumber}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            Flat {currentSession.flatNumber} • {currentSession.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {currentSession.phone}
                          </div>
                        </div>
                      </div>

                      {/* Committee Switcher Action for Resident view */}
                      {currentSession.isCommitteeMember && (
                        <div className="mb-2 p-2 bg-indigo-50/80 border border-indigo-200 rounded-lg">
                          <div className="text-[11px] font-bold text-indigo-900 mb-1 flex items-center gap-1">
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                            Society Committee Privilege
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              switchToAdminView();
                              setShowRoleMenu(false);
                            }}
                            className="w-full py-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            Switch to Admin Console
                          </button>
                        </div>
                      )}

                      {/* Privacy guarantee card */}
                      <div className="p-2 bg-emerald-50 border border-emerald-200/80 rounded-lg mb-2.5 text-[11px] text-emerald-900 leading-relaxed">
                        <div className="font-semibold flex items-center gap-1 text-emerald-800 mb-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Private Resident Access
                        </div>
                        You can only view your own flat's bill and payment receipts. Other flats' statements and payment records are strictly private.
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRoleMenu(false);
                            lockApp('manual');
                          }}
                          className="w-full flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            Lock Screen Now
                          </span>
                          <span className="text-[10px] text-slate-400">10m auto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setShowRoleMenu(false);
                            onOpenLogin?.();
                          }}
                          className="w-full flex items-center gap-1.5 text-xs text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-md font-medium transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out (Flat {currentSession.flatNumber})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                        <div>
                          <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-indigo-600" />
                            Society Admin (Secretary)
                          </div>
                          <div className="text-[10px] text-slate-500">Full Building Management Access</div>
                        </div>
                      </div>

                      {/* Committee Switcher: Switch to Secretary's Flat */}
                      <div className="mb-2 p-2 bg-emerald-50/90 border border-emerald-200 rounded-lg">
                        <div className="text-[11px] font-bold text-emerald-900 mb-1 flex items-center gap-1">
                          <Home className="w-3.5 h-3.5 text-emerald-600" />
                          Committee Resident View
                        </div>
                        <p className="text-[10px] text-emerald-800 mb-1.5">
                          View your own flat's bill and statement as a resident:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            switchToResidentView();
                            setShowRoleMenu(false);
                          }}
                          className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Switch to Flat View
                        </button>
                      </div>

                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 pt-1 pb-1">
                        View Other Resident Bills (Testing)
                      </div>
                      <p className="text-[10px] text-slate-500 px-1 mb-1.5">
                        Select any flat to preview how that resident views their bill:
                      </p>

                      <div className="max-h-36 overflow-y-auto space-y-0.5 pr-1">
                        {flats.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              switchToResidentView(f.id);
                              setShowRoleMenu(false);
                            }}
                            className="w-full flex items-center justify-between text-xs px-2 py-1 rounded-md text-left text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <span className="truncate">
                              Flat {f.flatNumber}{' '}
                              <span className="text-[11px] text-slate-400">({f.ownerName})</span>
                            </span>
                            {f.customRatePerUnit && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded shrink-0">
                                ₹{f.customRatePerUnit}/u
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 pt-1.5 mt-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowRoleMenu(false);
                            lockApp('manual');
                          }}
                          className="w-full flex items-center justify-between text-xs text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                            Lock Screen Now
                          </span>
                          <span className="text-[10px] text-slate-400">10m auto</span>
                        </button>

                        <button
                          onClick={() => {
                            logout();
                            setShowRoleMenu(false);
                            onOpenLogin?.();
                          }}
                          className="w-full flex items-center gap-1.5 text-xs text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-md font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Edit Building Details Modal */}
      {showEditBuildingModal && (
        <EditBuildingModal
          settings={settings}
          isOpen={true}
          onClose={() => setShowEditBuildingModal(false)}
          onSave={(updates) => {
            updateSettings(updates);
          }}
        />
      )}
    </header>
  );
};
