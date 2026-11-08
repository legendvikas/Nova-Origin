# NOVA Origin

NOVA Origin esports website and management control room.

## Stack
- React + TypeScript + Vite
- Tailwind CSS v4 and custom responsive styling
- Supabase Auth + Postgres Data API (RLS protected)

## Setup

1. Install dependencies with \`npm install\`.
2. Create \`.env.local\` using \`.env.example\`.
3. Set \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_PUBLISHABLE_KEY\`.
4. Enable Google OAuth in Supabase Auth if you want Google sign-in.
5. Run \`npm run dev\`.

## Access control

The control room checks the signed-in user's \`user_roles\` record. Platform administrators can manage the NOVA website. Organizer accounts must be approved before management access is granted. Never add a Supabase secret/service-role key to frontend environment variables.

## Content management

Team profiles, tournaments, announcements and community updates are managed from the control room. Image fields accept hosted image URLs. Supabase Storage is not configured in this project yet, so file uploads are intentionally not presented as available.

## Build

\`npm run build\`
