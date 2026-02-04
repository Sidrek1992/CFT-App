import { GoogleGenAI, Type } from "@google/genai";
import { Gender } from "../types";

// Helper to get AI instance safely
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

interface GenderPrediction {
  gender: string;
  title: string;
}

export const detectGenderAndTitle = async (name: string): Promise<{ gender: Gender; title: string }> => {
  try {
    const ai = getAiClient();
    const model = "gemini-2.5-flash";
    
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
    const model = "gemini-2.5-flash";
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

export const refineEmailWithAI = async (currentBody: string, instruction: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const model = "gemini-2.5-flash";
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