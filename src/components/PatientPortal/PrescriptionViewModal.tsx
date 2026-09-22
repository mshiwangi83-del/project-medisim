import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { CaseItem, PrescriptionItem } from '../../types';
import { X, Printer, Stethoscope, HeartPulse, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PrescriptionViewModalProps {
  caseItem: CaseItem;
  onClose: () => void;
}

export const PrescriptionViewModal: React.FC<PrescriptionViewModalProps> = ({ caseItem, onClose }) => {
  const { t, language } = useLanguage();

  const prescriptions: PrescriptionItem[] = caseItem.prescription_items_json
    ? JSON.parse(caseItem.prescription_items_json)
    : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-h-none print:w-full">
        {/* Top Control Bar (Hidden during Print) */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="w-4 h-4 text-indigo-600" />
            <span>{t('prescriptionSlipTitle')}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('printPrescription')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Prescription Paper Body */}
        <div className="p-8 overflow-y-auto print:p-0 space-y-6 text-slate-900">
          {/* Hospital Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-6 h-6 text-teal-700" />
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  {t('hospitalName')}
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Ayushman Bharat Digital Health Provider • NABH Accredited Center
              </p>
              <p className="text-[11px] text-slate-500">
                OPD Consultation Wing • Phone: +91 11 2345 6789 • 24x7 Emergency Services
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                Official Doctor Rx
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Case ID: <span className="font-mono text-slate-800 font-bold">{caseItem.id.slice(0, 8)}</span>
              </p>
              <p className="text-xs text-slate-500">
                Date: <span className="font-semibold text-slate-800">{new Date(caseItem.completed_at || caseItem.updated_at).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          {/* Patient Details & Doctor Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1">
              <div>
                <span className="text-slate-500 font-medium">Patient Name: </span>
                <span className="font-bold text-slate-900">{caseItem.patient_name || 'Registered Patient'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Age / Gender: </span>
                <span className="font-semibold text-slate-800">{caseItem.patient_age} Yrs / {caseItem.patient_gender}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">ABHA ID: </span>
                <span className="font-mono font-semibold text-slate-800">{caseItem.patient_abha_id || 'Not linked'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Blood Group: </span>
                <span className="font-semibold text-slate-800">{caseItem.patient_blood_group || 'N/A'}</span>
              </div>
            </div>

            <div className="space-y-1 sm:text-right">
              <div>
                <span className="text-slate-500 font-medium">{t('prescribedBy')}: </span>
                <span className="font-bold text-slate-900">Dr. {caseItem.consulting_doctor_name || 'Senior Consultant'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Verified by Assistant: </span>
                <span className="font-semibold text-slate-800">{caseItem.junior_doctor_name || 'Clinical Team'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Department: </span>
                <span className="font-semibold text-slate-800">Internal Medicine & Kaya Chikitsa</span>
              </div>
            </div>
          </div>

          {/* Confirmed Diagnosis */}
          <div className="border-l-4 border-indigo-600 pl-4 py-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              {t('diagnosis')}
            </span>
            <p className="text-base font-bold text-indigo-950 mt-0.5">
              {caseItem.doctor_diagnosis || caseItem.diagnosis || 'Clinical Diagnosis Confirmed'}
            </p>
          </div>

          {/* Clinical Observations if noted */}
          {caseItem.clinical_observations && (
            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">Doctor's Clinical Observations & Vitals:</span>
              <p>{caseItem.clinical_observations}</p>
            </div>
          )}

          {/* Prescription Table (Rx) */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-lg font-serif font-bold text-slate-900">℞</span>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t('rx')}
              </h3>
            </div>

            {prescriptions.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{t('medName')}</th>
                      <th className="py-2.5 px-3">{t('medDosage')}</th>
                      <th className="py-2.5 px-3">{t('medFreq')}</th>
                      <th className="py-2.5 px-3">{t('medTiming')}</th>
                      <th className="py-2.5 px-3">{t('medDuration')}</th>
                      <th className="py-2.5 px-3">{t('medInstructions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {prescriptions.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.medicine_name}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{item.dosage}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.frequency}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.timing}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.duration}</td>
                        <td className="py-2.5 px-3 text-slate-500 italic">{item.instructions || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                {caseItem.doctor_prescription || 'Prescription instructions entered verbally during consultation.'}
              </p>
            )}
          </div>

          {/* Doctor Advice & Diet (Pathya / Apathya) */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              {t('advice')}
            </h4>
            <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {caseItem.doctor_advice || 'Follow light warm diet, maintain hydration, and avoid cold heavy foods.'}
            </p>
          </div>

          {/* Follow-up & Doctor Seal */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                {t('followUp')}
              </span>
              <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 mt-1">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>{caseItem.follow_up_date || 'After 7 days / As needed'}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                In case of emergency or worsening symptoms, visit Emergency Care immediately.
              </p>
            </div>

            <div className="text-right sm:min-w-[200px] border-t sm:border-t-0 pt-3 sm:pt-0">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Verified & Signed</span>
              </div>
              <p className="text-xs font-bold text-slate-900">Dr. {caseItem.consulting_doctor_name || 'Consultant Physician'}</p>
              <p className="text-[10px] text-slate-500">Department of Medicine & Ayurveda</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
