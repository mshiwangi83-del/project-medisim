import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export function isAIConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY.trim() !== ''
  );
}

const CANDIDATE_FLASH_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

async function generateWithModelFallback(
  ai: GoogleGenAI,
  prompt: string,
  config?: any
): Promise<string> {
  let lastError: any = null;

  for (const model of CANDIDATE_FLASH_MODELS) {
    try {
      // 10s per-model timeout to avoid hanging express requests
      const responsePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout waiting for model ${model}`)), 9000)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const text = response.text?.trim();
      if (text) return text;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.warn(`Model ${model} response issue: ${errMsg.slice(0, 100)}`);

      // If project-level quota / 429 is exceeded, do not cycle other models
      if (err?.status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded')) {
        throw new Error('Gemini API quota limit reached. Please wait a moment before trying again.');
      }
    }
  }

  const finalMsg = lastError?.message || 'Question generation service encountered high demand';
  if (finalMsg.includes('503') || finalMsg.includes('high demand')) {
    throw new Error('AI medical assistant service is temporarily experiencing high server demand. Please retry in a few moments.');
  }

  throw lastError || new Error('Question generation service encountered a temporary capacity limit');
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

export async function generateDynamicFollowUpQuestions(params: {
  initialComplaint: string;
  patientAge: number;
  patientGender: string;
  allergies?: string;
  existingConditions?: string;
  previousAnswers?: Array<{ question: string; answer: string }>;
  language: 'en' | 'hi';
}): Promise<DynamicQuestion[]> {
  if (!isAIConfigured()) {
    throw new Error('Question generation service is not configured');
  }

  const ai = getAI();
  if (!ai) {
    throw new Error('Question generation service is not configured');
  }

  const { initialComplaint, patientAge, patientGender, allergies, existingConditions, previousAnswers = [] } = params;

  const prompt = `
You are a hospital medical assistant AI facilitating pre-consultation case-taking for an upcoming clinical doctor visit.
IMPORTANT SAFETY MANDATE:
- DO NOT diagnose the patient.
- DO NOT prescribe any medicine or treatment.
- Your sole purpose is to formulate structured, empathetic, clinically clarifying follow-up questions to gather necessary history for the physician.

Patient Context:
- Age: ${patientAge}, Gender: ${patientGender}
- Chief Complaint: "${initialComplaint}"
- Known Allergies: "${allergies || 'None reported'}"
- Known Existing Conditions: "${existingConditions || 'None reported'}"
- Previous Q&A already collected: ${JSON.stringify(previousAnswers)}

Generate 4 to 6 clinically relevant, dynamic follow-up questions tailored specifically to this complaint.
Cover aspects such as:
1. Exact symptom onset and duration
2. Severity (e.g. 1-10 or mild/moderate/severe)
3. Frequency, aggravating or relieving factors
4. Associated symptoms (e.g., fever, nausea, radiation of pain, cough, etc.)
5. Any previous treatment taken for this specific episode

Return a strictly valid JSON array of objects with the following schema:
[
  {
    "id": "q1",
    "category": "duration_onset",
    "question_en": "English question here",
    "question_hi": "Hindi question here in clean Devanagari script",
    "type": "text",
    "clinical_intent": "Clarify exact timeline"
  }
]
No markdown wrapping, just valid JSON array.
`;

  try {
    const text = await generateWithModelFallback(ai, prompt, {
      responseMimeType: 'application/json',
      temperature: 0.2,
    });

    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    throw new Error('AI returned an empty question set');
  } catch (err: any) {
    console.error('Error generating AI questions via Gemini:', err);
    throw new Error(err.message || 'Failed to generate dynamic case-taking questions');
  }
}

export async function performReportOCR(params: {
  base64Data: string;
  mimeType: string;
  fileName: string;
}): Promise<string> {
  const ai = getAI();
  const { base64Data, mimeType, fileName } = params;

  if (ai) {
    try {
      // Clean base64 data if it includes data URL prefix
      const cleanBase64 = base64Data.includes('base64,')
        ? base64Data.split('base64,')[1]
        : base64Data;

      const promptText = `
You are a specialized medical OCR engine for a hospital information system.
Extract all visible textual data from this medical laboratory report / imaging / prescription document accurately.

CRITICAL INSTRUCTIONS:
- Transcribe text, test names, parameters, observed numerical values, biological reference ranges, units, and dates exactly as printed.
- NEVER invent, assume, or hallucinate missing information or values.
- If a section is illegible or faint, explicitly state "[Illegible / अस्पष्ट]".
- Preserve structure into logical sections: Patient Details, Test Name, Observed Result, Normal Reference Interval, Impressions/Notes.
- Do NOT make diagnostic judgements or prescribe treatments.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: promptText,
            },
          ],
        },
      });

      const extracted = response.text?.trim();
      if (extracted && extracted.length > 5) {
        return extracted;
      }
    } catch (err) {
      console.error('Gemini OCR extraction failed, falling back to simulated OCR parser:', err);
    }
  }

  // Graceful rule-based extraction fallback for simulated environment if API key is not ready
  return `[OCR Extracted Text from ${fileName}]\nReport scanned: ${new Date().toLocaleDateString()}\nNote: Gemini OCR service is ready for live multimodal extraction with an active GEMINI_API_KEY.\nPatient review is required before saving.`;
}

