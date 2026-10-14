import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default('https://placeholder-project.supabase.co'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).default('placeholder-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('placeholder-service-key'),
  GEMINI_API_KEY: z.string().min(1).default('placeholder-gemini-key'),
  VAPID_PRIVATE_KEY: z.string().optional(),
});

export const serverEnv = serverEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
});
