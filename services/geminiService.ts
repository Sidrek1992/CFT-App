import { Gender, PdfAnalysisResult } from '../types';
import { callProtectedFunction } from './cloudFunctionService';

interface GeminiProxyResponse<T> {
  result: T;
}

interface GenderPrediction {
  gender: 'Male' | 'Female' | 'Unspecified';
  title: string;
}

const mapGender = (value: string): Gender => {
  if (value === 'Male') return Gender.Male;
  if (value === 'Female') return Gender.Female;
  return Gender.Unspecified;
};

export const detectGenderAndTitle = async (
  name: string
): Promise<{ gender: Gender; title: string }> => {
  try {
    const response = await callProtectedFunction<GeminiProxyResponse<GenderPrediction>>(
      'geminiProxy',
      {
        action: 'detectGenderAndTitle',
        payload: { name },
      }
    );

    const result = response?.result;
    return {
      gender: mapGender(result?.gender || 'Unspecified'),
      title: result?.title || 'Sr./Sra.',
    };
  } catch (error) {
    console.error('Error detecting gender:', error);
    return { gender: Gender.Unspecified, title: 'Sr./Sra.' };
  }
};

export const generateTemplateWithAI = async (
  instruction: string
): Promise<{ subject: string; body: string }> => {
  const response = await callProtectedFunction<
    GeminiProxyResponse<{ subject: string; body: string }>
  >('geminiProxy', {
    action: 'generateTemplate',
    payload: { instruction },
  });

  if (!response?.result?.subject || !response?.result?.body) {
    throw new Error('No se pudo generar una plantilla valida.');
  }

  return response.result;
};

export const generateQuickReplies = async (
  threadContext: string,
  lastMessageFrom: string
): Promise<string[]> => {
  try {
    const response = await callProtectedFunction<
      GeminiProxyResponse<{ replies: string[] }>
    >('geminiProxy', {
      action: 'generateQuickReplies',
      payload: { threadContext, lastMessageFrom },
    });

    return response?.result?.replies?.slice(0, 3) || [];
  } catch (error) {
    console.error('Error generating quick replies:', error);
    return [];
  }
};

const fileToBase64Str = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const analyzePdfWithAI = async (file: File): Promise<PdfAnalysisResult> => {
  const base64Data = await fileToBase64Str(file);
  const mimeType = file.type || 'application/pdf';

  const response = await callProtectedFunction<GeminiProxyResponse<PdfAnalysisResult>>(
    'geminiProxy',
    {
      action: 'analyzePdf',
      payload: {
        fileName: file.name,
        mimeType,
        base64Data,
      },
    }
  );

  const result = response?.result;
  if (!result) {
    throw new Error('El modelo no devolvio respuesta');
  }

  return {
    fileName: file.name,
    summary: result.summary ?? '',
    issues: result.issues ?? [],
    horasDetected: result.horasDetected ?? false,
    totalHorasFalta: result.totalHorasFalta ?? null,
    isLegible: result.isLegible ?? true,
  };
};

export const refineEmailWithAI = async (
  currentBody: string,
  instruction: string
): Promise<string> => {
  const response = await callProtectedFunction<GeminiProxyResponse<{ body: string }>>(
    'geminiProxy',
    {
      action: 'refineEmail',
      payload: { currentBody, instruction },
    }
  );

  if (!response?.result?.body) {
    throw new Error('No content generated');
  }
  return response.result.body.trim();
};
