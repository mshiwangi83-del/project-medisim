import initSqlJs, { Database, SqlValue } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'hospital_records.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Failed to load existing SQLite database, creating new one:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite database:', err);
  }
}

function initTables(db: Database): void {
  // SQLite Schema Setup
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      abha_id TEXT,
      full_name TEXT NOT NULL,
      gender TEXT NOT NULL,
      dob TEXT,
      age INTEGER NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT NOT NULL,
      emergency_contact_name TEXT NOT NULL,
      emergency_contact_relation TEXT,
      emergency_contact_phone TEXT NOT NULL,
      blood_group TEXT,
      allergies TEXT,
      existing_conditions TEXT,
      current_medications TEXT,
      surgical_history TEXT,
      family_history TEXT,
      hospital_branch TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS junior_doctors (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      department TEXT NOT NULL,
      qualification TEXT NOT NULL,
      hospital TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      doctor_reg_id TEXT NOT NULL,
      department TEXT NOT NULL,
      specialization TEXT NOT NULL,
      qualification TEXT NOT NULL,
      hospital TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS medical_reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      title TEXT NOT NULL,
      report_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_mime TEXT NOT NULL,
      file_data TEXT,
      ocr_extracted_text TEXT,
      ocr_verified_text TEXT,
      is_ocr_verified INTEGER DEFAULT 0,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      status TEXT NOT NULL,
      initial_complaint TEXT NOT NULL,
      speech_transcript TEXT,
      dynamic_qa_json TEXT,
      dashvidha_responses_json TEXT,
      ai_summary_json TEXT,
      red_flags_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS verifications (
      id TEXT PRIMARY KEY,
      case_id TEXT UNIQUE NOT NULL,
      junior_doctor_id TEXT NOT NULL,
      verified_summary_json TEXT NOT NULL,
      verification_notes TEXT,
      verified_at TEXT NOT NULL,
      FOREIGN KEY(case_id) REFERENCES cases(id)
    );

    CREATE TABLE IF NOT EXISTS consultations (
      id TEXT PRIMARY KEY,
      case_id TEXT UNIQUE NOT NULL,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      clinical_observations TEXT,
      diagnosis TEXT NOT NULL,
      prescription_items_json TEXT NOT NULL,
      doctor_advice TEXT,
      follow_up_date TEXT,
      notes TEXT,
      completed_at TEXT NOT NULL,
      FOREIGN KEY(case_id) REFERENCES cases(id),
      FOREIGN KEY(patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS dashvidha_questions (
      id TEXT PRIMARY KEY,
      component_key TEXT NOT NULL,
      component_title_en TEXT NOT NULL,
      component_title_hi TEXT NOT NULL,
      question_en TEXT NOT NULL,
      question_hi TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options_json TEXT,
      order_num INTEGER NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS red_flag_rules (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      trigger_keywords TEXT NOT NULL,
      alert_message_en TEXT NOT NULL,
      alert_message_hi TEXT NOT NULL,
      severity TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      role TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // Seed default Dashvidha questions ONLY if table is empty
  const countRes = db.exec(`SELECT COUNT(*) as count FROM dashvidha_questions;`);
  const count = countRes.length > 0 && countRes[0].values.length > 0 ? (countRes[0].values[0][0] as number) : 0;

  if (count === 0) {
    const defaultQuestions = [
      {
        id: 'dv_1',
        component_key: 'prakriti',
        component_title_en: '1. Prakriti – Constitution',
        component_title_hi: '१. प्रकृति – शारीरिक व मानसिक स्वभाव',
        question_en: 'Have you previously been told about your Prakriti (Vata, Pitta, Kapha, or a combination)? If yes, what is your Prakriti?',
        question_hi: 'क्या आपको पहले कभी अपनी प्रकृति (वात, पित्त, कफ अथवा द्वंद्वज) के बारे में बताया गया है? यदि हाँ, तो आपकी प्रकृति क्या है?',
        question_type: 'select_or_text',
        options_json: JSON.stringify(['Not Known / नहीं ज्ञात', 'Vata / वात', 'Pitta / पित्त', 'Kapha / कफ', 'Vata-Pitta / वात-पित्त', 'Pitta-Kapha / पित्त-कफ', 'Vata-Kapha / वात-कफ', 'Tridosha / त्रिदोष']),
        order_num: 1
      },
      {
        id: 'dv_2',
        component_key: 'vikriti',
        component_title_en: '2. Vikriti – Current Imbalance',
        component_title_hi: '२. विकृति – वर्तमान असंतुलन या व्याधि लक्षण',
        question_en: 'What changes or symptoms have you noticed recently compared with your usual health?',
        question_hi: 'सामान्य स्वास्थ्य की तुलना में हाल ही में आपने अपने शरीर में क्या बदलाव या लक्षण महसूस किए हैं?',
        question_type: 'textarea',
        options_json: null,
        order_num: 2
      },
      {
        id: 'dv_3',
        component_key: 'sara',
        component_title_en: '3. Sara – Tissue Quality',
        component_title_hi: '३. सार – धातु बल एवं पुष्टि',
        question_en: 'How would you describe the general strength and quality of your body, skin, muscles and other tissues?',
        question_hi: 'आप अपने शरीर, त्वचा, मांसपेशियों एवं अन्य धातुओं के सामान्य बल और गुणवत्ता का वर्णन कैसे करेंगे?',
        question_type: 'textarea',
        options_json: null,
        order_num: 3
      },
      {
        id: 'dv_4',
        component_key: 'samhanana',
        component_title_en: '4. Samhanana – Body Build',
        component_title_hi: '४. संहनन – शरीर का गठन/ढांचा',
        question_en: 'How would you describe your body build?',
        question_hi: 'आप अपने शरीर के गठन को किस प्रकार वर्णित करेंगे?',
        question_type: 'select',
        options_json: JSON.stringify(['Thin (दुर्बल / कृश)', 'Medium (मध्यम)', 'Well-built / Strong (सुगठित / पुष्ट)']),
        order_num: 4
      },
      {
        id: 'dv_5',
        component_key: 'pramana',
        component_title_en: '5. Pramana – Body Measurements / Proportion',
        component_title_hi: '५. प्रमाण – शरीर माप एवं शारीरिक अनुपात',
        question_en: 'Have you noticed any significant recent change in your body weight or physical proportions?',
        question_hi: 'क्या आपने हाल ही में अपने वजन या शारीरिक अनुपात में कोई उल्लेखनीय बदलाव देखा है?',
        question_type: 'textarea',
        options_json: null,
        order_num: 5
      },
      {
        id: 'dv_6',
        component_key: 'satmya',
        component_title_en: '6. Satmya – Adaptability / Habituation',
        component_title_hi: '६. सात्म्य – अनुकूलता / आहार-विहार सहिष्णुता',
        question_en: 'Which foods, daily routines, climate, or activities suit you well? Are there any that usually do not suit you?',
        question_hi: 'कौन से आहार, दिनचर्या, मौसम या गतिविधियाँ आपको अनुकूल (सूट) बैठती हैं? और क्या कुछ ऐसा है जो बिल्कुल अनुकूल नहीं पड़ता?',
        question_type: 'textarea',
        options_json: null,
        order_num: 6
      },
      {
        id: 'dv_7',
        component_key: 'satva',
        component_title_en: '7. Satva – Mental Strength',
        component_title_hi: '७. सत्त्व – मानसिक बल व मनोवृत्ति',
        question_en: 'How have your stress, sleep, concentration, and ability to cope with difficulties been recently?',
        question_hi: 'हाल के दिनों में आपका तनाव स्तर, नींद की गुणवत्ता, एकाग्रता और कठिनाइयों का सामना करने का मानसिक धैर्य कैसा रहा है?',
        question_type: 'textarea',
        options_json: null,
        order_num: 7
      },
      {
        id: 'dv_8',
        component_key: 'ahara_shakti',
        component_title_en: '8. Ahara Shakti – Food / Digestive Capacity',
        component_title_hi: '८. आहार शक्ति – पाचन एवं आहार ग्रहण क्षमता',
        question_en: 'How is your appetite? How much food can you comfortably eat at a time? Do you experience indigestion, bloating, or heaviness after meals?',
        question_hi: 'आपकी भूख कैसी है? एक समय में आप कितना भोजन सहजता से कर पाते हैं? क्या भोजन के बाद अपच, पेट फूलना या भारीपन होता है?',
        question_type: 'textarea',
        options_json: null,
        order_num: 8
      },
      {
        id: 'dv_9',
        component_key: 'vyayama_shakti',
        component_title_en: '9. Vyayama Shakti – Exercise Capacity',
        component_title_hi: '९. व्यायाम शक्ति – शारीरिक श्रम व कार्य क्षमता',
        question_en: 'How much physical activity can you comfortably perform? Do you experience unusual tiredness or breathlessness during physical activity?',
        question_hi: 'आप कितना शारीरिक श्रम या गतिविधि आराम से कर पाते हैं? क्या परिश्रम के दौरान असामान्य थकान अथवा सांस फूलने की समस्या होती है?',
        question_type: 'textarea',
        options_json: null,
        order_num: 9
      },
      {
        id: 'dv_10',
        component_key: 'vaya',
        component_title_en: '10. Vaya – Age (Auto-obtained)',
        component_title_hi: '१०. वय – आयु (पंजीकृत प्रोफाइल से स्वतः प्राप्त)',
        question_en: 'Age category is auto-retrieved from your registered patient profile.',
        question_hi: 'आयु वर्ग आपके पंजीकृत मरीज प्रोफाइल से स्वतः प्राप्त कर लिया गया है।',
        question_type: 'auto_age',
        options_json: null,
        order_num: 10
      }
    ];

    for (const q of defaultQuestions) {
      db.run(
        `INSERT INTO dashvidha_questions (id, component_key, component_title_en, component_title_hi, question_en, question_hi, question_type, options_json, order_num, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
        [q.id, q.component_key, q.component_title_en, q.component_title_hi, q.question_en, q.question_hi, q.question_type, q.options_json, q.order_num]
      );
    }
  }

  // Seed default Red Flag Rules ONLY if empty
  const rfRes = db.exec(`SELECT COUNT(*) as count FROM red_flag_rules;`);
  const rfCount = rfRes.length > 0 && rfRes[0].values.length > 0 ? (rfRes[0].values[0][0] as number) : 0;
  if (rfCount === 0) {
    const defaultRedFlags = [
      {
        id: 'rf_1',
        category: 'cardiovascular',
        trigger_keywords: 'chest pain,heart pain,radiating to jaw,left arm pain,छाती में दर्द,सीने में दर्द,दिल का दौरा',
        alert_message_en: 'Potential red flag: Acute chest pain or cardiovascular warning signs detected. Immediate clinical assessment is recommended.',
        alert_message_hi: 'संभावित रेड-फ्लैग: तीव्र सीने का दर्द अथवा हृदय संबंधी चेतावनी संकेत। तत्काल नैदानिक मूल्यांकन की अनुशंसा की जाती है।',
        severity: 'critical'
      },
      {
        id: 'rf_2',
        category: 'respiratory',
        trigger_keywords: 'shortness of breath,difficulty breathing,gasping,stridor,सांस लेने में तकलीफ,दम घुटना,सांस फूलना',
        alert_message_en: 'Potential red flag: Severe respiratory distress reported. Immediate clinical assessment is recommended.',
        alert_message_hi: 'संभावित रेड-फ्लैग: गंभीर श्वसन कष्ट की शिकायत। तत्काल नैदानिक मूल्यांकन की अनुशंसा की जाती है।',
        severity: 'critical'
      },
      {
        id: 'rf_3',
        category: 'neurological',
        trigger_keywords: 'unconscious,seizure,fainting,slurred speech,facial drooping,बेहोशी,दौरा,लकवा,मुंह टेढ़ा होना',
        alert_message_en: 'Potential red flag: Acute neurological symptoms reported. Immediate clinical assessment is recommended.',
        alert_message_hi: 'संभावित रेड-फ्लैग: गंभीर न्यूरोलॉजिकल लक्षण। तत्काल नैदानिक मूल्यांकन की अनुशंसा की जाती है।',
        severity: 'critical'
      },
      {
        id: 'rf_4',
        category: 'hemorrhage',
        trigger_keywords: 'vomiting blood,coughing blood,profuse bleeding,खून की उल्टी,खांसी में खून,अत्यधिक रक्तस्राव',
        alert_message_en: 'Potential red flag: Significant bleeding or hemorrhage signs detected. Immediate clinical assessment is recommended.',
        alert_message_hi: 'संभावित रेड-फ्लैग: तीव्र रक्तस्राव अथवा रक्त वमन के संकेत। तत्काल नैदानिक मूल्यांकन की अनुशंसा की जाती है।',
        severity: 'high'
      }
    ];

    for (const rf of defaultRedFlags) {
      db.run(
        `INSERT INTO red_flag_rules (id, category, trigger_keywords, alert_message_en, alert_message_hi, severity, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1);`,
        [rf.id, rf.category, rf.trigger_keywords, rf.alert_message_en, rf.alert_message_hi, rf.severity]
      );
    }
  }
}

// SQL Query Helpers for sql.js
export function queryAll<T = any>(db: Database, sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(db: Database, sql: string, params: SqlValue[] = []): T | null {
  const items = queryAll<T>(db, sql, params);
  return items.length > 0 ? items[0] : null;
}

export function execute(db: Database, sql: string, params: SqlValue[] = []): void {
  db.run(sql, params);
  saveDb();
}
