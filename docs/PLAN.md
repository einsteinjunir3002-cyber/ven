# Venessa Study: Build Plan

The app is built in vertical slices. Each slice has to work and pass its tests before the next one starts.
After each milestone: `npm run typecheck && npm run lint && npm run test && npm run test:e2e` (E2E runs at mobile viewports).

## M0: Foundation
- [x] Next.js 16 (App Router, Turbopack), strict TypeScript, Tailwind v4, ESLint + Prettier
- [x] Design tokens (`src/app/tokens.css`): light and dark themes, semantic quiz states, motion, radius, shadows
- [x] Self-hosted fonts (Fraunces display, Inter body) through `next/font/local`
- [x] Zod-validated environment (`src/lib/env.ts`, `src/server/env.ts`). The server fails fast on bad config.
- [x] Security headers and CSP (`next.config.ts`)
- [x] Supabase SQL migrations: schema, RLS, storage buckets, hybrid search, rate limits

## M1: Shell, onboarding, auth
- [x] Mobile app shell: bottom nav (5 tabs), safe areas, `dvh`, sidebar from 1024px up
- [x] Theme applied before first paint (no flash), text-size scaling, reduced motion
- [x] 4-screen onboarding (swipe and buttons) and the "Welcome, Venessa 👋" screen
- [x] Email one-time-code sign-in (Supabase OTP). The session persists. The proxy refreshes tokens.

## M2: Study material
- [x] "Add Study Material" bottom sheet: PDF, DOCX, PPTX, images, camera, paste text
- [x] Multi-image pages: reorder and delete before upload
- [x] Signed direct-to-storage uploads, then server finalize (magic bytes, size, quota)
- [x] Resumable background job: extract, structure, chunk, embed, analyze, ready. Progress is stage-based.
- [x] Library (cards, search, filter, sort, overflow sheet, delete confirmation)
- [x] Reader (17–18px, saved reading position, Ask AI sheet, ask about a text selection, original-image toggle)

## M3: AI tutor and lessons
- [x] Provider-agnostic AI interface with a Gemini implementation (JSON + Zod + repair retry, streaming, embeddings, vision)
- [x] Versioned prompt files
- [x] Tutor chat: streaming, Stop button, context chip, quick prompts, history per context, voice input when available
- [x] Explain My Notes (grounded, with source labels) and Teach Me (sections are saved as they finish)
- [x] Subject outline ("Suggested topics")
- [x] Home intent routing with a confirm step when confidence is low

## M4: Quizzes, marking, exam
- [x] Quiz generation sheet (sources, count, difficulty, type)
- [x] Answer keys stored in a table that clients cannot read. Only the server can read it, and only after submission.
- [x] Full-screen quiz UI: progress dots/segments, answer cards (radio group), flag, swipe, autosave to IndexedDB, server sync
- [x] Review & Submit screen. Idempotent server marking: deterministic, normalized, then AI rubric.
- [x] Score reveal (skippable, reduced-motion aware) and the review cards
- [x] Exam mode: the server sets the deadline, a warning shows at 5 and 1 minutes, the quiz auto-submits, the tutor is disabled

## M5: Learning loop
- [x] Mistakes (deduplicated, practice similar, mark as understood, a suggestion to mark understood)
- [x] Weak areas (thresholds plus a minimum sample size) and a targeted practice quiz
- [x] Progress metrics and SVG charts with data tables
- [x] Study time heartbeats that pause when the tab is hidden
- [x] Gentle streak with a rest-day grace

## M6: Profile, PWA, offline
- [x] Profile and settings, private avatar upload with crop, data export, account deletion
- [x] Manifest, icons, a hand-written service worker, offline fallback page, update prompt, install prompt (Android and iOS)
- [x] Offline banner, persisted query cache, durable write queue for answers and submissions
- [x] Web Push opt-in (shown only when VAPID keys are configured)

## M7: Verification
- [x] Unit tests: marking, normalization, chunking, retrieval fusion, scoring, weak areas, streak, file sniffing
- [x] Integration tests: API route handlers (auth guard, validation, answer secrecy serializers)
- [x] Playwright at 6 phone viewports plus tablet and desktop, light and dark. axe-core. Screenshots.
- [x] Full journey E2E (needs real Supabase and Gemini keys. See `docs/SETUP.md`.)
- [x] Docs: README, SETUP, DECISIONS, THIRD_PARTY, TEST_REPORT
