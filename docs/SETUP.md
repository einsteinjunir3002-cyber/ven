# Venessa Study - Setup Guide

Follow these steps to configure environment variables, set up Supabase database and storage, configure Gemini AI, and run the project locally or in production.

---

## 1. Environment Variables

Create `.env.local` in the project root based on `.env.example`.

```env
# Public Supabase credentials
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<your-anon/publishable-key>"

# Private Supabase Service Role Key (Server-only, never expose to client!)
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"

# Google Gemini API Key
GEMINI_API_KEY="<your-gemini-api-key>"

# Optional Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
```

---

## 2. Supabase Setup

### A. Apply Migration
1. Go to your Supabase Project Dashboard -> SQL Editor.
2. Run the contents of `supabase/migrations/20261003000001_init.sql`.
3. Verify that `vector` extension and all 22 tables are created with Row Level Security (RLS) enabled.

### B. Storage Buckets Setup
In Supabase Dashboard -> Storage:
1. Create a **private** bucket named `materials`.
   - Maximum file size: 25MB
   - Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `image/jpeg`, `image/png`, `image/webp`
2. Create a **private** bucket named `avatars`.
   - Maximum file size: 5MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

---

## 3. Running Locally

```bash
# Install dependencies
npm install

# Typecheck & Lint
npm run typecheck
npm run lint

# Run Development Server with Next.js Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on mobile viewport (e.g. 390x844).
