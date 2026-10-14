# Architecture and Technical Decisions Log

## 1. Framework & Runtime: Next.js 16 (App Router) & React 19
- **Decision**: Built using Next.js 16 with Turbopack, React 19, strict TypeScript, and Tailwind CSS v4.
- **Rationale**: Provides server-side rendering, streaming RSCs, automatic code-splitting, modern PWA integration, and optimal mobile performance.

## 2. Backend, Auth, and Storage: Supabase & pgvector
- **Decision**: Supabase Postgres with `vector` extension (`pgvector`), Supabase SSR Auth with cookie session proxying, private Storage buckets for materials and avatars.
- **Rationale**: Full compliance with Row Level Security (RLS) ensuring strict user data isolation. Vector search + Postgres full-text search combined via Reciprocal Rank Fusion (RRF) for high accuracy RAG.

## 3. Answer Secrecy Architecture
- **Decision**: Question answer keys (correct choices, boolean answers, accepted text variants, rubrics, model answers, detailed explanations, and remember tips) are stored in `public.question_answer_keys`.
- **Rationale**: RLS is enabled on `question_answer_keys` with **zero policies** for authenticated or anonymous users. End-clients cannot read answer keys via Supabase REST API or inspect them in network traffic during active quizzes. Only server-side route handlers using the service role can access answer keys, and only release them upon attempt submission.

## 4. AI Provider & Models: Provider-Agnostic Interface + Google Gemini SDK
- **Decision**: All AI calls go through `src/server/ai/provider.ts`. Fully implemented using the official `@google/genai` SDK.
- **Models**:
  - Main Text / Structured Generation: `gemini-3.8-flash` (or fallback `gemini-3.5-flash`)
  - Vision / Document OCR / Multimodal: `gemini-3.8-flash`
  - Text Embeddings: `gemini-embedding-2` (768-dimension vectors)
- **Validation**: All structured outputs use JSON schema with Zod validation. If an AI output fails validation, a single repair attempt is performed before surfacing a clear recoverable error to the user.

## 5. Offline & PWA Strategy
- **Decision**: Modern PWA with static app manifest (`/manifest.ts`), dynamic icons, handcrafted service worker for shell/offline caching, and IndexedDB local autosave for active quiz attempts.
- **Rationale**: Ensures uninterrupted quiz taking and note reading even when connectivity drops mid-session.
