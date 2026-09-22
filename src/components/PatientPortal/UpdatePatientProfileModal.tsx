import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PatientProfile } from '../../types';
import {
  User,
  Shield,
  Heart,
  AlertTriangle,
  Pill,
  History,
  Users,
  Phone,
  MapPin,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface UpdatePatientProfileModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export const UpdatePatientProfileModal: React.FC<UpdatePatientProfileModalProps> = ({
  onClose,
  onSaved,
}) => {
  const { profile, authFetch, refreshProfile } = useAuth();
  const { t, language } = useLanguage();
  const patient = profile as PatientProfile;

  const [formData, setFormData] = useState({
    full_name: patient?.full_name || '',
    gender: patient?.gender || 'Male',
    age: patient?.age || 30,
    phone: patient?.phone || '',
    email: patient?.email || '',
    address: patient?.address || '',
    blood_group: patient?.blood_group || 'O+',
    allergies: patient?.allergies || '',
    existing_conditions: patient?.existing_conditions || '',
    current_medications: patient?.current_medications || '',
    surgical_history: patient?.surgical_history || '',
    family_history: patient?.family_history || '',
    emergency_contact_name: patient?.emergency_contact_name || '',
    emergency_contact_relation: patient?.emergency_contact_relation || '',
    emergency_contact_phone: patient?.emergency_contact_phone || '',
    abha_id: patient?.abha_id || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const commonAllergies = [
    'Penicillin / एंटीबायोटिक',
    'Sulfa Drugs',
    'NSAIDs / Aspirin',
    'Peanuts / मूंगफली',
    'Dairy / दुग्ध उत्पाद',
    'Dust / धूल',
    'None / कोई नहीं',
  ];

  const commonConditions = [
    'Hypertension (हाई बीपी)',
    'Type 2 Diabetes (मधुमेह)',
    'Asthma (अस्थमा)',
    'Hypothyroidism (थायराइड)',
    'Acidity / GERD (गैस/एसिडिटी)',
    'Arthritis (गठिया)',
    'None / कोई नहीं',
  ];

  const addTag = (field: 'allergies' | 'existing_conditions', tag: string) => {
    const current = formData[field] ? formData[field].trim() : '';
    if (tag.includes('None') || tag.includes('कोई नहीं')) {
      setFormData(prev => ({ ...prev, [field]: 'None' }));
      return;
    }
    const cleanTag = tag.split(' / ')[0];
    if (current.includes(cleanTag)) return;
    const updated = current && current !== 'None' ? `${current}, ${cleanTag}` : cleanTag;
    setFormData(prev => ({ ...prev, [field]: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await authFetch('/api/patient/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update patient profile records');
      }

      setSuccess(true);
      if (refreshProfile) {
        await refreshProfile();
      }
      setTimeout(() => {
        onSaved();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {t('updateProfileModalTitle')}
              </h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-800">{patient?.full_name}</span> • ABHA: <span className="font-mono font-medium text-slate-700">{patient?.abha_id || 'Not Assigned'}</span>
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

        {/* Modal Body / Form */}
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
              <span>{t('profileUpdatedSuccess')}</span>
            </div>
          )}

          {/* Section 1: Demographics */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>Personal Demographics & Identification</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (Years) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={formData.blood_group}
                  onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium bg-white"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ABHA ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 14-digit ABHA"
                  value={formData.abha_id}
                  onChange={(e) => setFormData({ ...formData, abha_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Profile & Medical Background */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Heart className="w-3.5 h-3.5 text-rose-600" />
              <span>Medical History, Allergies & Medications</span>
            </h4>

            {/* Allergies */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Known Allergies (Food, Drug, Environmental)
                </label>
                <span className="text-[10px] text-slate-500">Quick-add common items below</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Penicillin, Peanuts, Dust (or None)"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {commonAllergies.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag('allergies', tag)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Existing Medical Conditions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Existing Medical Conditions / Comorbidities
                </label>
                <span className="text-[10px] text-slate-500">Quick-add common conditions</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma (or None)"
                value={formData.existing_conditions}
                onChange={(e) => setFormData({ ...formData, existing_conditions: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {commonConditions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag('existing_conditions', tag)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Medications & Dosages
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Metformin 500mg (1-0-1), Telmisartan 40mg (1-0-0), Inhaler as needed"
                value={formData.current_medications}
                onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium resize-none"
              />
            </div>

            {/* Surgical & Family History */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Previous Surgical / Hospitalization History
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Appendectomy in 2018, Cholecystectomy 2021"
                  value={formData.surgical_history}
                  onChange={(e) => setFormData({ ...formData, surgical_history: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Family Medical History
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Father has Coronary Artery Disease, Mother has Diabetes"
                  value={formData.family_history}
                  onChange={(e) => setFormData({ ...formData, family_history: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Emergency Contact Details */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Emergency Contact Information</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spouse, Parent, Sibling"
                  value={formData.emergency_contact_relation}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
                />
              </div>
            </div>
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
              <span>{saving ? t('loading') : t('save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
