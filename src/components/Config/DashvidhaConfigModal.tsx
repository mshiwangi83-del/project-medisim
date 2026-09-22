import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DashvidhaQuestion } from '../../types';
import { X, Settings, CheckCircle2, AlertCircle, Save, Sparkles, RefreshCw } from 'lucide-react';

interface DashvidhaConfigModalProps {
  onClose: () => void;
}

export const DashvidhaConfigModal: React.FC<DashvidhaConfigModalProps> = ({ onClose }) => {
  const { authFetch } = useAuth();
  const { t, language } = useLanguage();

  const [questions, setQuestions] = useState<DashvidhaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/dashvidha/questions');
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleUpdateField = (index: number, field: keyof DashvidhaQuestion, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await authFetch('/api/dashvidha/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });

      if (!res.ok) throw new Error('Failed to update Dashvidha configuration');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('dashvidhaConfigTitle')}
              </h3>
              <p className="text-xs text-slate-500">
                {t('dashvidhaConfigDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Dashvidha Pariksha configuration saved successfully!</span>
          </div>
        )}

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span>Loading questions...</span>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                    {idx + 1}. {q.component_key} ({q.component_title_en} / {q.component_title_hi})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Order: {q.order_num}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Question in English
                    </label>
                    <textarea
                      rows={2}
                      value={q.question_en}
                      onChange={(e) => handleUpdateField(idx, 'question_en', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-teal-600 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Question in Hindi (हिन्दी)
                    </label>
                    <textarea
                      rows={2}
                      value={q.question_hi}
                      onChange={(e) => handleUpdateField(idx, 'question_hi', e.target.value)}
                      className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-teal-600 bg-white"
                    />
                  </div>
                </div>

                {q.options_json && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Options (JSON Array)
                    </label>
                    <input
                      type="text"
                      value={q.options_json}
                      onChange={(e) => handleUpdateField(idx, 'options_json', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-teal-600 bg-white"
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={fetchQuestions}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Saved</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              {t('close')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t('loading') : t('save')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
