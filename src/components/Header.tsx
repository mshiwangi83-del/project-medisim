import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Activity, Globe, LogOut, Settings, ShieldCheck, UserCheck, Stethoscope, HeartPulse } from 'lucide-react';

interface HeaderProps {
  onOpenIntegrations: () => void;
  onOpenDashvidhaConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenIntegrations, onOpenDashvidhaConfig }) => {
  const { user, profile, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  const getRoleBadge = () => {
    if (!user) return null;
    switch (user.role) {
      case 'patient':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
            {t('role_patient')}
          </span>
        );
      case 'junior_doctor':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <UserCheck className="w-3.5 h-3.5 text-sky-600" />
            {t('role_junior_doctor')}
          </span>
        );
      case 'doctor':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
            {t('role_doctor')}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Hospital Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {t('appName')}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-sm">
                  Clinical v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {t('hospitalSub')}
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Active Role Indicator */}
            {user && getRoleBadge()}

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Change Language / भाषा बदलें"
            >
              <Globe className="w-4 h-4 text-teal-600" />
              <span>{language === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* Integrations Health */}
            <button
              onClick={onOpenIntegrations}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
              title={t('integrationsTitle')}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">ABHA / ABDM</span>
            </button>

            {/* Dashvidha Config for Medical Staff */}
            {user && (user.role === 'doctor' || user.role === 'junior_doctor') && (
              <button
                onClick={onOpenDashvidhaConfig}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                title={t('dashvidhaConfigTitle')}
              >
                <Settings className="w-4 h-4 text-amber-600" />
                <span className="hidden lg:inline">Dashvidha Config</span>
              </button>
            )}

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    @{user.username}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t('logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
