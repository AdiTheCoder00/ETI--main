# ETI Drone Visuals

Marketing site and lead inbox for ETI Drone Visuals. Next.js (App Router) + Supabase + Resend.
Project context and design rules are in [CLAUDE.md](CLAUDE.md).

## Run it locally

    npm install
    npm run dev

Open http://localhost:3000. With no environment variables set, the site runs in local mode:
enquiries are saved to `.data/leads.json`, emails are printed in the terminal, and the lead inbox at
http://localhost:3000/admin has no login.

## Set up the backend

1. **Supabase.** Create a project, then run `supabase/migrations/20260926000000_leads.sql` in the SQL editor
   (or `supabase db push` with the CLI). Under Authentication, turn off sign-ups and add a user (email and
   password) for each person who should see leads.
2. **Resend.** Verify the sending domain (e.g. etidronevisuals.com) and create an API key.
3. **Environment.** Copy `.env.example` to `.env.local` (and into your host's settings), and fill in the
   Supabase keys, `ADMIN_EMAILS`, the Resend key and sender, and a random `LEAD_IP_SALT`.
4. Optional: add Cloudflare Turnstile keys if the honeypot and rate limit stop being enough.

Then deploy (Vercel works as is). Sign in at `/admin/login`.

## How enquiries flow

Contact form → `submitEnquiry` server action → validation, honeypot, optional Turnstile, rate limit
(5 per IP per hour, IPs stored only as salted hashes) → saved to `leads` with status `new` → the studio gets an
email with Reply-To set to the client, and the client gets a short auto-reply. In `/admin`, change a lead's
status to quoted, won or lost, and filter by status.

## Updating the footage

The clips and stills on the site were rebuilt from the old site's 720p copies. To make them sharper, put the
original graded masters in `footage/originals/` (gitignored), named after each clip in `lib/work.ts`
(`plant-chimneys.mov`, `night-highway.mp4`, ...) and the hero as `hero.<ext>`, then:

    npm run footage -- --dry    # check the names and what it will write
    npm run footage

It encodes each clip at up to 1080p (`--height 1440` for more), re-cuts every still from the frame that matches
the current one so the framing stays the same, and rebuilds the hero and its poster. Needs ffmpeg on PATH. Masters
must be graded: HDR is tone-mapped, but a flat log profile would come out washed out. Upload the new clips to the
CDN afterwards.

## Scripts

- `npm run dev`: development server
- `npm run build` / `npm start`: production build
- `npm run lint`, `npm run typecheck`, `npm test`: checks
- `npm run footage`: rebuild clips and stills from the masters (see above)

## Still to fill in

Every [BRACKETED] placeholder on the page: founding year, founder name, crew size, phone number, the chimney
project result, a repeat-client line.
