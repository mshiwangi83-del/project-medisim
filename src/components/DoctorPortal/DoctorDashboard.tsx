import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CaseItem, PrescriptionItem, DoctorProfile, AICaseSummary } from '../../types';
import { PrescriptionViewModal } from '../PatientPortal/PrescriptionViewModal';
import {
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Calendar,
  FileText,
  UserCheck,
  ShieldCheck,
  Activity,
  HeartPulse,
  Pill,
  Eye,
  AlertCircle,
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user, profile, authFetch } = useAuth();
  const { t, language } = useLanguage();

  const docProfile = profile as DoctorProfile;

  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Consultation Workspace State
  const [activeCase, setActiveCase] = useState<CaseItem | null>(null);
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [doctorAdvice, setDoctorAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      medicine_name: '',
      dosage: '1 Tab',
      frequency: 'Twice daily (BD)',
      timing: 'After meals',
      duration: '5 days',
      instructions: 'With warm water',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Prescription View Modal
  const [viewPrescriptionCase, setViewPrescriptionCase] = useState<CaseItem | null>(null);

  const fetchDoctorCases = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/doctor/cases');
      if (res.ok) {
        const data = await res.json();
        setCases(data.cases || []);
      }
    } catch (err) {
      console.error('Error fetching doctor cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorCases();
  }, []);

  const openConsultation = (caseItem: CaseItem) => {
    setActiveCase(caseItem);
    setError(null);
    setSuccessMsg(null);

    // Pre-populate if already in progress or completed
    setClinicalObservations(caseItem.clinical_observations || '');
    setDiagnosis(caseItem.doctor_diagnosis || caseItem.diagnosis || '');
    setDoctorAdvice(caseItem.doctor_advice || 'Maintain balanced diet (Pathya), avoid heavy and oily foods (Apathya), drink warm water, take prescribed medicines on time.');
    setFollowUpDate(caseItem.follow_up_date || '');
    setDoctorNotes(caseItem.doctor_notes || '');

    if (caseItem.prescription_items_json) {
      try {
        setPrescriptions(JSON.parse(caseItem.prescription_items_json));
      } catch (e) {
        // default
      }
    } else {
      setPrescriptions([
        {
          medicine_name: '',
          dosage: '1 Tab / 5ml',
          frequency: 'Twice daily (BD)',
          timing: 'After meals',
          duration: '5 days',
          instructions: 'With warm water (Ushnodaka)',
        },
      ]);
    }
  };

  const addPrescriptionRow = () => {
    setPrescriptions([
      ...prescriptions,
      {
        medicine_name: '',
        dosage: '1 Tab / 1 Spoon',
        frequency: 'Twice daily (BD)',
        timing: 'After meals',
        duration: '7 days',
        instructions: 'With warm water',
      },
    ]);
  };

  const updatePrescriptionRow = (index: number, field: keyof PrescriptionItem, value: string) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
  };

  const removePrescriptionRow = (index: number) => {
    if (prescriptions.length === 1) return;
    setPrescriptions(prescriptions.filter((_, idx) => idx !== index));
  };

  const handleFinalizeConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;

    if (!diagnosis.trim()) {
      setError(language === 'en' ? 'Please enter a confirmed diagnosis' : 'कृपया पुष्ट निदान दर्ज करें');
      return;
    }

    const validMeds = prescriptions.filter((p) => p.medicine_name.trim().length > 0);
    if (validMeds.length === 0) {
      setError(language === 'en' ? 'Please enter at least one prescribed medicine' : 'कृपया कम से कम एक दवा का नाम दर्ज करें');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/doctor/cases/${activeCase.id}/consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinical_observations: clinicalObservations,
          diagnosis,
          prescription_items: validMeds,
          doctor_advice: doctorAdvice,
          follow_up_date: followUpDate,
          doctor_notes: doctorNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to finalize consultation');

      setSuccessMsg('Consultation finalized! Prescription is now officially signed and available on the patient dashboard.');
      setTimeout(() => {
        setActiveCase(null);
        fetchDoctorCases();
      }, 1400);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Only verified cases queue for active doctor consultation
  const verifiedQueue = cases.filter((c) => c.status === 'verified' || c.status === 'in_consultation');
  const consultationHistory = cases.filter((c) => c.status === 'completed');

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner: Doctor Profile */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
              <Stethoscope className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Dr. {docProfile?.full_name || user?.full_name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {t('role_doctor')}
                </span>
                {docProfile?.doctor_reg_id && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                    Reg: {docProfile.doctor_reg_id}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {docProfile?.specialization} • {docProfile?.department} • {docProfile?.hospital}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Clinical Standard: Main Doctor consultation queue only receives patient cases that have passed Junior Doctor audit & verification.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-center">
              <span className="block text-xl font-bold">{verifiedQueue.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">Ready in Queue</span>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center">
              <span className="block text-xl font-bold">{consultationHistory.length}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Completed Rx</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex space-x-8">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'queue'
              ? 'border-indigo-700 text-indigo-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>{t('verifiedQueueTab')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800 font-bold">
            {verifiedQueue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-700 text-indigo-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Completed Consultations</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
            {consultationHistory.length}
          </span>
        </button>
      </div>

      {/* QUEUE TAB */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {verifiedQueue.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">{t('noVerifiedCases')}</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cases audited and verified by Junior Doctors / Medical Assistants will appear here ready for examination and prescription.
              </p>
            </div>
          ) : (
            verifiedQueue.map((c) => {
              const redFlags = c.red_flags_json ? JSON.parse(c.red_flags_json) : [];

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        Case #{c.id.slice(0, 8)}
                      </span>
                      <span className="font-bold text-slate-900 text-base">
                        {c.patient_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({c.patient_gender}, {c.patient_age} Yrs)
                      </span>
                      {c.patient_blood_group && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                          {c.patient_blood_group}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified by {c.junior_doctor_name || 'Assistant'}</span>
                      </span>
                      {redFlags.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Red Flag</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="font-semibold text-slate-900">Chief Complaint: </span>
                      {c.initial_complaint}
                    </p>

                    {c.junior_doctor_notes && (
                      <div className="text-xs text-sky-900 bg-sky-50/70 p-2 rounded-lg border border-sky-200">
                        <span className="font-bold">Assistant Note: </span>
                        {c.junior_doctor_notes}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => openConsultation(c)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 shadow-xs hover:shadow-sm transition-all shrink-0"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Open Consultation</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {consultationHistory.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-2xl p-12 text-center bg-white space-y-3">
              <h3 className="text-sm font-bold text-slate-800">No completed consultations yet</h3>
            </div>
          ) : (
            consultationHistory.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">#{c.id.slice(0, 8)}</span>
                    <span className="font-bold text-slate-900 text-sm">{c.patient_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Completed
                    </span>
                  </div>
                  <p className="text-xs font-bold text-indigo-950">
                    Diagnosis: {c.doctor_diagnosis || c.diagnosis}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Completed on: {new Date(c.completed_at || c.updated_at).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openConsultation(c)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <span>Edit Consultation</span>
                  </button>
                  <button
                    onClick={() => setViewPrescriptionCase(c)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 transition-colors shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Prescription</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Main Doctor Consultation Workspace Modal */}
      {activeCase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t('consultationWorkspaceTitle')} - #{activeCase.id.slice(0, 8)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <span className="font-bold text-slate-900">{activeCase.patient_name}</span> ({activeCase.patient_gender}, {activeCase.patient_age} Yrs) • Blood: {activeCase.patient_blood_group || 'N/A'} • ABHA: {activeCase.patient_abha_id || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCase(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

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

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Patient Case Intake Review Panel (Verified summary & Assistant notes) */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Junior Doctor Verified Clinical Summary</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Audited by {activeCase.junior_doctor_name || 'Medical Assistant'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-semibold text-slate-700 block">Patient Problem:</span>
                    <p className="text-slate-900 bg-white p-2 rounded border border-slate-200 mt-1">"{activeCase.initial_complaint}"</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 block">Assistant Notes / Instructions:</span>
                    <p className="text-slate-900 bg-sky-50/50 p-2 rounded border border-sky-200 mt-1">
                      {activeCase.junior_doctor_notes || activeCase.verification_notes || 'All entries verified. No adverse discrepancies found.'}
                    </p>
                  </div>
                </div>

                {/* Baseline Details */}
                <div className="text-[11px] text-slate-600 flex flex-wrap gap-4 pt-1 border-t border-slate-200">
                  <span><strong>Allergies:</strong> {activeCase.patient_allergies || 'None'}</span>
                  <span><strong>Conditions:</strong> {activeCase.patient_existing_conditions || 'None'}</span>
                  <span><strong>Current Meds:</strong> {activeCase.patient_current_medications || 'None'}</span>
                  <span><strong>Surgical History:</strong> {activeCase.patient_surgical_history || 'None'}</span>
                </div>
              </div>

              {/* Consultation Form */}
              <form onSubmit={handleFinalizeConsultation} className="space-y-6">
                {/* 1. Clinical Observations & Physical Examination */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {t('clinicalObservationsLabel')}
                  </label>
                  <textarea
                    rows={3}
                    value={clinicalObservations}
                    onChange={(e) => setClinicalObservations(e.target.value)}
                    placeholder={t('clinicalObservationsPlaceholder')}
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 bg-white leading-relaxed"
                  />
                </div>

                {/* 2. Confirmed Diagnosis (Doctor Decision) */}
                <div>
                  <label className="block text-xs font-bold text-indigo-950 mb-1">
                    {t('diagnosisLabel')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder={t('diagnosisPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-indigo-200 text-sm font-bold text-indigo-950 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                  />
                </div>

                {/* 3. Prescription Builder Table (Rx) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-serif font-bold text-slate-900">℞</span>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {t('prescriptionHeader')} *
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={addPrescriptionRow}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('addMedicine')}</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">{t('medName')} *</th>
                          <th className="py-2.5 px-3">{t('medDosage')}</th>
                          <th className="py-2.5 px-3">{t('medFreq')}</th>
                          <th className="py-2.5 px-3">{t('medTiming')}</th>
                          <th className="py-2.5 px-3">{t('medDuration')}</th>
                          <th className="py-2.5 px-3">{t('medInstructions')}</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {prescriptions.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2">
                              <input
                                type="text"
                                required
                                value={p.medicine_name}
                                onChange={(e) => updatePrescriptionRow(idx, 'medicine_name', e.target.value)}
                                placeholder="e.g. Ashwagandha Churna / Amoxicillin"
                                className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-600"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={p.dosage}
                                onChange={(e) => updatePrescriptionRow(idx, 'dosage', e.target.value)}
                                placeholder="1 Tab / 3gm"
                                className="w-24 px-2 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-600"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={p.frequency}
                                onChange={(e) => updatePrescriptionRow(idx, 'frequency', e.target.value)}
                                className="w-32 px-2 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-600"
                              >
                                <option value="Once daily (OD)">Once daily (OD)</option>
                                <option value="Twice daily (BD)">Twice daily (BD)</option>
                                <option value="Thrice daily (TDS)">Thrice daily (TDS)</option>
                                <option value="Four times daily (QID)">Four times (QID)</option>
                                <option value="As needed (SOS)">As needed (SOS)</option>
                                <option value="At bedtime (HS)">At bedtime (HS)</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <select
                                value={p.timing}
                                onChange={(e) => updatePrescriptionRow(idx, 'timing', e.target.value)}
                                className="w-28 px-2 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-600"
                              >
                                <option value="After meals">After meals</option>
                                <option value="Before meals">Before meals</option>
                                <option value="With meals">With meals</option>
                                <option value="Empty stomach">Empty stomach</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={p.duration}
                                onChange={(e) => updatePrescriptionRow(idx, 'duration', e.target.value)}
                                placeholder="5 days / 2 wks"
                                className="w-24 px-2 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-600"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={p.instructions || ''}
                                onChange={(e) => updatePrescriptionRow(idx, 'instructions', e.target.value)}
                                placeholder="Warm water / milk"
                                className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-600"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removePrescriptionRow(idx)}
                                disabled={prescriptions.length === 1}
                                className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Doctor Advice, Diet & Lifestyle (Pathya / Apathya) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {t('doctorAdviceLabel')}
                    </label>
                    <textarea
                      rows={3}
                      value={doctorAdvice}
                      onChange={(e) => setDoctorAdvice(e.target.value)}
                      placeholder={t('doctorAdvicePlaceholder')}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      {t('followUpDateLabel')}
                    </label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Suggested re-evaluation interval
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveCase(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {t('cancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Signing Consultation...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('finalizeConsultationBtn')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Prescription View Modal */}
      {viewPrescriptionCase && (
        <PrescriptionViewModal
          caseItem={viewPrescriptionCase}
          onClose={() => setViewPrescriptionCase(null)}
        />
      )}
    </div>
  );
};
