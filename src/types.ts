export type UserRole = 'patient' | 'junior_doctor' | 'doctor';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  full_name: string;
  email?: string;
  phone?: string;
  created_at: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  abha_id?: string;
  full_name: string;
  gender: string;
  dob?: string;
  age: number;
  phone: string;
  email?: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_relation?: string;
  emergency_contact_phone: string;
  blood_group?: string;
  allergies?: string;
  existing_conditions?: string;
  current_medications?: string;
  surgical_history?: string;
  family_history?: string;
  hospital_branch?: string;
  created_at: string;
}

export interface JuniorDoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  employee_id: string;
  department: string;
  qualification: string;
  hospital: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  full_name: string;
  doctor_reg_id: string;
  department: string;
  specialization: string;
  qualification: string;
  hospital: string;
  phone: string;
  email: string;
  created_at: string;
}

export interface MedicalReport {
  id: string;
  patient_id: string;
  title: string;
  report_type: string;
  file_name: string;
  file_mime: string;
  file_data?: string;
  has_file_data?: number;
  ocr_extracted_text?: string;
  ocr_verified_text?: string;
  is_ocr_verified: number;
  uploaded_at: string;
}

export interface DynamicQuestion {
  id: string;
  category: string;
  question_en: string;
  question_hi: string;
  type: 'text' | 'select' | 'scale';
  options?: string[];
  clinical_intent: string;
}

export interface DynamicQAAnswer {
  question: string;
  answer: string;
  clinical_intent?: string;
}

export interface DashvidhaQuestion {
  id: string;
  component_key: string;
  component_title_en: string;
  component_title_hi: string;
  question_en: string;
  question_hi: string;
  question_type: string;
  options_json?: string | null;
  order_num: number;
  is_active: number;
}

export interface AICaseSummary {
  notice: string;
  patient_overview: string;
  chief_complaint: string;
  symptoms_analysis: string;
  relevant_history_medications: string;
  report_findings_summary: string;
  patient_reported_details: string;
  dashvidha_pariksha_summary: string;
  clinical_observations: string;
  red_flag_warnings: string[];
}

export type CaseStatus =
  | 'draft_case_taking'
  | 'ai_summary_generated'
  | 'under_review'
  | 'verified'
  | 'in_consultation'
  | 'completed';

export interface CaseItem {
  id: string;
  patient_id: string;
  status: CaseStatus;
  initial_complaint: string;
  speech_transcript?: string;
  dynamic_qa_json?: string;
  dashvidha_responses_json?: string;
  ai_summary_json?: string;
  red_flags_json?: string;
  created_at: string;
  updated_at: string;

  // Joined fields
  patient_name?: string;
  patient_gender?: string;
  patient_age?: number;
  patient_blood_group?: string;
  patient_abha_id?: string;
  patient_phone?: string;
  patient_allergies?: string;
  patient_existing_conditions?: string;
  patient_current_medications?: string;
  patient_surgical_history?: string;
  patient_family_history?: string;

  // Verification
  verified_summary_json?: string;
  verification_notes?: string;
  verified_at?: string;
  junior_doctor_notes?: string;
  junior_doctor_verified_at?: string;
  junior_doctor_name?: string;

  // Consultation
  clinical_observations?: string;
  diagnosis?: string;
  prescription_items_json?: string;
  doctor_advice?: string;
  follow_up_date?: string;
  doctor_notes?: string;
  completed_at?: string;
  doctor_diagnosis?: string;
  doctor_prescription?: string;
  consulting_doctor_name?: string;
  consultation_completed_at?: string;

  reports?: MedicalReport[];
}

export interface PrescriptionItem {
  medicine_name: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  instructions?: string;
}

export interface RedFlagRule {
  id: string;
  category: string;
  trigger_keywords: string;
  alert_message_en: string;
  alert_message_hi: string;
  severity: string;
  is_active: number;
}
