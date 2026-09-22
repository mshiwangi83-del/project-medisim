import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';
import { X, HeartPulse, UserCheck, Stethoscope, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  role: UserRole;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ role, onClose }) => {
  const { login, register } = useAuth();
  const { t, language } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Patient specific fields
  const [abhaId, setAbhaId] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number>(30);
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse / Parent');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [allergies, setAllergies] = useState('');
  const [existingConditions, setExistingConditions] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [surgicalHistory, setSurgicalHistory] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [hospitalBranch, setHospitalBranch] = useState('Main Campus OPD');

  // Junior Doctor specific fields
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('General Medicine / Ayurveda OPD');
  const [qualification, setQualification] = useState('MBBS / BAMS');
  const [hospital, setHospital] = useState('City Healthcare & Ayurveda Hospital');

  // Main Doctor specific fields
  const [doctorRegId, setDoctorRegId] = useState('');
  const [specialization, setSpecialization] = useState('Consultant Physician (Kaya Chikitsa / Internal Medicine)');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ username, password, role });
        onClose();
      } else {
        // Register payload based on role
        const payload: any = {
          role,
          username,
          password,
          full_name: fullName,
          email,
          phone,
        };

        if (role === 'patient') {
          payload.abha_id = abhaId;
          payload.gender = gender;
          payload.dob = dob;
          payload.age = Number(age);
          payload.address = address;
          payload.emergency_contact_name = emergencyName;
          payload.emergency_contact_relation = emergencyRelation;
          payload.emergency_contact_phone = emergencyPhone;
          payload.blood_group = bloodGroup;
          payload.allergies = allergies;
          payload.existing_conditions = existingConditions;
          payload.current_medications = currentMedications;
          payload.surgical_history = surgicalHistory;
          payload.family_history = familyHistory;
          payload.hospital_branch = hospitalBranch;
        } else if (role === 'junior_doctor') {
          payload.employee_id = employeeId;
          payload.department = department;
          payload.qualification = qualification;
          payload.hospital = hospital;
        } else if (role === 'doctor') {
          payload.doctor_reg_id = doctorRegId;
          payload.department = department;
          payload.specialization = specialization;
          payload.qualification = qualification;
          payload.hospital = hospital;
        }

        await register(payload);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const getRoleHeader = () => {
    switch (role) {
      case 'patient':
        return {
          title: t('patientPortalTitle'),
          icon: <HeartPulse className="w-5 h-5 text-emerald-600" />,
          color: 'emerald',
        };
      case 'junior_doctor':
        return {
          title: t('juniorDoctorPortalTitle'),
          icon: <UserCheck className="w-5 h-5 text-sky-600" />,
          color: 'sky',
        };
      case 'doctor':
        return {
          title: t('mainDoctorPortalTitle'),
          icon: <Stethoscope className="w-5 h-5 text-indigo-600" />,
          color: 'indigo',
        };
    }
  };

  const roleInfo = getRoleHeader();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
              {roleInfo.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {roleInfo.title}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'login'
                  ? language === 'en'
                    ? 'Enter your credentials to access your portal'
                    : 'अपने पोर्टल में प्रवेश करने के लिए विवरण दर्ज करें'
                  : language === 'en'
                  ? 'Complete registration form (No dummy data - real hospital profile)'
                  : 'पंजीकरण फॉर्म पूरा करें (वास्तविक अस्पताल रिकॉर्ड)'}
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

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('login')}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-teal-700 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t('register')}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'login' ? (
              /* LOGIN FORM */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'en' ? 'Username' : 'उपयोगकर्ता नाम (Username)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'en' ? 'Password' : 'पासवर्ड (Password)'}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                  />
                </div>
              </div>
            ) : (
              /* REGISTER FORM */
              <div className="space-y-4">
                {/* Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'en' ? 'Full Legal Name *' : 'पूरा नाम *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar Sharma"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'en' ? 'Choose Username *' : 'उपयोगकर्ता नाम चुनें *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. ramesh_k"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'en' ? 'Password *' : 'पासवर्ड *'}
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {language === 'en' ? 'Mobile Phone *' : 'मोबाइल नंबर *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === 'en' ? 'Email Address (Optional)' : 'ईमेल पता (वैकल्पिक)'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                {/* ROLE SPECIFIC REGISTRATION FIELDS */}

                {/* 1. PATIENT SPECIFIC FIELDS */}
                {role === 'patient' && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-teal-800">
                      {language === 'en' ? 'Patient Medical Demographics & ABHA' : 'रोगी चिकित्सा विवरण एवं आभा'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('abhaId')}
                        </label>
                        <input
                          type="text"
                          value={abhaId}
                          onChange={(e) => setAbhaId(e.target.value)}
                          placeholder="14-digit ABHA ID (e.g. 91-4521-8890-4412)"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('bloodGroup')}
                        </label>
                        <select
                          value={bloodGroup}
                          onChange={(e) => setBloodGroup(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        >
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                            <option key={bg} value={bg}>{bg}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Gender *' : 'लिंग *'}
                        </label>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        >
                          <option value="Male">Male / पुरुष</option>
                          <option value="Female">Female / महिला</option>
                          <option value="Other">Other / अन्य</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Age (Years) *' : 'आयु (वर्ष) *'}
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={120}
                          value={age}
                          onChange={(e) => setAge(Number(e.target.value))}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Date of Birth' : 'जन्म तिथि'}
                        </label>
                        <input
                          type="date"
                          value={dob}
                          onChange={(e) => setDob(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('address')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House no, street, city, pin code"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    {/* Emergency Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Emergency Contact Name *' : 'आपातकालीन संपर्क नाम *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={emergencyName}
                          onChange={(e) => setEmergencyName(e.target.value)}
                          placeholder="Contact person"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Relation' : 'संबंध'}
                        </label>
                        <input
                          type="text"
                          value={emergencyRelation}
                          onChange={(e) => setEmergencyRelation(e.target.value)}
                          placeholder="e.g. Spouse / Sibling"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Emergency Phone *' : 'आपातकालीन फोन *'}
                        </label>
                        <input
                          type="tel"
                          required
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          placeholder="Mobile number"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    {/* Medical Histories */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('allergies')}
                        </label>
                        <input
                          type="text"
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                          placeholder="e.g. Penicillin, Sulfa, Peanuts, None"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('existingConditions')}
                        </label>
                        <input
                          type="text"
                          value={existingConditions}
                          onChange={(e) => setExistingConditions(e.target.value)}
                          placeholder="e.g. Hypertension, Diabetes Type 2, Asthma"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('currentMedications')}
                        </label>
                        <input
                          type="text"
                          value={currentMedications}
                          onChange={(e) => setCurrentMedications(e.target.value)}
                          placeholder="e.g. Metformin 500mg, Telmisartan 40mg"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('surgicalHistory')}
                        </label>
                        <input
                          type="text"
                          value={surgicalHistory}
                          onChange={(e) => setSurgicalHistory(e.target.value)}
                          placeholder="e.g. Appendectomy in 2021"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {t('familyHistory')}
                        </label>
                        <input
                          type="text"
                          value={familyHistory}
                          onChange={(e) => setFamilyHistory(e.target.value)}
                          placeholder="e.g. Maternal diabetes, CAD"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Preferred OPD Unit' : 'ओपीडी यूनिट / शाखा'}
                        </label>
                        <input
                          type="text"
                          value={hospitalBranch}
                          onChange={(e) => setHospitalBranch(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. JUNIOR DOCTOR SPECIFIC FIELDS */}
                {role === 'junior_doctor' && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-sky-800">
                      {language === 'en' ? 'Medical Assistant / Junior Doctor Credentials' : 'सहायक चिकित्सक साख'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Hospital Employee ID *' : 'कर्मचारी आईडी संख्या *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          placeholder="e.g. JD-2026-042"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Department *' : 'विभाग *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Clinical Qualification *' : 'योग्यता *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                          placeholder="MBBS / BAMS / Medical Assistant"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Hospital / Institution *' : 'अस्पताल / संस्थान *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={hospital}
                          onChange={(e) => setHospital(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. MAIN DOCTOR SPECIFIC FIELDS */}
                {role === 'doctor' && (
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-indigo-800">
                      {language === 'en' ? 'Doctor Medical Registration & Qualifications' : 'चिकित्सक पंजीकरण व विशिष्टता'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Doctor Medical Council Reg ID *' : 'मेडिकल काउंसिल / NCISM पंजीकरण संख्या *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={doctorRegId}
                          onChange={(e) => setDoctorRegId(e.target.value)}
                          placeholder="e.g. MCI/NMC-58492 or NCISM-AY-8821"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Department *' : 'विभाग *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Specialization *' : 'विशेषज्ञता *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          placeholder="e.g. Internal Medicine / Kaya Chikitsa / Panchakarma"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {language === 'en' ? 'Qualification *' : 'शैक्षणिक योग्यता *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                          placeholder="e.g. MD (Medicine) / MD (Ayurveda)"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {language === 'en' ? 'Hospital / Institution *' : 'अस्पताल / स्वास्थ्य संस्थान *'}
                      </label>
                      <input
                        type="text"
                        required
                        value={hospital}
                        onChange={(e) => setHospital(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-xs"
              >
                {loading ? t('loading') : mode === 'login' ? t('login') : t('register')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
