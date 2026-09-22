import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { DynamicQuestion, DashvidhaQuestion, AICaseSummary } from '../../types';
import {
  Mic,
  MicOff,
  Type,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  FileCheck,
  Activity,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface NewCaseWorkflowProps {
  onCaseComplete: () => void;
  onCancel: () => void;
}

export const NewCaseWorkflow: React.FC<NewCaseWorkflowProps> = ({ onCaseComplete, onCancel }) => {
  const { authFetch, profile } = useAuth();
  const { t, language } = useLanguage();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Initial Complaint & Voice Transcription
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [complaintText, setComplaintText] = useState('');
  const recognitionRef = useRef<any>(null);

  // Step 2: Dynamic Questions
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 3: Ayurvedic Dashvidha Pariksha
  const [dashvidhaQuestions, setDashvidhaQuestions] = useState<DashvidhaQuestion[]>([]);
  const [dashvidhaAnswers, setDashvidhaAnswers] = useState<Record<string, string>>({});

  // Step 4: AI Summary & Red Flag Results
  const [summaryResult, setSummaryResult] = useState<{
    summary: AICaseSummary;
    red_flags: string[];
    case_id: string;
  } | null>(null);

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setSpeechTranscript(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert(language === 'en' ? 'Voice recognition is not supported in this browser. Please use text mode.' : 'इस ब्राउज़र में वॉयस रिकग्निशन समर्थित नहीं है। कृपया टेक्स्ट मोड का उपयोग करें।');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setSpeechTranscript('');
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  // Step 1 -> Step 2: Fetch dynamic questions
  const handleProceedToQuestions = async () => {
    const activeText = inputMode === 'voice' ? speechTranscript : complaintText;
    if (!activeText.trim()) {
      setError(language === 'en' ? 'Please describe your problem before proceeding' : 'कृपया आगे बढ़ने से पहले अपनी समस्या का वर्णन करें');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authFetch('/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_complaint: activeText,
          complaint: activeText,
          speech_transcript: inputMode === 'voice' ? speechTranscript : undefined,
          patient_profile: profile,
          language,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error(
            language === 'en'
              ? 'Received an invalid response from server. Please try again.'
              : 'सर्वर से अमान्य उत्तर प्राप्त हुआ। कृपया पुनः प्रयास करें।'
          );
        }
      } else {
        const text = await res.text();
        throw new Error(
          text ||
            (language === 'en'
              ? `Server error (${res.status}). Please check system configuration.`
              : `सर्वर त्रुटि (${res.status})। कृपया सिस्टम कॉन्फ़िगरेशन जांचें।`)
        );
      }

      if (!res.ok || data.success === false) {
        throw new Error(data?.error || (language === 'en' ? 'Failed to generate dynamic questions' : 'प्रश्न तैयार करने में विफल'));
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(
          language === 'en'
            ? 'No clinical questions were generated for this complaint. Please refine your description.'
            : 'इस लक्षण के लिए कोई क्लिनिकल प्रश्न नहीं मिले। कृपया अपने विवरण को स्पष्ट करें।'
        );
      }

      setDynamicQuestions(data.questions);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Case taking question generation failed:', err);
      setError(err.message || 'An error occurred during case intake');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Fetch Dashvidha Pariksha questions
  const handleProceedToDashvidha = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await authFetch('/api/dashvidha/questions');
      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error('Received invalid JSON for Dashvidha questions');
        }
      } else {
        const text = await res.text();
        throw new Error(text || `Failed with status ${res.status}`);
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to load Dashvidha questions');

      const questionsList = Array.isArray(data) ? data : data.questions || [];
      setDashvidhaQuestions(questionsList);

      // Pre-fill Vaya (Age) from patient profile automatically as required!
      if (profile && 'age' in profile) {
        setDashvidhaAnswers((prev) => ({
          ...prev,
          vaya: `${profile.age} years (${profile.age < 16 ? 'Bala / Childhood' : profile.age < 60 ? 'Madhyama / Adult' : 'Vriddha / Geriatric'})`,
        }));
      }

      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> Step 4: Finalize Case & Generate AI Summary & Red Flag Check
  const handleSubmitCase = async () => {
    setError(null);
    setLoading(true);

    const activeText = inputMode === 'voice' ? speechTranscript : complaintText;

    const formattedDynamicQA = dynamicQuestions.map((q) => ({
      question: language === 'hi' ? q.question_hi : q.question_en,
      answer: answers[q.id] || 'Not specified',
      clinical_intent: q.clinical_intent,
    }));

    try {
      const res = await authFetch('/api/cases/submit-case-taking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initial_complaint: activeText,
          speech_transcript: inputMode === 'voice' ? speechTranscript : undefined,
          dynamic_qa: formattedDynamicQA,
          dashvidha_responses: dashvidhaAnswers,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error('Received invalid JSON from case submission');
        }
      } else {
        const text = await res.text();
        throw new Error(text || `Submission failed with status ${res.status}`);
      }

      if (!res.ok || data.success === false) {
        throw new Error(data?.error || 'Failed to submit case');
      }

      setSummaryResult({
        summary: data.ai_summary,
        red_flags: data.red_flags || [],
        case_id: data.case_id,
      });

      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {t('newCaseTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Clinical pre-consultation workflow • English & हिन्दी
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
        >
          {t('cancel')}
        </button>
      </div>

      {/* Steps Progress Indicator */}
      <div className="mb-8 bg-white rounded-xl p-3 border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
          <div className={`p-2 rounded-lg ${currentStep === 1 ? 'bg-teal-700 text-white' : currentStep > 1 ? 'bg-emerald-50 text-emerald-800' : 'text-slate-400'}`}>
            1. {language === 'en' ? 'Initial Complaint' : 'प्रारंभिक लक्षण'}
          </div>
          <div className={`p-2 rounded-lg ${currentStep === 2 ? 'bg-teal-700 text-white' : currentStep > 2 ? 'bg-emerald-50 text-emerald-800' : 'text-slate-400'}`}>
            2. {language === 'en' ? 'Targeted Q&A' : 'क्लिनिकल पूछताछ'}
          </div>
          <div className={`p-2 rounded-lg ${currentStep === 3 ? 'bg-teal-700 text-white' : currentStep > 3 ? 'bg-emerald-50 text-emerald-800' : 'text-slate-400'}`}>
            3. {language === 'en' ? 'Dashvidha Pariksha' : 'दशविध परीक्षा'}
          </div>
          <div className={`p-2 rounded-lg ${currentStep === 4 ? 'bg-teal-700 text-white' : 'text-slate-400'}`}>
            4. {language === 'en' ? 'AI Summary & Audit' : 'एआई सारांश व ऑडिट'}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: INITIAL COMPLAINT (VOICE / TEXT) */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
              Step 1 of 4
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              {t('currentProblemQuestion')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {t('currentProblemSub')}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                inputMode === 'voice'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{t('voiceOption')}</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                inputMode === 'text'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>{t('typeOption')}</span>
            </button>
          </div>

          {/* Input Area */}
          {inputMode === 'voice' ? (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse ring-8 ring-rose-100'
                      : 'bg-teal-700 text-white hover:bg-teal-800'
                  }`}
                >
                  {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <div className="mt-4">
                  <p className="text-sm font-bold text-slate-800">
                    {isRecording ? t('recordingActive') : t('startRecording')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Language: {language === 'hi' ? 'हिन्दी (Hindi - hi-IN)' : 'English (en-IN)'}
                  </p>
                </div>
              </div>

              {/* Crucial: Transcription Review & Edit Area */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('speechTranscriptTitle')}</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {language === 'en' ? 'Edit text if speech was misinterpreted' : 'यदि कोई शब्द गलत सुना गया हो तो सुधारें'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  {t('speechTranscriptPrompt')}
                </p>
                <textarea
                  rows={4}
                  value={speechTranscript}
                  onChange={(e) => setSpeechTranscript(e.target.value)}
                  placeholder={language === 'en' ? 'Your speech transcription will appear here in real-time. You can verify and edit it directly...' : 'आपकी बोली गई बातें यहाँ दिखाई देंगी। आप सीधे इसे सुधार सकते हैं...'}
                  className="w-full p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                {language === 'en' ? 'Detailed Description of Current Problem' : 'वर्तमान समस्या का विस्तृत विवरण'}
              </label>
              <textarea
                rows={6}
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder={language === 'en' ? 'Describe: 1. Main complaint, 2. When it started, 3. Severity, 4. What worsens or relieves it...' : 'वर्णन करें: १. मुख्य लक्षण, २. कब से शुरू हुआ, ३. गंभीरता, ४. क्या करने से आराम या तकलीफ बढ़ती है...'}
                className="w-full p-3.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={handleProceedToQuestions}
              disabled={loading || !(inputMode === 'voice' ? speechTranscript.trim() : complaintText.trim())}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('nextToQuestions')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DYNAMIC AI QUESTIONS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
              Step 2 of 4
            </span>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <h3 className="text-xl font-bold text-slate-900">
                {t('dynamicQuestionsTitle')}
              </h3>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              {t('dynamicQuestionsSub')}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{t('noDiagnosisDisclaimer')}</span>
          </div>

          {/* Dynamic Question List */}
          <div className="space-y-6">
            {dynamicQuestions.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {idx + 1}. {language === 'hi' ? q.question_hi : q.question_en}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700 uppercase">
                    {q.category}
                  </span>
                </div>

                {q.type === 'select' && q.options && q.options.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                        className={`p-2.5 text-xs text-left rounded-lg border transition-all ${
                          answers[q.id] === opt
                            ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={2}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={t('answerPlaceholder')}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 bg-white"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleProceedToDashvidha}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('nextToDashvidha')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: AYURVEDIC DASHVIDHA PARIKSHA */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 mb-2">
              Step 3 of 4
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              {t('dashvidhaTitle')}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {t('dashvidhaSub')}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              <span>{t('dashvidhaSafety')}</span>
            </div>
            <p className="text-amber-800">
              {t('autoAgeNote')}
            </p>
          </div>

          {/* Dashvidha 10 Questions Form */}
          <div className="space-y-5">
            {dashvidhaQuestions.map((q, idx) => {
              const options = q.options_json ? JSON.parse(q.options_json) : null;
              const isAge = q.component_key === 'vaya';

              return (
                <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                      {idx + 1}. {language === 'hi' ? q.component_title_hi : q.component_title_en}
                    </span>
                    {isAge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Auto-Retrieved
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-slate-800">
                    {language === 'hi' ? q.question_hi : q.question_en}
                  </p>

                  {options && Array.isArray(options) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {options.map((opt: string) => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => setDashvidhaAnswers({ ...dashvidhaAnswers, [q.component_key]: opt })}
                          className={`p-2.5 text-xs text-left rounded-lg border transition-all ${
                            dashvidhaAnswers[q.component_key] === opt
                              ? 'bg-teal-50 border-teal-600 text-teal-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled={isAge}
                      value={dashvidhaAnswers[q.component_key] || ''}
                      onChange={(e) => setDashvidhaAnswers({ ...dashvidhaAnswers, [q.component_key]: e.target.value })}
                      placeholder={t('answerPlaceholder')}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-600 bg-white"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('back')}</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitCase}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Organizing Case & Checking Red Flags...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('submitCaseTaking')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: AI CASE SUMMARY & RED-FLAG NOTICES */}
      {currentStep === 4 && summaryResult && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          {/* Mandatory AI Notice Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-bold text-sm text-amber-950">
                {t('summaryMandatoryNotice')}
              </p>
              <p className="text-amber-800 mt-0.5">
                This structured overview has been generated to assist the clinical team. It does not replace independent doctor assessment.
              </p>
            </div>
          </div>

          {/* Red Flag Warning if Triggered */}
          {summaryResult.red_flags && summaryResult.red_flags.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{t('redFlagAlertTitle')}</span>
              </div>
              <p className="text-xs text-rose-900 font-semibold">
                {t('redFlagAlertMessage')}
              </p>
              <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
                {summaryResult.red_flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated Structured Summary */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2">
              Structured Case Intake Details
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block">Chief Complaint:</span>
                <p className="text-slate-600 mt-1">{summaryResult.summary.chief_complaint || 'Recorded'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block">Symptoms Analysis:</span>
                <p className="text-slate-600 mt-1">{summaryResult.summary.symptoms_analysis || 'Analyzed'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block">Report Findings Summary:</span>
                <p className="text-slate-600 mt-1">{summaryResult.summary.report_findings_summary || 'None attached'}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block">Ayurvedic Dashvidha Assessment:</span>
                <p className="text-slate-600 mt-1">{summaryResult.summary.dashvidha_pariksha_summary || 'Completed'}</p>
              </div>
            </div>
          </div>

          {/* Routing Confirmation */}
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0" />
            <div>
              <p className="font-bold text-teal-950">
                Case Submitted Successfully
              </p>
              <p className="text-teal-800 mt-0.5">
                {t('forwardToAssistantNotice')}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="button"
              onClick={onCaseComplete}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-xs"
            >
              {t('returnToDashboard')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
