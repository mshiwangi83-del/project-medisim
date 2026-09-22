import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { CaseItem, DynamicQAAnswer, PatientProfile } from '../../types';
import {
  FileText,
  User,
  Sparkles,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  Layers,
  Clock,
} from 'lucide-react';

interface UpdateCaseModalProps {
  caseItem: CaseItem;
  onClose: () => void;
  onCaseUpdated: (updatedCase: CaseItem) => void;
}

export const UpdateCaseModal: React.FC<UpdateCaseModalProps> = ({
  caseItem,
  onClose,
  onCaseUpdated,
}) => {
  const { authFetch, profile } = useAuth();
  const { t, language } = useLanguage();
  const patientProfile = profile as PatientProfile;

  const parsedQA: DynamicQAAnswer[] = caseItem.dynamic_qa_json
    ? JSON.parse(caseItem.dynamic_qa_json)
    : [];

  const parsedDashvidha: Record<string, string> = caseItem.dashvidha_responses_json
    ? JSON.parse(caseItem.dashvidha_responses_json)
    : {};

  const [initialComplaint, setInitialComplaint] = useState(caseItem.initial_complaint || '');
  const [speechTranscript, setSpeechTranscript] = useState(caseItem.speech_transcript || '');
  const [dynamicQA, setDynamicQA] = useState<DynamicQAAnswer[]>(parsedQA);
  const [dashvidha, setDashvidha] = useState<Record<string, string>>(parsedDashvidha);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [regenerateSummary, setRegenerateSummary] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleQAChange = (index: number, newAnswer: string) => {
    setDynamicQA((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], answer: newAnswer };
      return copy;
    });
  };

  const handleDashvidhaChange = (key: string, value: string) => {
    setDashvidha((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await authFetch(`/api/patient/cases/${caseItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_complaint: initialComplaint,
          speech_transcript: speechTranscript,
          dynamic_qa: dynamicQA,
          dashvidha_responses: dashvidha,
          additional_notes: additionalNotes,
          regenerate_summary: regenerateSummary,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update case record');
      }

      const data = await res.json();
      setSuccess(true);

      setTimeout(() => {
        if (data.case) {
          onCaseUpdated(data.case);
        }
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error updating case');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('updateCaseModalTitle')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('caseAttachedTo')}: <span className="font-bold text-slate-900">{patientProfile?.full_name || caseItem.patient_name}</span> (ABHA: {patientProfile?.abha_id || caseItem.patient_abha_id || 'N/A'}) • Case ID: <span className="font-mono text-slate-700">{caseItem.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{t('caseUpdatedSuccess')}</span>
            </div>
          )}

          {/* Section 1: Chief Complaint */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Activity className="w-3.5 h-3.5 text-teal-600" />
              <span>{t('editComplaint')}</span>
            </h4>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Problem & Symptoms Description *
              </label>
              <textarea
                rows={3}
                required
                value={initialComplaint}
                onChange={(e) => setInitialComplaint(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
              />
            </div>

            {speechTranscript && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Voice Input Speech Transcript
                </label>
                <textarea
                  rows={2}
                  value={speechTranscript}
                  onChange={(e) => setSpeechTranscript(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium bg-slate-50"
                />
              </div>
            )}
          </div>

          {/* Section 2: Dynamic Follow-Up Answers */}
          {dynamicQA && dynamicQA.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                <span>Follow-Up Clinical Questions & Patient Answers</span>
              </h4>
              <div className="space-y-3">
                {dynamicQA.map((qa, index) => (
                  <div key={index} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                    <p className="text-xs font-bold text-slate-800">
                      Q{index + 1}: {qa.question}
                    </p>
                    <input
                      type="text"
                      value={qa.answer}
                      onChange={(e) => handleQAChange(index, e.target.value)}
                      placeholder="Your answer"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Dashvidha Pariksha Responses */}
          {dashvidha && Object.keys(dashvidha).length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Ayurvedic Dashvidha Pariksha Recorded Responses</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(dashvidha).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 capitalize mb-1">
                      {key.replace('_', ' ')}
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleDashvidhaChange(key, e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Additional Symptoms or Clinical Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('patientAdditionalNotes')}</span>
            </h4>
            <textarea
              rows={2}
              placeholder="e.g. Symptoms worsened last night, developed mild headache, appetite reduced"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
            />
          </div>

          {/* Summary Regeneration Toggle */}
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-teal-950">
                  {t('regenerateSummaryOption')}
                </p>
                <p className="text-[11px] text-teal-700">
                  Re-analyzes all updated answers, red flags, and attached reports under patient {patientProfile?.full_name || caseItem.patient_name}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={regenerateSummary}
                onChange={(e) => setRegenerateSummary(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-700"></div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t('loading') : t('updateAndSaveCase')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
