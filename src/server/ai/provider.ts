import 'server-only';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { serverEnv } from '@/server/env';

// Default modern model identifiers (as verified from Google AI Studio / Gemini API docs 2026)
const TEXT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';

function getAiClient() {
  const key = serverEnv.GEMINI_API_KEY;
  if (!key || key === 'placeholder-gemini-key') {
    return null;
  }
  return new GoogleGenAI({ apiKey: key });
}

export interface StructuredGenerateOptions<T> {
  prompt: string;
  systemInstruction?: string;
  schema: z.ZodType<T>;
  temperature?: number;
}

export interface GenerateStreamOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  onChunk: (chunkText: string) => Promise<void> | void;
}

export async function generateStructured<T>(options: StructuredGenerateOptions<T>): Promise<T> {
  const client = getAiClient();
  if (!client) {
    throw new Error('Gemini API key is not configured.');
  }

  const requestConfig = {
    model: TEXT_MODEL,
    contents: options.prompt,
    config: {
      systemInstruction: options.systemInstruction,
      temperature: options.temperature ?? 0.2,
      responseMimeType: 'application/json',
    },
  };

  try {
    const response = await client.models.generateContent(requestConfig);
    const rawText = response.text || '';
    const parsed = JSON.parse(rawText);
    return options.schema.parse(parsed);
  } catch (firstError) {
    // 1-step repair attempt
    const repairPrompt = `Your previous response failed validation: ${(firstError as Error).message}. Please fix the JSON output to strictly match the requested schema for prompt:\n${options.prompt}`;
    const repairResponse = await client.models.generateContent({
      model: TEXT_MODEL,
      contents: repairPrompt,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });
    const repairedText = repairResponse.text || '';
    const parsed = JSON.parse(repairedText);
    return options.schema.parse(parsed);
  }
}

export async function generateStream(options: GenerateStreamOptions): Promise<string> {
  const client = getAiClient();
  if (!client) {
    throw new Error('Gemini API key is not configured.');
  }

  const responseStream = await client.models.generateContentStream({
    model: TEXT_MODEL,
    contents: options.prompt,
    config: {
      systemInstruction: options.systemInstruction,
      temperature: options.temperature ?? 0.5,
    },
  });

  let fullText = '';
  for await (const chunk of responseStream) {
    const text = chunk.text || '';
    fullText += text;
    await options.onChunk(text);
  }

  return fullText;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getAiClient();
  if (!client) {
    // Fallback zero vector if API key is not available
    return new Array(768).fill(0);
  }

  const formattedInput = `task: search result | query: ${text}`;
  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: formattedInput,
  });

  const resObj = response as unknown as { embedding?: { values: number[] }; embeddings?: Array<{ values: number[] }> };
  if (resObj.embedding?.values) {
    return resObj.embedding.values;
  }
  if (resObj.embeddings?.[0]?.values) {
    return resObj.embeddings[0].values;
  }
  return new Array(768).fill(0);
}

export async function generateVisionOcr(imageBuffer: Buffer, mimeType: string, prompt?: string): Promise<string> {
  const client = getAiClient();
  if (!client) {
    throw new Error('Gemini API key is not configured.');
  }

  const base64Data = imageBuffer.toString('base64');
  const response = await client.models.generateContent({
    model: TEXT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt || 'Extract all legible text, headings, diagrams descriptions, and handwritten notes from this image accurately. Preserve layout and structure as clean markdown.',
          },
        ],
      },
    ],
  });

  return response.text || '';
}