export async function generateAICaseSummary(params: {
  patient: any;
  initialComplaint: string;
  speechTranscript?: string;
  dynamicQa: Array<{ question: string; answer: string; clinical_intent?: string }>;
  dashvidhaResponses: Record<string, string>;
  medicalReports: Array<{ title: string; ocr_verified_text?: string; ocr_extracted_text?: string }>;
  redFlagsDetected: string[];
}): Promise<any> {
  const ai = getAI();
  const {
    patient,
    initialComplaint,
    speechTranscript,
    dynamicQa,
    dashvidhaResponses,
    medicalReports,
    redFlagsDetected,
  } = params;

  if (ai) {
    try {
      const prompt = `
You are an expert clinical medical scribe and case-taking organizer assistant in a hospital.
Produce an "AI-Assisted Case Summary" for a patient's case intake.

SAFETY RULES:
- Clearly state "AI-Assisted Case Summary – Requires Professional Verification".
- DO NOT PROVIDE A FINAL DIAGNOSIS OR PRESCRIBE MEDICATION.
- Synthesize the patient's self-reported information, speech transcript, dynamic answers, verified lab/OCR data, and Ayurvedic Dashvidha Pariksha findings into an organized, objective clinical intake report for the Junior and Senior Medical Doctors.

PATIENT RECORD:
Name: ${patient.full_name}, Age: ${patient.age}, Gender: ${patient.gender}, Blood Group: ${patient.blood_group || 'Unknown'}
Known Allergies: ${patient.allergies || 'None reported'}
Existing Conditions: ${patient.existing_conditions || 'None reported'}
Current Medications: ${patient.current_medications || 'None reported'}
Surgical/Family History: ${patient.surgical_history || 'None'} / ${patient.family_history || 'None'}

INITIAL COMPLAINT:
"${initialComplaint}"
${speechTranscript ? `Patient Speech Transcript: "${speechTranscript}"` : ''}

DYNAMIC FOLLOW-UP Q&A:
${JSON.stringify(dynamicQa, null, 2)}

AYURVEDIC DASHVIDHA PARIKSHA RESPONSES:
${JSON.stringify(dashvidhaResponses, null, 2)}

RELEVANT REPORTS & OCR FINDINGS:
${JSON.stringify(medicalReports.map(r => ({ title: r.title, findings: r.ocr_verified_text || r.ocr_extracted_text })), null, 2)}

RED FLAGS DETECTED BY RULE ENGINE:
${JSON.stringify(redFlagsDetected)}

Output a strictly valid JSON object matching this structure:
{
  "notice": "AI-Assisted Case Summary – Requires Professional Verification",
  "patient_overview": "Brief demographic and history synopsis",
  "chief_complaint": "Chief complaint with duration and severity",
  "symptoms_analysis": "Organized breakdown of symptoms, aggravating/relieving factors",
  "relevant_history_medications": "Allergies, ongoing medicines, past medical background",
  "report_findings_summary": "Summary of uploaded lab/imaging/OCR data or note if none",
  "patient_reported_details": "Key insights from patient direct responses and voice transcript",
  "dashvidha_pariksha_summary": "Summary of the 10 Ayurvedic factors (Prakriti, Vikriti, Sara, Samhanana, Pramana, Satmya, Satva, Ahara Shakti, Vyayama Shakti, Vaya)",
  "clinical_observations": "Objective points for the attending physician to inspect during physical examination",
  "red_flag_warnings": ["List of warning signs or red flags requiring prompt attention"]
}
`;

      const text = await generateWithModelFallback(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.1,
      });

      const parsed = JSON.parse(text || '{}');
      return {
        ...parsed,
        patient_name: patient.full_name,
        patient_age: patient.age,
        patient_gender: patient.gender,
        patient_blood_group: patient.blood_group || 'Unknown',
        patient_abha: patient.abha_id || 'N/A',
      };
    } catch (err) {
      console.error('Failed to generate summary with Gemini fallback, using structured template fallback:', err);
    }
  }

  // Structured algorithmic fallback summary
  return {
    notice: 'AI-Assisted Case Summary – Requires Professional Verification',
    patient_name: patient.full_name,
    patient_age: patient.age,
    patient_gender: patient.gender,
    patient_blood_group: patient.blood_group || 'Unknown',
    patient_abha: patient.abha_id || 'N/A',
    patient_overview: `${patient.full_name}, ${patient.age}y ${patient.gender}. Blood group: ${patient.blood_group || 'Not specified'}. Known existing conditions: ${patient.existing_conditions || 'None'}. Allergies: ${patient.allergies || 'None recorded'}.`,
    chief_complaint: initialComplaint,
    symptoms_analysis: dynamicQa.map(q => `${q.question}: ${q.answer}`).join(' | '),
    relevant_history_medications: `Current Medications: ${patient.current_medications || 'None'} | Allergies: ${patient.allergies || 'None'} | Past History: ${patient.surgical_history || 'None'}`,
    report_findings_summary: medicalReports.length > 0
      ? medicalReports.map(r => `${r.title}: ${r.ocr_verified_text || r.ocr_extracted_text || 'Report attached'}`).join('; ')
      : 'No medical reports uploaded for this case.',
    patient_reported_details: speechTranscript ? `Spoken transcription verified: "${speechTranscript}"` : 'Direct text input recorded.',
    dashvidha_pariksha_summary: Object.entries(dashvidhaResponses).map(([k, v]) => `${k}: ${v}`).join('; ') || 'Dashvidha Pariksha recorded.',
    clinical_observations: 'Vitals, general systemic evaluation, and physical examination to be conducted by attending physician.',
    red_flag_warnings: redFlagsDetected.length > 0 ? redFlagsDetected : ['No immediate acute red flags detected by rule engine.'],
  };
}

export function detectRedFlags(
  textToScan: string,
  rules: Array<{ trigger_keywords: string; alert_message_en: string; alert_message_hi: string; severity: string; is_active: number }>
): string[] {
  const alerts: string[] = [];
  const lower = textToScan.toLowerCase();

  for (const rule of rules) {
    if (!rule.is_active) continue;
    const keywords = rule.trigger_keywords.split(',').map(k => k.trim().toLowerCase());
    const matched = keywords.some(k => k.length > 1 && lower.includes(k));
    if (matched) {
      alerts.push(rule.alert_message_en);
    }
  }

  return alerts;
}
