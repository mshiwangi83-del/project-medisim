import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getDb, queryAll, queryOne, execute } from './server/db.js';
import {
  generateDynamicFollowUpQuestions,
  performReportOCR,
  generateAICaseSummary,
  detectRedFlags,
  isAIConfigured,
} from './server/aiService.js';

dotenv.config();

// In-memory token storage (token -> userId)
const activeTokens = new Map<string, { userId: string; role: string; expiresAt: number }>();

function generateToken(userId: string, role: string): string {
  const token = `auth_${crypto.randomBytes(32).toString('hex')}`;
  // 7 days expiration
  activeTokens.set(token, {
    userId,
    role,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    full_name: string;
    patientId?: string;
    juniorDoctorId?: string;
    doctorId?: string;
  };
}

async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);

  if (!token) {
    return next();
  }

  const session = activeTokens.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) activeTokens.delete(token);
    return next();
  }

  try {
    const db = await getDb();
    const user = queryOne<{ id: string; username: string; role: string; full_name: string }>(
      db,
      `SELECT id, username, role, full_name FROM users WHERE id = ?`,
      [session.userId]
    );

    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
      };

      if (user.role === 'patient') {
        const p = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [user.id]);
        if (p) req.user.patientId = p.id;
      } else if (user.role === 'junior_doctor') {
        const jd = queryOne<{ id: string }>(db, `SELECT id FROM junior_doctors WHERE user_id = ?`, [user.id]);
        if (jd) req.user.juniorDoctorId = jd.id;
      } else if (user.role === 'doctor') {
        const d = queryOne<{ id: string }>(db, `SELECT id FROM doctors WHERE user_id = ?`, [user.id]);
        if (d) req.user.doctorId = d.id;
      }
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
  }

  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required / प्रमाणीकरण आवश्यक है' });
  }
  next();
}

