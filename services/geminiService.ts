import { GoogleGenAI, Type } from "@google/genai";
import { Gender, PdfAnalysisResult } from "../types";

// Helper to get AI instance safely
// Note: process.env.API_KEY is replaced at build time by Vite (see vite.config.ts define block)
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error(
      "La clave de API de Gemini no está configurada. " +
      "Agrega GEMINI_API_KEY en el archivo .env y reinicia el servidor."
    );
  }
  return new GoogleGenAI({ apiKey });
};

interface GenderPrediction {
  gender: string;
  title: string;
}

export const detectGenderAndTitle = async (name: string): Promise<{ gender: Gender; title: string }> => {
  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";

    const response = await ai.models.generateContent({
      model: model,
      contents: `Analyze the name "${name}" for a Spanish-speaking corporate context. Determine the gender and the appropriate title (e.g., "Sr." or "Sra.").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            gender: {
              type: Type.STRING,
              enum: ["Male", "Female", "Unspecified"],
              description: "The gender associated with the name."
            },
            title: {
              type: Type.STRING,
              description: "The formal Spanish title prefix (e.g. 'Sr.', 'Sra.', 'Dr.'). Do not include 'Estimado'."
            }
          },
          required: ["gender", "title"]
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text) as GenderPrediction;

      let mappedGender = Gender.Unspecified;
      if (result.gender === "Male") mappedGender = Gender.Male;
      if (result.gender === "Female") mappedGender = Gender.Female;

      return {
        gender: mappedGender,
        title: result.title
      };
    }

    return { gender: Gender.Unspecified, title: "Sr./Sra." };

  } catch (error) {
    console.error("Error detecting gender:", error);
    return { gender: Gender.Unspecified, title: "Sr./Sra." };
  }
};

export const generateTemplateWithAI = async (instruction: string): Promise<{ subject: string; body: string }> => {
  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";
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

    const response = await ai.models.generateContent({
      model: model,
      contents: instruction,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "The email subject line" },
            body: { type: Type.STRING, description: "The email body with placeholders" }
          },
          required: ["subject", "body"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No content generated");
  } catch (error) {
    console.error("Error generating template:", error);
    throw error;
  }
};

/**
 * Generates 3 short, contextual AI quick-reply suggestions for an email thread.
 * Returns an array of ready-to-use reply strings in Spanish.
 */
export const generateQuickReplies = async (
  threadContext: string,
  lastMessageFrom: string
): Promise<string[]> => {
  try {
    const ai = getAiClient();
    const model = 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model,
      contents: `Eres un asistente corporativo. Analiza el siguiente hilo de correo y genera exactamente 3 respuestas rápidas cortas y profesionales en español (máximo 2 oraciones cada una).
            
Último mensaje de: ${lastMessageFrom}
Contexto del hilo:
"""
${threadContext.slice(0, 2000)}
"""

Devuelve exactamente un JSON con la clave "replies" conteniendo un array de 3 strings.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Array of exactly 3 short professional reply suggestions in Spanish'
            }
          },
          required: ['replies']
        }
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed.replies?.slice(0, 3) || [];
    }
    return [];
  } catch (error) {
    console.error('Error generating quick replies:', error);
    return [];
  }
};

/**
 * Converts a File object to a base64 string (without the data: prefix).
 */
const fileToBase64Str = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix: "data:<mime>;base64,"
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/**
 * Analyzes a PDF file using Gemini multimodal vision.
 * Specifically detects issues in attendance/hours reports (reportes de asistencia):
 *  - Illegible or unreadable content
 *  - Missing hours (horas no detectadas)
 *  - High number of TOTAL HORAS FALTA entries
 *  - General document inconsistencies
 */
export const analyzePdfWithAI = async (file: File): Promise<PdfAnalysisResult> => {
  const ai = getAiClient();

  // Use gemini-3-flash-preview for multimodal document analysis
  const model = 'gemini-3-flash-preview';

  const base64Data = await fileToBase64Str(file);
  const mimeType = file.type || 'application/pdf';

  const prompt = `Eres un auditor de documentos laborales en Chile. Analiza este documento (puede ser un reporte de asistencia, informe de horas u otro documento laboral institucional) y responde en JSON siguiendo el esquema indicado.

Busca específicamente:
1. Si el documento es legible (texto visible y reconocible).
2. Si se pueden leer las horas trabajadas / horas del período (busca columnas de horas, totales, etc.).
3. Cuántas incidencias de "TOTAL HORAS FALTA", "HORAS FALTA", "H. FALTA" o equivalentes aparecen y si los valores son inusualmente altos (más de 8 horas en un período es sospechoso).
4. Otras inconsistencias: fechas inválidas, nombres en blanco, valores negativos, totales que no cuadran, firmas faltantes, páginas en blanco, etc.

Nombre del archivo: "${file.name}"`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Resumen breve (1-2 oraciones) del documento y su estado general.',
          },
          isLegible: {
            type: Type.BOOLEAN,
            description: 'true si el documento tiene texto legible, false si está en blanco o ilegible.',
          },
          horasDetected: {
            type: Type.BOOLEAN,
            description: 'true si se pueden leer horas en el documento.',
          },
          totalHorasFalta: {
            type: Type.NUMBER,
            description: 'Suma total de horas falta detectadas en el documento. null si no aplica.',
          },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                severity: {
                  type: Type.STRING,
                  enum: ['error', 'warning', 'info'],
                  description: 'error = crítico, warning = atención requerida, info = observación menor.',
                },
                description: {
                  type: Type.STRING,
                  description: 'Descripción clara de la inconsistencia o problema encontrado.',
                },
              },
              required: ['severity', 'description'],
            },
            description: 'Lista de inconsistencias o problemas detectados. Vacío si el documento está correcto.',
          },
        },
        required: ['summary', 'isLegible', 'horasDetected', 'issues'],
      },
    },
  });

  if (!response.text) throw new Error('El modelo no devolvió respuesta');

  const parsed = JSON.parse(response.text);
  return {
    fileName: file.name,
    summary: parsed.summary ?? '',
    issues: parsed.issues ?? [],
    horasDetected: parsed.horasDetected ?? false,
    totalHorasFalta: parsed.totalHorasFalta ?? null,
    isLegible: parsed.isLegible ?? true,
  };
};

export const refineEmailWithAI = async (currentBody: string, instruction: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const model = "gemini-3-flash-preview";
    const response = await ai.models.generateContent({
      model: model,
      contents: `Original Email Body:
      """${currentBody}"""
      
      Instruction for modification: "${instruction}"
      
      Task: Rewrite the email body according to the instruction. Keep the tone professional. Do not add preamble. Return only the new body text.`,
    });

    if (response.text) {
      return response.text.trim();
    }
    throw new Error("No content generated");
  } catch (error) {
    console.error("Error refining email:", error);
    throw error;
  }
};