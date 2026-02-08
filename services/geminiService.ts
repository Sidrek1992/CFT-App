import { Gender } from "../types";

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('missing_gemini_api_key');
  }
  return apiKey;
};

const extractText = (response: any): string => {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
};

const parseJsonSafe = <T,>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const generateContent = async (input: {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
}) => {
  const apiKey = getApiKey();
  const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: input.systemInstruction
        ? { parts: [{ text: input.systemInstruction }] }
        : undefined,
      contents: [{ parts: [{ text: input.prompt }] }],
      generationConfig: input.responseMimeType
        ? { responseMimeType: input.responseMimeType }
        : undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`gemini_request_failed:${response.status}`);
  }

  return response.json();
};

interface GenderPrediction {
  gender: string;
  title: string;
}

export const detectGenderAndTitle = async (name: string): Promise<{ gender: Gender; title: string }> => {
  try {
    const response = await generateContent({
      prompt: `Analyze this name for Spanish corporate communication: "${name}". Return ONLY JSON with keys: gender (Male|Female|Unspecified) and title (Sr.|Sra.|Sr./Sra.).`,
      responseMimeType: 'application/json',
    });

    const responseText = extractText(response);
    if (responseText) {
      const result = parseJsonSafe<GenderPrediction>(responseText);
      if (!result) {
        return { gender: Gender.Unspecified, title: 'Sr./Sra.' };
      }

      let mappedGender = Gender.Unspecified;
      if (result.gender === 'Male') mappedGender = Gender.Male;
      if (result.gender === 'Female') mappedGender = Gender.Female;

      return {
        gender: mappedGender,
        title: result.title || 'Sr./Sra.',
      };
    }

    return { gender: Gender.Unspecified, title: 'Sr./Sra.' };

  } catch (error) {
    console.error("Error detecting gender:", error);
    return { gender: Gender.Unspecified, title: "Sr./Sra." };
  }
};

export const generateTemplateWithAI = async (instruction: string): Promise<{ subject: string; body: string }> => {
  try {
    const systemInstruction = `You are an expert corporate communications assistant. 
    Your goal is to write a professional email template in Spanish based on the user's request.
    
    CRITICAL RULES:
    1. You MUST use the following placeholders where appropriate for dynamic content:
       - {nombre} (Name of the recipient)
       - {titulo} (Title like 'Sr.', 'Sra.')
       - {estimado} (Adjective: 'Estimado', 'Estimada' or 'Estimado/a' based on gender)
       - {departamento} (Recipient's department)
       - {cargo} (Recipient's position)
       - {correo} (Recipient's email)
       - {jefatura_nombre} (Boss's name)
       - {jefatura_cargo} (Boss's position)
    
     2. Return a JSON object with 'subject' and 'body'.
     3. The tone should be professional but adapted to the instruction (formal, urgent, celebratory, etc.).
     `;

    const response = await generateContent({
      prompt: `${instruction}\n\nReturn ONLY JSON with keys: subject and body.`,
      systemInstruction,
      responseMimeType: 'application/json',
    });

    const responseText = extractText(response);
    if (responseText) {
      const parsed = parseJsonSafe<{ subject?: string; body?: string }>(responseText);
      if (parsed?.subject && parsed?.body) {
        return { subject: parsed.subject, body: parsed.body };
      }
    }

    throw new Error("No content generated");
  } catch (error) {
    console.error("Error generating template:", error);
    throw error;
  }
};

export const refineEmailWithAI = async (currentBody: string, instruction: string): Promise<string> => {
  try {
    const response = await generateContent({
      prompt: `Original Email Body:
      """${currentBody}"""
      
      Instruction for modification: "${instruction}"
      
      Task: Rewrite the email body according to the instruction. Keep the tone professional. Do not add preamble. Return only the new body text.`,
    });

    const responseText = extractText(response);
    if (responseText) {
      return responseText;
    }
    throw new Error("No content generated");
  } catch (error) {
    console.error("Error refining email:", error);
    throw error;
  }
};