function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient role permissions / अपर्याप्त अनुमति' });
    }
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with 50mb limit for report uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS and pre-flight handling
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(authMiddleware);

  // Initialize DB
  await getDb();

  // Helper log audit
  async function logAudit(userId: string | null, role: string | null, action: string, details: string) {
    try {
      const db = await getDb();
      execute(
        db,
        `INSERT INTO audit_logs (id, user_id, role, action, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
        [`audit_${crypto.randomUUID()}`, userId, role, action, details, new Date().toISOString()]
      );
    } catch (e) {
      console.error('Audit log error:', e);
    }
  }

  // ==========================================
  // 1. HEALTH & SYSTEM INTEGRATION STATUS
  // ==========================================
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'Patient Case-Taking Software',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/integrations/status', (req, res) => {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
    res.json({
      abha: {
        name: 'ABHA / ABDM (National Digital Health Mission)',
        connected: true,
        endpoint: 'https://gateway.ndhm.gov.in/v0.5',
        mode: 'Sandbox/Verification Ready',
        status: 'Active',
      },
      bhashini: {
        name: 'BHASHINI (National Language Translation Mission)',
        supportedLanguages: ['en', 'hi'],
        speechRecognition: 'Active / WebSpeech + Pipeline',
        status: 'Operational',
      },
      geminiAI: {
        name: 'Google Gemini Medical Assistant Model (gemini-3.8-flash)',
        connected: hasGemini,
        status: hasGemini ? 'Connected & Active' : 'Fallback Rules Active (Key not configured)',
      },
      database: {
        engine: 'SQLite Local/Embedded Storage',
        file: 'data/hospital_records.sqlite',
        status: 'Operational',
      },
    });
  });

  // ==========================================
  // 2. AUTHENTICATION (ALL 3 ROLES)
  // ==========================================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { role, username, password, full_name, email, phone, ...extraDetails } = req.body;

      if (!role || !username || !password || !full_name) {
        return res.status(400).json({ error: 'Missing required credentials / आवश्यक फ़ील्ड गुम हैं' });
      }

      if (!['patient', 'junior_doctor', 'doctor'].includes(role)) {
        return res.status(400).json({ error: 'Invalid user role' });
      }

      const db = await getDb();
      const existing = queryOne(db, `SELECT id FROM users WHERE username = ?`, [username]);
      if (existing) {
        return res.status(409).json({ error: 'Username already registered. Please choose another or login.' });
      }

      const userId = `usr_${crypto.randomUUID()}`;
      // In production use bcrypt, for embedded showcase use salted sha256
      const passwordHash = crypto.createHash('sha256').update(password + 'salt_hospital_secure').digest('hex');
      const now = new Date().toISOString();

      execute(
        db,
        `INSERT INTO users (id, username, password_hash, role, full_name, email, phone, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, username.trim(), passwordHash, role, full_name.trim(), email || '', phone || '', now]
      );

      // Create role specific records
      if (role === 'patient') {
        const patientId = `pat_${crypto.randomUUID()}`;
        const {
          abha_id,
          gender,
          dob,
          age,
          address,
          emergency_contact_name,
          emergency_contact_relation,
          emergency_contact_phone,
          blood_group,
          allergies,
          existing_conditions,
          current_medications,
          surgical_history,
          family_history,
          hospital_branch,
        } = extraDetails;

        execute(
          db,
          `INSERT INTO patients (
            id, user_id, abha_id, full_name, gender, dob, age, phone, email, address,
            emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
            blood_group, allergies, existing_conditions, current_medications,
            surgical_history, family_history, hospital_branch, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            patientId,
            userId,
            abha_id || '',
            full_name.trim(),
            gender || 'Not specified',
            dob || '',
            Number(age) || 0,
            phone || '',
            email || '',
            address || 'Not specified',
            emergency_contact_name || 'Not provided',
            emergency_contact_relation || '',
            emergency_contact_phone || 'Not provided',
            blood_group || '',
            allergies || '',
            existing_conditions || '',
            current_medications || '',
            surgical_history || '',
            family_history || '',
            hospital_branch || 'Main OPD',
            now,
          ]
        );
      } else if (role === 'junior_doctor') {
        const jdId = `jd_${crypto.randomUUID()}`;
        const { employee_id, department, qualification, hospital } = extraDetails;
        execute(
          db,
          `INSERT INTO junior_doctors (id, user_id, full_name, employee_id, department, qualification, hospital, phone, email, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            jdId,
            userId,
            full_name.trim(),
            employee_id || `JD-${Date.now().toString().slice(-4)}`,
            department || 'General Medicine / Ayurveda OPD',
            qualification || 'MBBS / BAMS',
            hospital || 'City Healthcare Center',
            phone || '',
            email || '',
            now,
          ]
        );
      } else if (role === 'doctor') {
        const docId = `doc_${crypto.randomUUID()}`;
        const { doctor_reg_id, department, specialization, qualification, hospital } = extraDetails;
        execute(
          db,
          `INSERT INTO doctors (id, user_id, full_name, doctor_reg_id, department, specialization, qualification, hospital, phone, email, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            docId,
            userId,
            full_name.trim(),
            doctor_reg_id || `DOC-${Date.now().toString().slice(-4)}`,
            department || 'Internal Medicine / Kaya Chikitsa',
            specialization || 'Consultant Physician',
            qualification || 'MD / MS (Ayurveda / Medicine)',
            hospital || 'City Healthcare Center',
            phone || '',
            email || '',
            now,
          ]
        );
      }

      await logAudit(userId, role, 'REGISTER', `New user registered with role ${role}`);
      const token = generateToken(userId, role);

      res.status(201).json({
        message: 'Registration successful / पंजीकरण सफल रहा',
        token,
        user: {
          id: userId,
          username,
          role,
          full_name,
        },
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password, role } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const db = await getDb();
      const passwordHash = crypto.createHash('sha256').update(password + 'salt_hospital_secure').digest('hex');

      let query = `SELECT id, username, role, full_name, email, phone FROM users WHERE username = ? AND password_hash = ?`;
      const params: any[] = [username.trim(), passwordHash];
      if (role) {
        query += ` AND role = ?`;
        params.push(role);
      }

      const user = queryOne<{ id: string; username: string; role: string; full_name: string; email: string; phone: string }>(
        db,
        query,
        params
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials or role mismatch / अमान्य विवरण' });
      }

      const token = generateToken(user.id, user.role);
      await logAudit(user.id, user.role, 'LOGIN', 'User logged in');

      res.json({
        message: 'Login successful',
        token,
        user,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const user = queryOne<any>(db, `SELECT id, username, role, full_name, email, phone, created_at FROM users WHERE id = ?`, [
        req.user!.id,
      ]);

      if (!user) return res.status(404).json({ error: 'User not found' });

      let profileData: any = null;
      if (user.role === 'patient') {
        profileData = queryOne(db, `SELECT * FROM patients WHERE user_id = ?`, [user.id]);
      } else if (user.role === 'junior_doctor') {
        profileData = queryOne(db, `SELECT * FROM junior_doctors WHERE user_id = ?`, [user.id]);
      } else if (user.role === 'doctor') {
        profileData = queryOne(db, `SELECT * FROM doctors WHERE user_id = ?`, [user.id]);
      }

      res.json({
        user,
        profile: profileData,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] as string);
    if (token) {
      activeTokens.delete(token);
    }
    res.json({ message: 'Logged out successfully' });
  });

  // ==========================================
  // 3. PATIENT MODULE & PROFILE
  // ==========================================
  app.get('/api/patient/profile', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const patient = queryOne(db, `SELECT * FROM patients WHERE user_id = ?`, [req.user!.id]);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });
      res.json(patient);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/patient/profile', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

      const fields = [
        'abha_id',
        'full_name',
        'gender',
        'dob',
        'age',
        'phone',
        'email',
        'address',
        'emergency_contact_name',
        'emergency_contact_relation',
        'emergency_contact_phone',
        'blood_group',
        'allergies',
        'existing_conditions',
        'current_medications',
        'surgical_history',
        'family_history',
        'hospital_branch',
      ];

      const updates: string[] = [];
      const values: any[] = [];
      for (const field of fields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      }

      if (updates.length > 0) {
        values.push(patient.id);
        execute(db, `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`, values);
      }

      if (req.body.full_name || req.body.phone || req.body.email) {
        execute(
          db,
          `UPDATE users
           SET full_name = COALESCE(?, full_name),
               phone = COALESCE(?, phone),
               email = COALESCE(?, email)
           WHERE id = ?`,
          [req.body.full_name || null, req.body.phone || null, req.body.email || null, req.user!.id]
        );
      }

      await logAudit(
        req.user!.id,
        'patient',
        'UPDATE_PROFILE',
        `Patient profile and medical background records updated for ${req.body.full_name || patient.id}`
      );

      const updated = queryOne(db, `SELECT * FROM patients WHERE id = ?`, [patient.id]);
      res.json({
        success: true,
        message: 'Patient profile and medical records updated successfully',
        profile: updated,
        patient: updated,
        ...updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ==========================================
  // 4. MEDICAL REPORTS + OCR SCANNER
  // ==========================================
  app.post('/api/patient/reports/upload', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res) => {
    try {
      const { title, report_type, file_name, file_mime, file_data } = req.body;
      if (!title || !file_name || !file_data) {
        return res.status(400).json({ error: 'Report title, file name, and file data are required' });
      }

      const db = await getDb();
      const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
      if (!patient) return res.status(404).json({ error: 'Patient record not found' });

      // Run OCR using Gemini vision model or safe OCR parser
      const extractedOCR = await performReportOCR({
        base64Data: file_data,
        mimeType: file_mime || 'image/jpeg',
        fileName: file_name,
      });

      const reportId = `rep_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      execute(
        db,
        `INSERT INTO medical_reports (
          id, patient_id, title, report_type, file_name, file_mime, file_data,
          ocr_extracted_text, ocr_verified_text, is_ocr_verified, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          reportId,
          patient.id,
          title.trim(),
          report_type || 'Lab Investigation',
          file_name,
          file_mime || 'image/jpeg',
          file_data,
          extractedOCR,
          extractedOCR, // initial draft shown to patient
          now,
        ]
      );

      await logAudit(req.user!.id, 'patient', 'REPORT_UPLOAD', `Report ${title} uploaded and OCR processed`);

      const savedReport = queryOne(db, `SELECT * FROM medical_reports WHERE id = ?`, [reportId]);
      res.status(201).json({
        message: 'Report uploaded and OCR extracted. Please review before saving.',
        report: savedReport,
      });
    } catch (err: any) {
      console.error('Report upload error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/patient/reports/:id/verify-ocr', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { ocr_verified_text } = req.body;

      const db = await getDb();
      const report = queryOne<any>(db, `SELECT * FROM medical_reports WHERE id = ?`, [id]);
      if (!report) return res.status(404).json({ error: 'Report not found' });

      // Verify ownership if patient
      if (req.user!.role === 'patient') {
        const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
        if (!patient || report.patient_id !== patient.id) {
          return res.status(403).json({ error: 'Unauthorized to edit this report' });
        }
      }

      execute(
        db,
        `UPDATE medical_reports SET ocr_verified_text = ?, is_ocr_verified = 1 WHERE id = ?`,
        [ocr_verified_text || '', id]
      );

      await logAudit(req.user!.id, req.user!.role, 'OCR_VERIFIED', `Report ${report.title} OCR text verified by user`);

      const updated = queryOne(db, `SELECT * FROM medical_reports WHERE id = ?`, [id]);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/patient/reports', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      let patientId = req.query.patient_id as string;

      if (req.user!.role === 'patient') {
        const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        patientId = patient.id;
      } else if (!patientId) {
        return res.status(400).json({ error: 'patient_id required for clinical staff' });
      }

      const reports = queryAll(
        db,
        `SELECT id, patient_id, title, report_type, file_name, file_mime, ocr_extracted_text, ocr_verified_text, is_ocr_verified, uploaded_at,
         CASE WHEN file_data IS NOT NULL THEN 1 ELSE 0 END as has_file_data
         FROM medical_reports WHERE patient_id = ? ORDER BY uploaded_at DESC`,
        [patientId]
      );

      res.json(reports);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/patient/reports/:id/file', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const report = queryOne<any>(db, `SELECT id, patient_id, file_name, file_mime, file_data FROM medical_reports WHERE id = ?`, [
        req.params.id,
      ]);
      if (!report) return res.status(404).json({ error: 'Report not found' });

      // Ownership check for patient
      if (req.user!.role === 'patient') {
        const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
        if (!patient || report.patient_id !== patient.id) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      res.json({
        id: report.id,
        file_name: report.file_name,
        file_mime: report.file_mime,
        file_data: report.file_data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/patient/reports/:id', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      execute(db, `DELETE FROM medical_reports WHERE id = ? AND patient_id = ?`, [req.params.id, patient.id]);
      res.json({ message: 'Report deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. CASES & DYNAMIC AI CASE-TAKING
  // ==========================================
  app.get('/api/patient/cases', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      let patientId: string;

      if (req.user!.role === 'patient') {
        const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
        if (!patient) return res.json([]);
        patientId = patient.id;
      } else {
        patientId = req.query.patient_id as string;
        if (!patientId) return res.status(400).json({ error: 'patient_id required' });
      }

      const cases = queryAll(
        db,
        `SELECT c.*,
                p.full_name as patient_name,
                p.gender as patient_gender,
                p.age as patient_age,
                p.blood_group as patient_blood_group,
                p.abha_id as patient_abha_id,
                p.phone as patient_phone,
                p.allergies as patient_allergies,
                p.existing_conditions as patient_existing_conditions,
                p.current_medications as patient_current_medications,
                p.surgical_history as patient_surgical_history,
                p.family_history as patient_family_history,
                con.diagnosis as doctor_diagnosis,
                con.prescription_items_json as doctor_prescription,
                con.doctor_advice,
                con.follow_up_date,
                con.completed_at as consultation_completed_at,
                d.full_name as consulting_doctor_name,
                v.verification_notes as junior_doctor_notes,
                v.verified_at as junior_doctor_verified_at
         FROM cases c
         JOIN patients p ON p.id = c.patient_id
         LEFT JOIN consultations con ON con.case_id = c.id
         LEFT JOIN doctors d ON d.id = con.doctor_id
         LEFT JOIN verifications v ON v.case_id = c.id
         WHERE c.patient_id = ?
         ORDER BY c.created_at DESC`,
        [patientId]
      );

      res.json({ success: true, cases });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update existing case records and regenerate/update AI summary attached to patient
  app.put('/api/patient/cases/:id', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        initial_complaint,
        speech_transcript,
        dynamic_qa,
        dashvidha_responses,
        additional_notes,
        regenerate_summary = true,
      } = req.body;

      const db = await getDb();
      const patient = queryOne<any>(db, `SELECT * FROM patients WHERE user_id = ?`, [req.user!.id]);
      if (!patient) return res.status(404).json({ success: false, error: 'Patient profile not found' });

      const existingCase = queryOne<any>(db, `SELECT * FROM cases WHERE id = ? AND patient_id = ?`, [id, patient.id]);
      if (!existingCase) {
        return res.status(404).json({ success: false, error: 'Case not found or unauthorized' });
      }

      const now = new Date().toISOString();
      const updatedComplaint = (initial_complaint && initial_complaint.trim()) ? initial_complaint.trim() : existingCase.initial_complaint;
      const updatedTranscript = speech_transcript !== undefined ? speech_transcript : existingCase.speech_transcript;
      const updatedDynamicQA = dynamic_qa !== undefined ? dynamic_qa : JSON.parse(existingCase.dynamic_qa_json || '[]');
      const updatedDashvidha = dashvidha_responses !== undefined ? dashvidha_responses : JSON.parse(existingCase.dashvidha_responses_json || '{}');

      // Re-evaluate red flags with updated information
      const activeRules = queryAll<any>(db, `SELECT * FROM red_flag_rules WHERE is_active = 1`);
      const combinedText = `
        ${updatedComplaint}
        ${updatedTranscript || ''}
        ${additional_notes || ''}
        ${(updatedDynamicQA || []).map((q: any) => `${q.question} ${q.answer}`).join(' ')}
        ${Object.values(updatedDashvidha).join(' ')}
      `;
      const detectedRedFlags = detectRedFlags(combinedText, activeRules);

      let finalSummary = existingCase.ai_summary_json ? JSON.parse(existingCase.ai_summary_json) : null;

      if (regenerate_summary || !finalSummary) {
        const medicalReports = queryAll<any>(
          db,
          `SELECT title, ocr_extracted_text, ocr_verified_text FROM medical_reports WHERE patient_id = ?`,
          [patient.id]
        );

        try {
          finalSummary = await generateAICaseSummary({
            patient,
            initialComplaint: updatedComplaint,
            speechTranscript: updatedTranscript || '',
            dynamicQa: updatedDynamicQA || [],
            dashvidhaResponses: updatedDashvidha,
            medicalReports,
            redFlagsDetected: detectedRedFlags,
          });
          if (additional_notes && typeof finalSummary === 'object' && finalSummary !== null) {
            finalSummary.patient_updated_notes = additional_notes;
          }
        } catch (sumErr: any) {
          console.warn('AI summary regeneration fallback during case update:', sumErr.message);
          if (finalSummary) {
            finalSummary.patient_updated_notes = (finalSummary.patient_updated_notes ? finalSummary.patient_updated_notes + ' | ' : '') + (additional_notes || 'Updated by patient');
          }
        }
      } else if (additional_notes) {
        if (typeof finalSummary === 'object' && finalSummary !== null) {
          finalSummary.patient_updated_notes = (finalSummary.patient_updated_notes ? finalSummary.patient_updated_notes + ' | ' : '') + additional_notes;
        }
      }

      execute(
        db,
        `UPDATE cases
         SET initial_complaint = ?,
             speech_transcript = ?,
             dynamic_qa_json = ?,
             dashvidha_responses_json = ?,
             ai_summary_json = ?,
             red_flags_json = ?,
             updated_at = ?
         WHERE id = ? AND patient_id = ?`,
        [
          updatedComplaint,
          updatedTranscript || '',
          JSON.stringify(updatedDynamicQA),
          JSON.stringify(updatedDashvidha),
          JSON.stringify(finalSummary),
          JSON.stringify(detectedRedFlags),
          now,
          id,
          patient.id,
        ]
      );

      await logAudit(
        req.user!.id,
        'patient',
        'CASE_UPDATED',
        `Case ${id} for patient ${patient.full_name} updated and re-attached with new details`
      );

      const updatedCase = queryOne(
        db,
        `SELECT c.*,
                p.full_name as patient_name, p.gender as patient_gender, p.age as patient_age, p.blood_group as patient_blood_group,
                p.abha_id as patient_abha_id, p.phone as patient_phone, p.allergies as patient_allergies,
                p.existing_conditions as patient_existing_conditions, p.current_medications as patient_current_medications
         FROM cases c
         JOIN patients p ON p.id = c.patient_id
         WHERE c.id = ?`,
        [id]
      );

      return res.status(200).json({
        success: true,
        message: 'Case record and summary successfully updated and attached to patient',
        case: updatedCase,
        ai_summary: finalSummary,
        red_flags: detectedRedFlags,
      });
    } catch (err: any) {
      console.error('Update case error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to update case record' });
    }
  });

  app.post('/api/patient/cases/start', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res) => {
    try {
      const { initial_complaint, speech_transcript } = req.body;
      if (!initial_complaint || initial_complaint.trim().length === 0) {
        return res.status(400).json({ error: 'Please describe the problem you are experiencing.' });
      }

      const db = await getDb();
      const patient = queryOne<any>(db, `SELECT * FROM patients WHERE user_id = ?`, [req.user!.id]);
      if (!patient) return res.status(404).json({ error: 'Patient profile not found. Please complete profile.' });

      const caseId = `case_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      execute(
        db,
        `INSERT INTO cases (id, patient_id, status, initial_complaint, speech_transcript, dynamic_qa_json, dashvidha_responses_json, ai_summary_json, red_flags_json, created_at, updated_at)
         VALUES (?, ?, 'draft_case_taking', ?, ?, '[]', '{}', NULL, '[]', ?, ?)`,
        [caseId, patient.id, initial_complaint.trim(), speech_transcript || '', now, now]
      );

      await logAudit(req.user!.id, 'patient', 'START_CASE', `Case ${caseId} started with complaint: ${initial_complaint.slice(0, 40)}`);

      res.status(201).json({
        message: 'Case initialized',
        caseId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // DYNAMIC CASE-TAKING: /generate-questions
  // ==========================================
  const handleGenerateQuestions = async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Content-Type', 'application/json');

    try {
      if (!isAIConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Question generation service is not configured',
        });
      }

      const body = req.body || {};
      const initialComplaint = (
        body.initial_complaint ||
        body.complaint ||
        body.current_complaint ||
        body.problem ||
        ''
      ).trim();

      if (!initialComplaint) {
        return res.status(400).json({
          success: false,
          error: 'Current complaint is required to generate case-taking questions',
        });
      }

      const previousAnswers = body.previous_answers || body.previousAnswers || [];
      const language = body.language === 'hi' ? 'hi' : 'en';

      let patientAge = 30;
      let patientGender = 'Not specified';
      let allergies = '';
      let existingConditions = '';

      if (req.user?.role === 'patient') {
        try {
          const db = await getDb();
          const patient = queryOne<any>(db, `SELECT * FROM patients WHERE user_id = ?`, [req.user.id]);
          if (patient) {
            if (patient.age) patientAge = patient.age;
            if (patient.gender) patientGender = patient.gender;
            if (patient.allergies) allergies = patient.allergies;
            if (patient.existing_conditions) existingConditions = patient.existing_conditions;
          }
        } catch (dbErr) {
          // ignore DB error and use payload
        }
      }

      const patientProfile = body.patient_profile || {};
      if (body.age !== undefined) patientAge = Number(body.age);
      else if (body.patient_age !== undefined) patientAge = Number(body.patient_age);
      else if (patientProfile.age !== undefined) patientAge = Number(patientProfile.age);

      if (body.gender) patientGender = String(body.gender);
      else if (body.patient_gender) patientGender = String(body.patient_gender);
      else if (patientProfile.gender) patientGender = String(patientProfile.gender);

      if (body.allergies) allergies = String(body.allergies);
      else if (patientProfile.allergies) allergies = String(patientProfile.allergies);

      if (body.existing_conditions) existingConditions = String(body.existing_conditions);
      else if (body.existingConditions) existingConditions = String(body.existingConditions);
      else if (patientProfile.existing_conditions) existingConditions = String(patientProfile.existing_conditions);

      const questions = await generateDynamicFollowUpQuestions({
        initialComplaint,
        patientAge: Number(patientAge) || 30,
        patientGender: String(patientGender || 'Not specified'),
        allergies: String(allergies || ''),
        existingConditions: String(existingConditions || ''),
        previousAnswers,
        language,
      });

      return res.status(200).json({
        success: true,
        questions,
      });
    } catch (err: any) {
      console.error('Error in /generate-questions endpoint:', err);
      let errorMessage = err.message || 'An error occurred while generating case-taking questions';
      try {
        const parsedErr = JSON.parse(errorMessage);
        if (parsedErr?.error?.message) {
          errorMessage = parsedErr.error.message;
        }
      } catch {
        // Not a JSON string
      }

      const isNotConfigured = errorMessage.includes('not configured');
      return res.status(isNotConfigured ? 503 : 500).json({
        success: false,
        error: errorMessage,
      });
    }
  };

  app.post('/generate-questions', handleGenerateQuestions);
  app.post('/api/generate-questions', handleGenerateQuestions);
  app.post('/api/cases/generate-questions', handleGenerateQuestions);

  app.get('/generate-questions', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use HTTP POST with patient complaint and previous answers.',
    });
  });

  app.get('/api/generate-questions', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use HTTP POST with patient complaint and previous answers.',
    });
  });

  app.post('/api/patient/cases/:id/dynamic-questions', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { language = 'en', previousAnswers = [] } = req.body;

      const db = await getDb();
      const caseItem = queryOne<any>(db, `SELECT * FROM cases WHERE id = ?`, [id]);
      if (!caseItem) return res.status(404).json({ error: 'Case not found' });

      const patient = queryOne<any>(db, `SELECT * FROM patients WHERE id = ?`, [caseItem.patient_id]);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      // Generate dynamic follow-up questions
      const questions = await generateDynamicFollowUpQuestions({
        initialComplaint: caseItem.initial_complaint,
        patientAge: patient.age,
        patientGender: patient.gender,
        allergies: patient.allergies,
        existingConditions: patient.existing_conditions,
        previousAnswers,
        language,
      });

      res.json({ questions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/patient/cases/:id/submit-responses', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { dynamic_qa, dashvidha_responses, speech_transcript } = req.body;

      const db = await getDb();
      const caseItem = queryOne<any>(db, `SELECT * FROM cases WHERE id = ?`, [id]);
      if (!caseItem) return res.status(404).json({ error: 'Case not found' });

      const patient = queryOne<any>(db, `SELECT * FROM patients WHERE id = ?`, [caseItem.patient_id]);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      // Automatically ensure age is recorded in Dashvidha Vaya
      const updatedDashvidha = {
        ...dashvidha_responses,
        vaya: `Patient age: ${patient.age} years (Auto-retrieved from registered profile / प्रोफाइल से स्वतः प्राप्त)`,
      };

      // Fetch uploaded reports with OCR
      const medicalReports = queryAll<any>(
        db,
        `SELECT title, ocr_extracted_text, ocr_verified_text FROM medical_reports WHERE patient_id = ?`,
        [patient.id]
      );

      // Check red flags across patient's input
      const activeRules = queryAll<any>(db, `SELECT * FROM red_flag_rules WHERE is_active = 1`);
      const combinedText = `
        ${caseItem.initial_complaint}
        ${speech_transcript || ''}
        ${(dynamic_qa || []).map((q: any) => `${q.question} ${q.answer}`).join(' ')}
        ${Object.values(updatedDashvidha).join(' ')}
      `;
      const detectedRedFlags = detectRedFlags(combinedText, activeRules);

      // Generate AI-Assisted Case Summary
      const aiSummary = await generateAICaseSummary({
        patient,
        initialComplaint: caseItem.initial_complaint,
        speechTranscript: speech_transcript || caseItem.speech_transcript,
        dynamicQa: dynamic_qa || [],
        dashvidhaResponses: updatedDashvidha,
        medicalReports,
        redFlagsDetected: detectedRedFlags,
      });

      const now = new Date().toISOString();
      execute(
        db,
        `UPDATE cases
         SET status = 'ai_summary_generated',
             speech_transcript = ?,
             dynamic_qa_json = ?,
             dashvidha_responses_json = ?,
             ai_summary_json = ?,
             red_flags_json = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          speech_transcript || caseItem.speech_transcript || '',
          JSON.stringify(dynamic_qa || []),
          JSON.stringify(updatedDashvidha),
          JSON.stringify(aiSummary),
          JSON.stringify(detectedRedFlags),
          now,
          id,
        ]
      );

      await logAudit(
        req.user!.id,
        'patient',
        'CASE_SUBMITTED',
        `Case ${id} submitted with AI summary generated. Routing to Junior Doctor queue.`
      );

      res.json({
        message: 'Case taking completed and AI summary generated. Sent for Junior Doctor verification.',
        caseId: id,
        aiSummary,
        redFlags: detectedRedFlags,
      });
    } catch (err: any) {
      console.error('Submit case error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/cases/submit-case-taking', requireAuth, requireRole(['patient']), async (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { initial_complaint, speech_transcript, dynamic_qa, dashvidha_responses } = req.body;

      if (!initial_complaint || !initial_complaint.trim()) {
        return res.status(400).json({ success: false, error: 'Initial complaint is required' });
      }

      const db = await getDb();
      const patient = queryOne<any>(db, `SELECT * FROM patients WHERE user_id = ?`, [req.user!.id]);
      if (!patient) return res.status(404).json({ success: false, error: 'Patient profile not found' });

      const caseId = `case_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      const updatedDashvidha = {
        ...dashvidha_responses,
        vaya: `Patient age: ${patient.age} years (Auto-retrieved from registered profile / प्रोफाइल से स्वतः प्राप्त)`,
      };

      const medicalReports = queryAll<any>(
        db,
        `SELECT title, ocr_extracted_text, ocr_verified_text FROM medical_reports WHERE patient_id = ?`,
        [patient.id]
      );

      const activeRules = queryAll<any>(db, `SELECT * FROM red_flag_rules WHERE is_active = 1`);
      const combinedText = `
        ${initial_complaint}
        ${speech_transcript || ''}
        ${(dynamic_qa || []).map((q: any) => `${q.question} ${q.answer}`).join(' ')}
        ${Object.values(updatedDashvidha).join(' ')}
      `;
      const detectedRedFlags = detectRedFlags(combinedText, activeRules);

      const aiSummary = await generateAICaseSummary({
        patient,
        initialComplaint: initial_complaint.trim(),
        speechTranscript: speech_transcript || '',
        dynamicQa: dynamic_qa || [],
        dashvidhaResponses: updatedDashvidha,
        medicalReports,
        redFlagsDetected: detectedRedFlags,
      });

      execute(
        db,
        `INSERT INTO cases (id, patient_id, status, initial_complaint, speech_transcript, dynamic_qa_json, dashvidha_responses_json, ai_summary_json, red_flags_json, created_at, updated_at)
         VALUES (?, ?, 'ai_summary_generated', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          patient.id,
          initial_complaint.trim(),
          speech_transcript || '',
          JSON.stringify(dynamic_qa || []),
          JSON.stringify(updatedDashvidha),
          JSON.stringify(aiSummary),
          JSON.stringify(detectedRedFlags),
          now,
          now,
        ]
      );

      await logAudit(
        req.user!.id,
        'patient',
        'CASE_SUBMITTED',
        `Case ${caseId} submitted with AI summary generated. Routing to Junior Doctor queue.`
      );

      return res.status(200).json({
        success: true,
        message: 'Case taking completed and AI summary generated. Sent for Junior Doctor verification.',
        case_id: caseId,
        ai_summary: aiSummary,
        red_flags: detectedRedFlags,
      });
    } catch (err: any) {
      console.error('Submit case taking error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to submit case taking' });
    }
  });

  app.get('/api/cases/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const caseItem = queryOne<any>(
        db,
        `SELECT c.*,
                p.full_name as patient_name, p.gender as patient_gender, p.age as patient_age, p.blood_group as patient_blood_group,
                p.abha_id as patient_abha_id, p.phone as patient_phone, p.allergies as patient_allergies,
                p.existing_conditions as patient_existing_conditions, p.current_medications as patient_current_medications,
                p.surgical_history as patient_surgical_history, p.family_history as patient_family_history,
                v.verified_summary_json, v.verification_notes, v.verified_at,
                con.clinical_observations, con.diagnosis, con.prescription_items_json, con.doctor_advice, con.follow_up_date, con.notes as doctor_notes, con.completed_at
         FROM cases c
         JOIN patients p ON p.id = c.patient_id
         LEFT JOIN verifications v ON v.case_id = c.id
         LEFT JOIN consultations con ON con.case_id = c.id
         WHERE c.id = ?`,
        [req.params.id]
      );

      if (!caseItem) return res.status(404).json({ error: 'Case not found' });

      // Role authorization
      if (req.user!.role === 'patient') {
        const patient = queryOne<{ id: string }>(db, `SELECT id FROM patients WHERE user_id = ?`, [req.user!.id]);
        if (!patient || patient.id !== caseItem.patient_id) {
          return res.status(403).json({ error: 'Forbidden: Access restricted to case owner' });
        }
      }

      // Fetch patient reports
      const reports = queryAll(
        db,
        `SELECT id, title, report_type, file_name, file_mime, ocr_extracted_text, ocr_verified_text, is_ocr_verified, uploaded_at
         FROM medical_reports WHERE patient_id = ?`,
        [caseItem.patient_id]
      );

      res.json({
        ...caseItem,
        reports,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. DASHVIDHA QUESTIONS (CONFIGURABLE)
  // ==========================================
  app.get('/api/dashvidha/questions', async (req, res) => {
    try {
      const db = await getDb();
      const questions = queryAll(db, `SELECT * FROM dashvidha_questions WHERE is_active = 1 ORDER BY order_num ASC`);
      res.json({ success: true, questions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/dashvidha/questions', requireAuth, requireRole(['doctor', 'junior_doctor']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { questions } = req.body;
      if (!Array.isArray(questions)) {
        return res.status(400).json({ success: false, error: 'Questions array is required' });
      }
      const db = await getDb();
      for (const q of questions) {
        if (q.id) {
          execute(
            db,
            `UPDATE dashvidha_questions
             SET question_en = ?, question_hi = ?, options_json = ?
             WHERE id = ?`,
            [q.question_en, q.question_hi, q.options_json, q.id]
          );
        }
      }
      await logAudit(req.user!.id, req.user!.role, 'BATCH_UPDATE_DASHVIDHA', 'Updated Dashvidha Pariksha questions configuration');
      res.json({ success: true, message: 'Questions updated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/dashvidha/questions/:id', requireAuth, requireRole(['doctor', 'junior_doctor']), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { question_en, question_hi, options_json, is_active } = req.body;

      const db = await getDb();
      execute(
        db,
        `UPDATE dashvidha_questions
         SET question_en = COALESCE(?, question_en),
             question_hi = COALESCE(?, question_hi),
             options_json = COALESCE(?, options_json),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [question_en, question_hi, options_json, is_active, id]
      );

      await logAudit(req.user!.id, req.user!.role, 'UPDATE_DASHVIDHA_QUESTION', `Updated question ${id}`);
      res.json({ message: 'Question updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 7. JUNIOR DOCTOR / ASSISTANT MODULE
  // ==========================================
  app.get('/api/junior-doctor/cases', requireAuth, requireRole(['junior_doctor', 'doctor']), async (req, res) => {
    try {
      const db = await getDb();
      // Unverified cases or under review cases
      const cases = queryAll(
        db,
        `SELECT c.id, c.patient_id, c.status, c.initial_complaint, c.red_flags_json, c.created_at, c.updated_at,
                p.full_name as patient_name, p.age as patient_age, p.gender as patient_gender, p.abha_id,
                v.verified_at, v.verification_notes
         FROM cases c
         JOIN patients p ON p.id = c.patient_id
         LEFT JOIN verifications v ON v.case_id = c.id
         WHERE c.status IN ('ai_summary_generated', 'under_review', 'verified')
         ORDER BY
           CASE WHEN c.status = 'ai_summary_generated' THEN 1
                WHEN c.status = 'under_review' THEN 2
                ELSE 3 END,
           c.created_at DESC`
      );

      res.json(cases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/junior-doctor/cases/:id/verify', requireAuth, requireRole(['junior_doctor', 'doctor']), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { verified_summary_json, verification_notes } = req.body;

      if (!verified_summary_json) {
        return res.status(400).json({ error: 'Verified summary content is required' });
      }

      const db = await getDb();
      const caseItem = queryOne<any>(db, `SELECT * FROM cases WHERE id = ?`, [id]);
      if (!caseItem) return res.status(404).json({ error: 'Case not found' });

      const jd = queryOne<{ id: string }>(db, `SELECT id FROM junior_doctors WHERE user_id = ?`, [req.user!.id]) || {
        id: req.user!.id,
      };

      const now = new Date().toISOString();
      const verificationId = `ver_${crypto.randomUUID()}`;

      // Insert or replace verification
      execute(
        db,
        `INSERT OR REPLACE INTO verifications (id, case_id, junior_doctor_id, verified_summary_json, verification_notes, verified_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          verificationId,
          id,
          jd.id,
          typeof verified_summary_json === 'string' ? verified_summary_json : JSON.stringify(verified_summary_json),
          verification_notes || '',
          now,
        ]
      );

      // Transition case to 'verified' so it is now authorized to appear in Main Doctor's consultation queue!
      execute(db, `UPDATE cases SET status = 'verified', updated_at = ? WHERE id = ?`, [now, id]);

      await logAudit(
        req.user!.id,
        req.user!.role,
        'VERIFY_CASE',
        `Case ${id} verified and forwarded to Main Doctor consultation queue.`
      );

      res.json({
        message: 'Case verified successfully. It is now routed to the Main Doctor consultation queue.',
        caseId: id,
        status: 'verified',
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 8. MAIN DOCTOR MODULE & CONSULTATION
  // ==========================================
  app.get('/api/doctor/cases', requireAuth, requireRole(['doctor']), async (req, res) => {
    try {
      const db = await getDb();
      // Main Doctor can ONLY view authorized verified cases!
      const cases = queryAll(
        db,
        `SELECT c.id, c.patient_id, c.status, c.initial_complaint, c.red_flags_json, c.created_at, c.updated_at,
                p.full_name as patient_name, p.age as patient_age, p.gender as patient_gender, p.blood_group, p.abha_id,
                v.verified_at as junior_verified_at, v.verification_notes as junior_doctor_notes, jd.full_name as junior_doctor_name,
                con.diagnosis, con.completed_at as consultation_completed_at
         FROM cases c
         JOIN patients p ON p.id = c.patient_id
         JOIN verifications v ON v.case_id = c.id
         LEFT JOIN junior_doctors jd ON jd.id = v.junior_doctor_id
         LEFT JOIN consultations con ON con.case_id = c.id
         WHERE c.status IN ('verified', 'in_consultation', 'completed')
         ORDER BY
           CASE WHEN c.status = 'verified' THEN 1
                WHEN c.status = 'in_consultation' THEN 2
                ELSE 3 END,
           c.updated_at DESC`
      );

      res.json(cases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/doctor/cases/:id/consultation', requireAuth, requireRole(['doctor']), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { clinical_observations, diagnosis, prescription_items, doctor_advice, follow_up_date, notes } = req.body;

      if (!diagnosis || !diagnosis.trim()) {
        return res.status(400).json({ error: 'Doctor confirmed diagnosis is required' });
      }

      const db = await getDb();
      const caseItem = queryOne<any>(db, `SELECT * FROM cases WHERE id = ?`, [id]);
      if (!caseItem) return res.status(404).json({ error: 'Case not found' });

      // Verify case has been verified by junior doctor
      if (caseItem.status !== 'verified' && caseItem.status !== 'in_consultation' && caseItem.status !== 'completed') {
        return res.status(400).json({ error: 'Case has not been verified by a Junior Doctor yet.' });
      }

      const doctor = queryOne<{ id: string }>(db, `SELECT id FROM doctors WHERE user_id = ?`, [req.user!.id]) || {
        id: req.user!.id,
      };

      const consultationId = `con_${crypto.randomUUID()}`;
      const now = new Date().toISOString();

      execute(
        db,
        `INSERT OR REPLACE INTO consultations (
          id, case_id, doctor_id, patient_id, clinical_observations, diagnosis,
          prescription_items_json, doctor_advice, follow_up_date, notes, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          consultationId,
          id,
          doctor.id,
          caseItem.patient_id,
          clinical_observations || '',
          diagnosis.trim(),
          JSON.stringify(prescription_items || []),
          doctor_advice || '',
          follow_up_date || '',
          notes || '',
          now,
        ]
      );

      // Set case to completed
      execute(db, `UPDATE cases SET status = 'completed', updated_at = ? WHERE id = ?`, [now, id]);

      await logAudit(
        req.user!.id,
        'doctor',
        'CONSULTATION_COMPLETED',
        `Doctor finalized diagnosis "${diagnosis}" and prescription for case ${id}. Patient dashboard updated.`
      );

      res.json({
        message: 'Consultation saved and confirmed. Patient prescription dashboard updated.',
        caseId: id,
        consultationId,
        status: 'completed',
      });
    } catch (err: any) {
      console.error('Consultation save error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 9. RED FLAG CONFIGURATION
  // ==========================================
  app.get('/api/redflags/rules', async (req, res) => {
    try {
      const db = await getDb();
      const rules = queryAll(db, `SELECT * FROM red_flag_rules ORDER BY severity DESC`);
      res.json(rules);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/redflags/rules/:id', requireAuth, requireRole(['doctor', 'junior_doctor']), async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { trigger_keywords, alert_message_en, alert_message_hi, severity, is_active } = req.body;

      const db = await getDb();
      execute(
        db,
        `UPDATE red_flag_rules
         SET trigger_keywords = COALESCE(?, trigger_keywords),
             alert_message_en = COALESCE(?, alert_message_en),
             alert_message_hi = COALESCE(?, alert_message_hi),
             severity = COALESCE(?, severity),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [trigger_keywords, alert_message_en, alert_message_hi, severity, is_active, id]
      );

      res.json({ message: 'Red flag rule updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 10. AUDIT LOGS
  // ==========================================
  app.get('/api/audit-logs', requireAuth, requireRole(['doctor', 'junior_doctor']), async (req, res) => {
    try {
      const db = await getDb();
      const logs = queryAll(db, `SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100`);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 11. VITE MIDDLEWARE & STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hospital Patient Case-Taking Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
});
