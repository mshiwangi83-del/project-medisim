import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CaseItem, MedicalReport, PatientProfile } from '../../types';
import { ReportUploadOCRModal } from './ReportUploadOCRModal';
import { NewCaseWorkflow } from './NewCaseWorkflow';
import { PrescriptionViewModal } from './PrescriptionViewModal';
import { UpdatePatientProfileModal } from './UpdatePatientProfileModal';
import { UpdateCaseModal } from './UpdateCaseModal';
import { CaseDetailsModal } from './CaseDetailsModal';
import {
  HeartPulse,
  PlusCircle,
  FileText,
  ScanLine,
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronRight,
  Eye,
  Calendar,
  AlertCircle,
  Stethoscope,
  Activity,
  FileCheck,
  Edit,
  Sparkles,
} from 'lucide-react';

export const PatientDashboard: React.FC = () => {
  const { user, profile, authFetch, refreshProfile } = useAuth();
  const { t, language } = useLanguage();

  const patientProfile = profile as PatientProfile;

  const [activeTab, setActiveTab] = useState<'cases' | 'reports' | 'prescriptions'>('cases');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Workflows
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewCaseWorkflow, setShowNewCaseWorkflow] = useState(false);
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [selectedCaseForUpdate, setSelectedCaseForUpdate] = useState<CaseItem | null>(null);
  const [selectedCaseForDetails, setSelectedCaseForDetails] = useState<CaseItem | null>(null);
  const [selectedCaseForPrescription, setSelectedCaseForPrescription] = useState<CaseItem | null>(null);
  const [selectedReportView, setSelectedReportView] = useState<MedicalReport | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [casesRes, reportsRes] = await Promise.all([
        authFetch('/api/patient/cases'),
        authFetch('/api/patient/reports'),
      ]);

      if (casesRes.ok) {
        const casesData = await casesRes.json();
        const casesList = Array.isArray(casesData) ? casesData : (casesData.cases || []);
        setCases(casesList);
      }
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        const reportsList = Array.isArray(reportsData) ? reportsData : (reportsData.reports || []);
        setReports(reportsList);
      }
    } catch (err) {
      console.error('Error fetching patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft_case_taking':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {t('status_draft')}
          </span>
        );
      case 'ai_summary_generated':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>{t('status_ai_summary_generated')}</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
            <Activity className="w-3 h-3 text-sky-600" />
            <span>{t('status_under_review')}</span>
          </span>
        );
      case 'verified':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            <span>{t('status_verified')}</span>
          </span>
        );
      case 'in_consultation':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
            <Stethoscope className="w-3 h-3 text-indigo-600" />
            <span>{t('status_in_consultation')}</span>
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('status_completed')}</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (showNewCaseWorkflow) {
    return (
      <NewCaseWorkflow
        onCaseComplete={() => {
          setShowNewCaseWorkflow(false);
          fetchData();
        }}
        onCancel={() => setShowNewCaseWorkflow(false)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner: Patient Profile & Quick Actions */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {patientProfile?.full_name || user?.full_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {patientProfile?.gender || 'Patient'} • {patientProfile?.age} Yrs
                </span>
                {patientProfile?.blood_group && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Blood: {patientProfile.blood_group}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-slate-700">{t('abhaId')}:</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-bold">
                    {patientProfile?.abha_id || 'Not Assigned'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">{t('phone')}:</span> {patientProfile?.phone || user?.phone}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">{t('emergencyContact')}:</span> {patientProfile?.emergency_contact_name} ({patientProfile?.emergency_contact_phone})
                </div>
              </div>

              {/* Allergies & Conditions pills */}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {patientProfile?.allergies && (
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                    Allergies: {patientProfile.allergies}
                  </span>
                )}
                {patientProfile?.existing_conditions && (
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                    Conditions: {patientProfile.existing_conditions}
                  </span>
                )}
                {patientProfile?.current_medications && (
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                    Medications: {patientProfile.current_medications}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <button
              onClick={() => setShowUpdateProfileModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors shadow-2xs"
            >
              <Edit className="w-4 h-4 text-slate-600" />
              <span>{t('updateMedicalRecordsBtn')}</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors shadow-2xs"
            >
              <ScanLine className="w-4 h-4 text-teal-600" />
              <span>{t('uploadReportBtn')}</span>
            </button>

            <button
              onClick={() => setShowNewCaseWorkflow(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('startNewCase')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div>
        <div className="flex border-b border-slate-200 space-x-8">
          <button
            onClick={() => setActiveTab('cases')}
            className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'cases'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{t('tabCases')}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
              {cases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'reports'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>{t('tabReports')}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
              {reports.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'prescriptions'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>{t('tabPrescriptions')}</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
              {cases.filter((c) => c.status === 'completed').length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: CASES CONSULTATION LIST */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          {cases.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{t('noCasesYet')}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {t('startFirstCasePrompt')}
                </p>
              </div>
              <button
                onClick={() => setShowNewCaseWorkflow(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('startNewCase')}</span>
              </button>
            </div>
          ) : (
            cases.map((c) => {
              const aiSummary = c.ai_summary_json ? JSON.parse(c.ai_summary_json) : null;
              const redFlags = c.red_flags_json ? JSON.parse(c.red_flags_json) : [];

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-xs font-mono text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                        #{c.id.slice(0, 8)}
                      </span>
                      <span className="text-xs font-bold text-slate-800 bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full border border-teal-200">
                        {t('caseAttachedTo')}: {c.patient_name || patientProfile?.full_name || user?.full_name}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(c.created_at).toLocaleDateString()} at {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {getStatusBadge(c.status)}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {t('currentProblemQuestion')}
                    </h4>
                    <p className="text-sm font-semibold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      "{c.initial_complaint}"
                    </p>
                  </div>

                  {c.speech_transcript && (
                    <div className="text-xs text-slate-600 bg-teal-50/40 p-2.5 rounded-lg border border-teal-100 flex items-start gap-2">
                      <FileCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-teal-900">Voice Input Transcription: </span>
                        <span>{c.speech_transcript}</span>
                      </div>
                    </div>
                  )}

                  {redFlags && redFlags.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-semibold">Red Flag Note: {redFlags.join(', ')}</span>
                    </div>
                  )}

                  {/* AI Case Summary Snippet Attached with Patient Name */}
                  {aiSummary && (
                    <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-teal-950">
                          <Sparkles className="w-4 h-4 text-teal-700" />
                          <span>AI Clinical Summary • Patient: {aiSummary.patient_name || c.patient_name || patientProfile?.full_name}</span>
                        </div>
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-semibold">
                          Attached to Patient Name
                        </span>
                      </div>
                      {aiSummary.symptoms_analysis && (
                        <p className="text-slate-700 line-clamp-2">
                          <span className="font-bold text-slate-800">Analysis: </span>
                          {aiSummary.symptoms_analysis}
                        </p>
                      )}
                      {aiSummary.clinical_observations && (
                        <p className="text-slate-600 line-clamp-1 text-[11px]">
                          <span className="font-bold text-slate-700">Exam Notes: </span>
                          {aiSummary.clinical_observations}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Bar for Case: View Dossier, Update Case & Summary, Prescription */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCaseForDetails(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('viewCaseDetails')}</span>
                      </button>

                      <button
                        onClick={() => setSelectedCaseForUpdate(c)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors shadow-2xs"
                      >
                        <Edit className="w-3.5 h-3.5 text-teal-600" />
                        <span>{t('updateCaseBtn')}</span>
                      </button>
                    </div>

                    {/* Doctor Results if Completed */}
                    {c.status === 'completed' && (
                      <button
                        onClick={() => setSelectedCaseForPrescription(c)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
                      >
                        <Pill className="w-3.5 h-3.5" />
                        <span>View Prescription</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: MEDICAL REPORTS & OCR SCANNER */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Diagnostic Reports & OCR Archive
              </h3>
              <p className="text-xs text-slate-500">
                Uploaded laboratory, pathology and imaging documents scanned with OCR
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
            >
              <ScanLine className="w-4 h-4" />
              <span>{t('uploadReportBtn')}</span>
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <ScanLine className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{t('noReportsYet')}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Upload pathology, radiology or discharge slips to extract medical text with OCR.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
              >
                <ScanLine className="w-4 h-4" />
                <span>{t('uploadReportBtn')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {report.title}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {report.report_type} • {new Date(report.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {t('badgeOcr')}
                      </span>
                      {report.is_ocr_verified === 1 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                          {t('badgeVerified')}
                        </span>
                      )}
                    </div>

                    {/* Preview of OCR Verified Text */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 max-h-32 overflow-y-auto">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        OCR Extracted & Verified Text:
                      </span>
                      <p className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {report.ocr_verified_text || report.ocr_extracted_text || 'No text extracted.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">
                      {report.file_name}
                    </span>
                    <button
                      onClick={() => setSelectedReportView(report)}
                      className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:text-teal-900"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Full OCR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PRESCRIPTIONS & ADVICE */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {cases.filter((c) => c.status === 'completed').length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Pill className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{t('noPrescriptionsYet')}</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  When the main doctor completes your consultation, confirmed diagnosis and prescription orders will be listed here.
                </p>
              </div>
            </div>
          ) : (
            cases
              .filter((c) => c.status === 'completed')
              .map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        Case ID: {c.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {new Date(c.completed_at || c.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-indigo-950">
                      {c.doctor_diagnosis || c.diagnosis}
                    </h4>
                    <p className="text-xs text-slate-600">
                      Prescribing Physician: <span className="font-semibold text-slate-800">Dr. {c.consulting_doctor_name || 'Senior Consultant'}</span>
                    </p>
                    {c.follow_up_date && (
                      <p className="text-xs text-teal-700 font-semibold flex items-center gap-1 pt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Next Follow-Up: {c.follow_up_date}</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedCaseForPrescription(c)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 transition-colors shadow-xs shrink-0"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View / Print Prescription Slip</span>
                  </button>
                </div>
              ))
          )}
        </div>
      )}

      {/* Modals */}
      {showUpdateProfileModal && (
        <UpdatePatientProfileModal
          onClose={() => setShowUpdateProfileModal(false)}
          onSaved={() => {
            fetchData();
          }}
        />
      )}

      {selectedCaseForUpdate && (
        <UpdateCaseModal
          caseItem={selectedCaseForUpdate}
          onClose={() => setSelectedCaseForUpdate(null)}
          onCaseUpdated={(updated) => {
            fetchData();
          }}
        />
      )}

      {selectedCaseForDetails && (
        <CaseDetailsModal
          caseItem={selectedCaseForDetails}
          onClose={() => setSelectedCaseForDetails(null)}
          onOpenUpdate={() => {
            const caseToUpdate = selectedCaseForDetails;
            setSelectedCaseForDetails(null);
            setSelectedCaseForUpdate(caseToUpdate);
          }}
          onOpenPrescription={() => {
            const caseForPrescription = selectedCaseForDetails;
            setSelectedCaseForDetails(null);
            setSelectedCaseForPrescription(caseForPrescription);
          }}
        />
      )}

      {showUploadModal && (
        <ReportUploadOCRModal
          onClose={() => setShowUploadModal(false)}
          onReportSaved={() => {
            fetchData();
          }}
        />
      )}

      {selectedCaseForPrescription && (
        <PrescriptionViewModal
          caseItem={selectedCaseForPrescription}
          onClose={() => setSelectedCaseForPrescription(null)}
        />
      )}

      {/* Report OCR Detail View Modal */}
      {selectedReportView && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedReportView.title}</h3>
                <p className="text-xs text-slate-500">{selectedReportView.report_type} • {selectedReportView.file_name}</p>
              </div>
              <button
                onClick={() => setSelectedReportView(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Verified OCR Text Extracted from Document:
                </span>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800">
                  {selectedReportView.ocr_verified_text || selectedReportView.ocr_extracted_text || 'No text extracted.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
