import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';
import {
  HeartPulse,
  UserCheck,
  Stethoscope,
  ShieldCheck,
  FileText,
  ScanLine,
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onOpenIntegrations: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole, onOpenIntegrations }) => {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Anti-Fake Data & Accreditation Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('noFakeDataNotice')}</span>
          </div>

          <button
            onClick={onOpenIntegrations}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>ABDM / BHASHINI / Gemini AI Architecture</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t('landingTitle')}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            {t('landingSubtitle')}
          </p>
        </div>

        {/* Role Portals Grid */}
        <div className="mb-14">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500 mb-8">
            {t('selectPortal')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* 1. Patient Portal */}
            <div className="relative group bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                  <HeartPulse className="w-7 h-7" />
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100/60 text-emerald-800 mb-3">
                  {language === 'en' ? 'Role 1: Self-Service' : 'भूमिका १: स्व-सेवा'}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {t('patientPortalTitle')}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {t('patientPortalDesc')}
                </p>

                <ul className="space-y-2.5 text-xs text-slate-600 mb-6 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>ABHA ID Registration & Demographics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>PDF/Image Report Upload & OCR Extraction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Voice/Text Dynamic Case-Taking in Hindi & English</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>10 Ayurvedic Dashvidha Pariksha Intake</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onSelectRole('patient')}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs hover:shadow-sm transition-all"
              >
                <span>{t('patientPortalTitle')} - {t('loginOrRegister')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Junior Doctor / Medical Assistant */}
            <div className="relative group bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md hover:border-sky-300 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-100/60 text-sky-800 mb-3">
                  {language === 'en' ? 'Role 2: Audit & Triage' : 'भूमिका २: ऑडिट व सत्यापन'}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {t('juniorDoctorPortalTitle')}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {t('juniorDoctorPortalDesc')}
                </p>

                <ul className="space-y-2.5 text-xs text-slate-600 mb-6 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Review Unverified Case Queue</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Compare Original Responses with AI Summary</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Audit & Correct OCR Mistakes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Verification Notes & Route to Main Doctor</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onSelectRole('junior_doctor')}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 shadow-xs hover:shadow-sm transition-all"
              >
                <span>{t('juniorDoctorPortalTitle')} - {t('loginOrRegister')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3. Main Doctor */}
            <div className="relative group bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-200">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div className="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100/60 text-indigo-800 mb-3">
                  {language === 'en' ? 'Role 3: Final Authority' : 'भूमिका ३: मुख्य परामर्श'}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {t('mainDoctorPortalTitle')}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {t('mainDoctorPortalDesc')}
                </p>

                <ul className="space-y-2.5 text-xs text-slate-600 mb-6 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Only Authorized Verified Cases Queue</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Independent Clinical Examination Entry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Confirmed Final Diagnosis (Clinical / Ayurvedic)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Prescription, Diet Advice & Follow-Up Date</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onSelectRole('doctor')}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 shadow-xs hover:shadow-sm transition-all"
              >
                <span>{t('mainDoctorPortalTitle')} - {t('loginOrRegister')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Workflow Overview Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80 mb-3">
                <Lock className="w-3.5 h-3.5" />
                <span>Strict Two-Tier Healthcare Verification Workflow</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                How Patient Data Moves Safely Through the System
              </h3>
              <p className="text-sm text-slate-300 max-w-2xl">
                Patient reports symptoms via Voice/Text & uploads lab reports → AI organizes structured history & Dashvidha Pariksha → Junior Doctor audits & verifies data → Only verified cases appear in Main Doctor's consultation queue → Doctor enters final diagnosis & prescription.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:gap-3 shrink-0">
              <div className="px-3 py-2 bg-slate-800 rounded-lg text-xs font-medium text-slate-200 border border-slate-700">
                1. Patient Intake
              </div>
              <div className="px-3 py-2 bg-slate-800 rounded-lg text-xs font-medium text-slate-200 border border-slate-700">
                2. OCR & Speech
              </div>
              <div className="px-3 py-2 bg-sky-950/80 text-sky-300 rounded-lg text-xs font-medium border border-sky-800">
                3. Assistant Audit
              </div>
              <div className="px-3 py-2 bg-indigo-950/80 text-indigo-300 rounded-lg text-xs font-medium border border-indigo-800">
                4. Doctor Rx
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p>
          Patient Case-Taking Software &copy; {new Date().getFullYear()} Hospital Clinical Information System. Supporting English & Hindi with Ayushman Bharat Digital Mission (ABDM) and Bhashini standards.
        </p>
      </footer>
    </div>
  );
};
