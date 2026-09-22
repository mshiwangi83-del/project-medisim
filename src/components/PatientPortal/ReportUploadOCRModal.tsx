import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2, ScanLine, Eye } from 'lucide-react';

interface ReportUploadOCRModalProps {
  onClose: () => void;
  onReportSaved: () => void;
}

export const ReportUploadOCRModal: React.FC<ReportUploadOCRModalProps> = ({ onClose, onReportSaved }) => {
  const { authFetch } = useAuth();
  const { t, language } = useLanguage();

  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload Form
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('Laboratory Blood Test');
  const [fileName, setFileName] = useState('');
  const [fileMime, setFileMime] = useState('image/jpeg');
  const [fileData, setFileData] = useState<string>('');
  const [filePreview, setFilePreview] = useState<string>('');

  // OCR Review State
  const [uploadedReportId, setUploadedReportId] = useState<string | null>(null);
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [ocrVerifiedText, setOcrVerifiedText] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError(language === 'en' ? 'File size exceeds 25MB limit' : 'फ़ाइल का आकार 25MB से अधिक है');
      return;
    }

    setFileName(file.name);
    setFileMime(file.type || 'image/jpeg');
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileData(result);
      if (file.type.startsWith('image/')) {
        setFilePreview(result);
      } else {
        setFilePreview('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndRunOCR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData) {
      setError(language === 'en' ? 'Please select a report file to upload' : 'कृपया अपलोड करने हेतु रिपोर्ट फ़ाइल चुनें');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await authFetch('/api/patient/reports/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          report_type: reportType,
          file_name: fileName,
          file_mime: fileMime,
          file_data: fileData,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process report');

      setUploadedReportId(data.report.id);
      setOcrRawText(data.report.ocr_extracted_text || '');
      setOcrVerifiedText(data.report.ocr_extracted_text || '');
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'OCR processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVerified = async () => {
    if (!uploadedReportId) return;
    setError(null);
    setLoading(true);

    try {
      const res = await authFetch(`/api/patient/reports/${uploadedReportId}/verify-ocr`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocr_verified_text: ocrVerifiedText,
        }),
      });

      if (!res.ok) throw new Error('Failed to save verified information');
      onReportSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('uploadModalTitle')}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {step === 'upload'
                  ? 'Step 1: Upload Report & Process OCR'
                  : 'Step 2: Patient Review & Verification of OCR Extracted Data'}
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

        {/* Workflow breadcrumb */}
        <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-2.5 flex items-center text-xs font-semibold text-slate-600 gap-2">
          <span className={`px-2 py-0.5 rounded ${step === 'upload' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
            1. Upload & OCR Extract
          </span>
          <span className="text-slate-400">→</span>
          <span className={`px-2 py-0.5 rounded ${step === 'review' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
            2. Review & Correct
          </span>
          <span className="text-slate-400">→</span>
          <span className="text-slate-400">3. Save Verified Record</span>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'upload' ? (
            /* STEP 1: UPLOAD */
            <form onSubmit={handleUploadAndRunOCR} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('reportTitle')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Complete Blood Count (CBC) or USG Abdomen"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('reportType')} *
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Laboratory Blood Test">Laboratory Pathology / Blood Test</option>
                    <option value="Radiology X-Ray / CT / MRI">Radiology (X-Ray / CT / MRI / Ultrasound)</option>
                    <option value="Prescription / Previous Slip">Previous Doctor Prescription Slip</option>
                    <option value="Discharge Summary">Hospital Discharge Summary</option>
                    <option value="ECG / Cardiology">ECG / Echo / Cardiac Report</option>
                    <option value="Other Medical Record">Other Medical Document</option>
                  </select>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('selectFile')} *
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-10 h-10 text-emerald-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-800">
                      {fileName ? fileName : t('dropFileHere')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF, PNG, JPG, JPEG documents up to 25MB
                    </p>
                    {fileName && (
                      <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {fileName} selected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Preview if applicable */}
              {filePreview && (
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Selected Document Preview:</span>
                  </div>
                  <img
                    src={filePreview}
                    alt="Document preview"
                    className="max-h-48 rounded-lg object-contain mx-auto border border-slate-200 shadow-2xs"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>OCR Quality Guarantee:</strong> The system extracts text directly from the uploaded document without altering clinical values. You will have full opportunity to review and edit the transcription before saving.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !fileData}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t('ocrStatusProcessing')}</span>
                    </>
                  ) : (
                    <>
                      <ScanLine className="w-4 h-4" />
                      <span>Process OCR & Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: REVIEW & VERIFY OCR */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <strong>{t('ocrNotice')}</strong>
                  <p className="mt-0.5 text-teal-800">
                    Review the OCR extracted text on the right. Fix any typos or numerical errors to ensure clinical precision.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Original Document Preview */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Original Uploaded File
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {fileName}
                    </span>
                  </div>

                  {filePreview ? (
                    <div className="flex-1 overflow-auto max-h-[380px] border border-slate-200 rounded-lg bg-white p-2 flex items-center justify-center">
                      <img
                        src={filePreview}
                        alt="Original Report"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-[200px] border border-slate-200 rounded-lg bg-white p-6 flex flex-col items-center justify-center text-slate-500">
                      <FileText className="w-12 h-12 text-slate-400 mb-2" />
                      <p className="text-sm font-semibold">{fileName}</p>
                      <p className="text-xs text-slate-400 mt-1">PDF document preserved in full</p>
                    </div>
                  )}
                </div>

                {/* Right: Editable Verified Text */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {t('badgeVerified')}
                      </span>
                      <span>Editable Transcription</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Edit below to correct
                    </span>
                  </div>

                  <textarea
                    rows={14}
                    value={ocrVerifiedText}
                    onChange={(e) => setOcrVerifiedText(e.target.value)}
                    placeholder="OCR extracted text will appear here. Edit to correct any misread characters..."
                    className="w-full p-3 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 leading-relaxed resize-none flex-1"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {t('back')}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveVerified}
                    disabled={loading || !ocrVerifiedText.trim()}
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    {loading ? t('loading') : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t('saveVerifiedReport')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
