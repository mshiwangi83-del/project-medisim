import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { CaseItem, DynamicQAAnswer, AICaseSummary } from '../../types';
import {
  FileText,
  User,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  Stethoscope,
  Pill,
  Edit,
  X,
  Printer,
  ShieldCheck,
} from 'lucide-react';

interface CaseDetailsModalProps {
  caseItem: CaseItem;
  onClose: () => void;
  onOpenUpdate: () => void;
  onOpenPrescription?: () => void;
}

export const CaseDetailsModal: React.FC<CaseDetailsModalProps> = ({
  caseItem,
  onClose,
  onOpenUpdate,
  onOpenPrescription,
}) => {
  const { t } = useLanguage();

  const aiSummary: AICaseSummary | any = caseItem.ai_summary_json
    ? JSON.parse(caseItem.ai_summary_json)
    : null;

  const redFlags: string[] = caseItem.red_flags_json
    ? JSON.parse(caseItem.red_flags_json)
    : [];

  const dynamicQA: DynamicQAAnswer[] = caseItem.dynamic_qa_json
    ? JSON.parse(caseItem.dynamic_qa_json)
    : [];

  const dashvidha: Record<string, string> = caseItem.dashvidha_responses_json
    ? JSON.parse(caseItem.dashvidha_responses_json)
    : {};

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Hospital Clinical Dossier
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Case #{caseItem.id.slice(0, 8)}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {t('caseAttachedTo')}: <span className="font-bold text-slate-900">{caseItem.patient_name || 'Patient'}</span> • ABHA: <span className="font-mono text-slate-800 font-semibold">{caseItem.patient_abha_id || 'Not Assigned'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUpdate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>{t('updateCaseBtn')}</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Patient Attached Record Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {caseItem.patient_name ? caseItem.patient_name[0] : 'P'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {caseItem.patient_name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {caseItem.patient_gender} • {caseItem.patient_age} Yrs • Blood: {caseItem.patient_blood_group || 'N/A'} • Phone: {caseItem.patient_phone || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-slate-500">
                <div className="flex items-center gap-1 sm:justify-end">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Created: {new Date(caseItem.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1 sm:justify-end mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Last Updated: {new Date(caseItem.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>

            {(caseItem.patient_allergies || caseItem.patient_existing_conditions || caseItem.patient_current_medications) && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap gap-2 text-xs">
                {caseItem.patient_allergies && (
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                    Allergies: {caseItem.patient_allergies}
                  </span>
                )}
                {caseItem.patient_existing_conditions && (
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-200/70 text-slate-800 border border-slate-300 font-medium">
                    Conditions: {caseItem.patient_existing_conditions}
                  </span>
                )}
                {caseItem.patient_current_medications && (
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-medium">
                    Meds: {caseItem.patient_current_medications}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Chief Complaint */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Chief Complaint & Symptoms
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900">
              "{caseItem.initial_complaint}"
            </div>
            {caseItem.speech_transcript && (
              <div className="mt-2 p-3 rounded-xl bg-teal-50/60 border border-teal-100 text-xs text-slate-700">
                <span className="font-bold text-teal-900">Spoken Voice Transcript: </span>
                <span>{caseItem.speech_transcript}</span>
              </div>
            )}
          </div>

          {/* Red Flag Alerts if any */}
          {redFlags && redFlags.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Clinical Red Flag Alerts Detected</span>
              </div>
              <ul className="list-disc list-inside text-xs space-y-0.5 pl-1">
                {redFlags.map((flag, idx) => (
                  <li key={idx} className="font-medium">{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Case Summary Attached with Patient Name */}
          {aiSummary && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/20 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <h4 className="text-sm font-bold text-teal-950">
                    AI Clinical Case Summary
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-100/60 px-2 py-0.5 rounded-md border border-teal-200">
                  Attached to: {aiSummary.patient_name || caseItem.patient_name}
                </span>
              </div>

              {aiSummary.notice && (
                <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {aiSummary.notice}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {aiSummary.patient_overview && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Patient Overview:</span>
                    <p className="text-slate-600 leading-relaxed">{aiSummary.patient_overview}</p>
                  </div>
                )}

                {aiSummary.symptoms_analysis && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Symptoms Analysis:</span>
                    <p className="text-slate-600 leading-relaxed">{aiSummary.symptoms_analysis}</p>
                  </div>
                )}

                {aiSummary.relevant_history_medications && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Medical Background:</span>
                    <p className="text-slate-600 leading-relaxed">{aiSummary.relevant_history_medications}</p>
                  </div>
                )}

                {aiSummary.dashvidha_pariksha_summary && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block mb-1">Dashvidha Pariksha Summary:</span>
                    <p className="text-slate-600 leading-relaxed">{aiSummary.dashvidha_pariksha_summary}</p>
                  </div>
                )}
              </div>

              {aiSummary.clinical_observations && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Clinical Physical Examination Points:</span>
                  <p className="text-slate-600 leading-relaxed">{aiSummary.clinical_observations}</p>
                </div>
              )}

              {aiSummary.patient_updated_notes && (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                  <span className="font-bold text-indigo-900 block mb-1">Patient Updated Notes:</span>
                  <p className="text-indigo-800 leading-relaxed">{aiSummary.patient_updated_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Follow-Up Answers */}
          {dynamicQA && dynamicQA.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dynamic Follow-Up Questions & Answers ({dynamicQA.length})</span>
              </h4>
              <div className="space-y-2">
                {dynamicQA.map((qa, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-800 block">Q: {qa.question}</span>
                    <p className="text-slate-700 font-medium">A: {qa.answer || 'Not answered'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dashvidha Responses */}
          {dashvidha && Object.keys(dashvidha).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Ayurvedic Dashvidha Pariksha 10-Fold Assessment</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(dashvidha).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-700 capitalize block mb-0.5">
                      {key.replace('_', ' ')}:
                    </span>
                    <span className="text-slate-600">{val || 'Recorded'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Consultation & Prescription */}
          {caseItem.status === 'completed' && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-sm font-bold text-emerald-950">
                    Confirmed Doctor Diagnosis & Consultation
                  </h4>
                </div>
                {onOpenPrescription && (
                  <button
                    onClick={onOpenPrescription}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
                  >
                    <Pill className="w-3.5 h-3.5" />
                    <span>View Prescription Slip</span>
                  </button>
                )}
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <p>
                  <span className="font-bold text-slate-900">Diagnosis:</span> {caseItem.doctor_diagnosis || caseItem.diagnosis}
                </p>
                <p>
                  <span className="font-bold text-slate-900">Consulting Doctor:</span> Dr. {caseItem.consulting_doctor_name || 'Senior Consultant'}
                </p>
                {caseItem.follow_up_date && (
                  <p>
                    <span className="font-bold text-slate-900">Follow-Up Date:</span> {caseItem.follow_up_date}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/80">
          <span className="text-xs text-slate-500">
            Case record maintained securely under patient profile {caseItem.patient_name}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              {t('close')}
            </button>
            <button
              onClick={onOpenUpdate}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
            >
              <Edit className="w-4 h-4" />
              <span>{t('updateCaseBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
