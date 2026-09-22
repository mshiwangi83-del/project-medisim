import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CaseItem, AICaseSummary, JuniorDoctorProfile } from '../../types';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  FileCheck,
  ScanLine,
  Eye,
  ShieldCheck,
  ArrowRight,
  Send,
  AlertCircle,
  Activity,
  User,
  HeartPulse,
} from 'lucide-react';

export const JuniorDoctorDashboard: React.FC = () => {
  const { user, profile, authFetch } = useAuth();
  const { t, language } = useLanguage();

  const jdProfile = profile as JuniorDoctorProfile;

  const [activeTab, setActiveTab] = useState<'pending' | 'verified'>('pending');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  // Review & Verification editing state
  const [editableSummary, setEditableSummary] = useState<AICaseSummary | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/junior-doctor/cases');
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      }
    } catch (err) {
      console.error('Error fetching junior doctor cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const openReviewModal = (caseItem: CaseItem) => {
    setSelectedCase(caseItem);
    setError(null);
    setSuccessMsg(null);
    setVerificationNotes(caseItem.verification_notes || caseItem.junior_doctor_notes || '');

    if (caseItem.verified_summary_json) {
      setEditableSummary(JSON.parse(caseItem.verified_summary_json));
    } else if (caseItem.ai_summary_json) {
      setEditableSummary(JSON.parse(caseItem.ai_summary_json));
    } else {
      setEditableSummary({
        notice: 'AI-Assisted Case Summary – Requires Professional Verification',
        patient_overview: '',
        chief_complaint: caseItem.initial_complaint || '',
        symptoms_analysis: '',
        relevant_history_medications: '',
        report_findings_summary: '',
        patient_reported_details: '',
        dashvidha_pariksha_summary: '',
        clinical_observations: '',
        red_flag_warnings: [],
      });
    }
  };

  const handleVerifyCase = async () => {
    if (!selectedCase || !editableSummary) return;

    setVerifying(true);
    setError(null);

    try {
      const res = await authFetch(`/api/junior-doctor/cases/${selectedCase.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified_summary: {
            ...editableSummary,
            patient_name: selectedCase.patient_name || (editableSummary as any).patient_name,
          },
          verification_notes: verificationNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setSuccessMsg('Case successfully verified and queued for Main Doctor consultation!');
      setTimeout(() => {
        setSelectedCase(null);
        fetchCases();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const pendingCases = cases.filter(
    (c) => c.status === 'ai_summary_generated' || c.status === 'under_review' || c.status === 'draft_case_taking'
  );
  const verifiedCases = cases.filter(
    (c) => c.status === 'verified' || c.status === 'in_consultation' || c.status === 'completed'
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner: Junior Doctor Profile */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {jdProfile?.full_name || user?.full_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  {t('role_junior_doctor')}
                </span>
                {jdProfile?.employee_id && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                    ID: {jdProfile.employee_id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {jdProfile?.department} • {jdProfile?.hospital} • Qualification: {jdProfile?.qualification}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit Responsibility: Verify patient complaints, validate OCR lab findings, review AI case summaries, and flag critical red alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-center">
              <span className="block text-xl font-bold">{pendingCases.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-700">Pending Audit</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center">
              <span className="block text-xl font-bold">{verifiedCases.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-8">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('pendingVerificationTab')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-800 font-bold">
            {pendingCases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('verified')}
          className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'verified'
              ? 'border-sky-700 text-sky-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('verifiedCasesTab')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-bold">
            {verifiedCases.length}
          </span>
        </button>
      </div>

      {/* Cases Queue Table / Cards */}
      <div className="space-y-4">
        {activeTab === 'pending' ? (
          pendingCases.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{t('noPendingCases')}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All patient intakes have been audited and verified. New intakes will appear here automatically.
              </p>
            </div>
          ) : (
            pendingCases.map((c) => {
              const redFlags = c.red_flags_json ? JSON.parse(c.red_flags_json) : [];

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-sky-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        Case #{c.id.slice(0, 8)}
                      </span>
                      <span className="font-bold text-slate-900 text-base">
                        {c.patient_name || 'Patient'}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({c.patient_gender}, {c.patient_age} Yrs)
                      </span>
                      {c.patient_blood_group && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                          {c.patient_blood_group}
                        </span>
                      )}
                      {redFlags.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Red Flag Alert</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-900">Complaint: </span>
                      {c.initial_complaint}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span>Submitted: {new Date(c.created_at).toLocaleString()}</span>
                      {c.patient_abha_id && <span>ABHA: {c.patient_abha_id}</span>}
                      {c.speech_transcript && (
                        <span className="text-teal-700 font-semibold flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5" />
                          Voice Transcribed
                        </span>
                      )}
                      {c.reports && c.reports.length > 0 && (
                        <span className="text-sky-700 font-semibold flex items-center gap-1">
                          <ScanLine className="w-3.5 h-3.5" />
                          {c.reports.length} Reports Attached
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => openReviewModal(c)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 shadow-xs hover:shadow-sm transition-all shrink-0"
                  >
                    <span>Audit & Verify Case</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )
        ) : (
          verifiedCases.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-3">
              <h3 className="text-sm font-bold text-slate-800">No verified cases yet</h3>
            </div>
          ) : (
            verifiedCases.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">#{c.id.slice(0, 8)}</span>
                    <span className="font-bold text-slate-900 text-sm">{c.patient_name}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {c.status === 'completed' ? 'Consultation Completed' : 'Verified & In Doctor Queue'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">Complaint: {c.initial_complaint}</p>
                  <p className="text-[11px] text-slate-400">
                    Verified at: {c.junior_doctor_verified_at || c.updated_at} by {c.junior_doctor_name || 'Assistant'}
                  </p>
                </div>

                <button
                  onClick={() => openReviewModal(c)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Verified Summary</span>
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* Case Review & Verification Modal */}
      {selectedCase && editableSummary && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t('verifyCaseTitle')} - Case #{selectedCase.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <span className="font-semibold text-slate-800">{selectedCase.patient_name}</span> ({selectedCase.patient_gender}, {selectedCase.patient_age} Yrs) • ABHA: {selectedCase.patient_abha_id || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Notification Messages */}
            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Modal Body: Split Screen Audit Workspace */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Mandatory Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold block">{t('summaryMandatoryNotice')}</span>
                  <span>Please review the AI-assisted extraction against the original patient responses. You can edit any summary field before sending it to the Main Doctor.</span>
                </div>
              </div>

              {/* Red-Flag Banner if present */}
              {editableSummary.red_flag_warnings && editableSummary.red_flag_warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Potential Clinical Red Flag Detected:</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-rose-900 font-semibold">
                    {editableSummary.red_flag_warnings.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Original Patient Inputs & Reports */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                    {t('originalPatientResponses')}
                  </h4>

                  {/* Initial Complaint */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-700 block">Reported Problem:</span>
                    <p className="text-slate-900 font-medium">"{selectedCase.initial_complaint}"</p>
                  </div>

                  {/* Speech Transcript */}
                  {selectedCase.speech_transcript && (
                    <div className="p-3.5 bg-teal-50/50 rounded-xl border border-teal-200 text-xs space-y-1">
                      <span className="font-bold text-teal-900 block flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-teal-700" />
                        Patient Speech Transcript:
                      </span>
                      <p className="text-slate-800 font-medium">"{selectedCase.speech_transcript}"</p>
                    </div>
                  )}

                  {/* Patient Medical History */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <span className="font-bold text-slate-700 block">Baseline Medical Profile:</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>Allergies: <span className="font-semibold text-slate-800">{selectedCase.patient_allergies || 'None'}</span></div>
                      <div>Existing Conditions: <span className="font-semibold text-slate-800">{selectedCase.patient_existing_conditions || 'None'}</span></div>
                      <div>Current Medications: <span className="font-semibold text-slate-800">{selectedCase.patient_current_medications || 'None'}</span></div>
                      <div>Surgical History: <span className="font-semibold text-slate-800">{selectedCase.patient_surgical_history || 'None'}</span></div>
                    </div>
                  </div>

                  {/* Attached Reports & OCR Text */}
                  {selectedCase.reports && selectedCase.reports.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-slate-700 block">
                        Attached Lab Reports ({selectedCase.reports.length}):
                      </span>
                      {selectedCase.reports.map((r) => (
                        <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{r.title} ({r.report_type})</span>
                            <span className="text-[10px] font-mono text-slate-500">{r.file_name}</span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 max-h-24 overflow-y-auto">
                            {r.ocr_verified_text || r.ocr_extracted_text || 'No text extracted.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ayurvedic Dashvidha Responses */}
                  {selectedCase.dashvidha_responses_json && (
                    <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-2">
                      <span className="font-bold text-amber-950 block">Ayurvedic Dashvidha Responses:</span>
                      <div className="space-y-1 max-h-40 overflow-y-auto text-[11px]">
                        {Object.entries(JSON.parse(selectedCase.dashvidha_responses_json)).map(([k, v]) => (
                          <div key={k} className="flex justify-between border-b border-amber-100 py-1">
                            <span className="font-semibold uppercase text-amber-900">{k}:</span>
                            <span className="text-slate-800">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Editable Case Summary & Verification Notes */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                    {t('aiSummaryReview')}
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chief Complaint (Audited):
                    </label>
                    <input
                      type="text"
                      value={editableSummary.chief_complaint || ''}
                      onChange={(e) => setEditableSummary({ ...editableSummary, chief_complaint: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Symptoms Analysis (Audited):
                    </label>
                    <textarea
                      rows={3}
                      value={editableSummary.symptoms_analysis || ''}
                      onChange={(e) => setEditableSummary({ ...editableSummary, symptoms_analysis: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Report Findings Summary:
                    </label>
                    <textarea
                      rows={2}
                      value={editableSummary.report_findings_summary || ''}
                      onChange={(e) => setEditableSummary({ ...editableSummary, report_findings_summary: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ayurvedic Dashvidha Summary:
                    </label>
                    <textarea
                      rows={2}
                      value={editableSummary.dashvidha_pariksha_summary || ''}
                      onChange={(e) => setEditableSummary({ ...editableSummary, dashvidha_pariksha_summary: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-600 bg-white"
                    />
                  </div>

                  {/* Verification Notes */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-xs font-bold text-sky-900 mb-1">
                      {t('verificationNotesLabel')} *
                    </label>
                    <textarea
                      rows={3}
                      value={verificationNotes}
                      onChange={(e) => setVerificationNotes(e.target.value)}
                      placeholder={t('verificationNotesPlaceholder')}
                      className="w-full p-2.5 rounded-xl border border-sky-300 text-xs focus:ring-2 focus:ring-sky-600 bg-sky-50/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {t('cancel')}
              </button>

              <button
                type="button"
                onClick={handleVerifyCase}
                disabled={verifying}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
              >
                {verifying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('markAsVerifiedBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
