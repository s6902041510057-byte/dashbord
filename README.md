# Cosmic EdTech Quiz — Classroom Team Battle

Real-time gamified classroom group quiz (Teacher + Students) with Cosmic Dark theme.

## Stack
- Next.js 14 (App Router) + TypeScript Strict + Tailwind CSS
- Framer Motion + Lucide + canvas-confetti
- Supabase (Postgres + Realtime Broadcast/Presence) — see `supabase/schema.sql`
- Deploy: Vercel + GitHub

## Quick start
1. Copy env:
   ```bash
   cp .env.example .env.local
   ```
   Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase Dashboard.
2. Create schema: run `supabase/schema.sql` in Supabase SQL Editor.
3. Install + dev:
   ```bash
   npm install
   npm run dev
   ```
4. Build check (must pass before Vercel):
   ```bash
   npm run build
   ```

## Flow
สร้างห้อง → นักเรียนเข้าห้อง → Lobby → สุ่มกลุ่ม (Random Wheel) → โหวตหัวหน้า → ตั้งชื่อกลุ่ม → เลือกผู้ตอบ → เริ่มการแข่งขัน → ตอบคำถาม → เฉลย → คำนวณคะแนน → จัดอันดับ → ประกาศผู้ชนะ

See `GLOSSARY.md` and `docs/adr/` for domain language and architecture decisions.
