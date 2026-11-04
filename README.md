# StudySwap

Peer-to-peer academic barter platform for AITU students: a student offers help with one subject in exchange for help with another. ICT Project, SE-2625.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL) · Vercel

## Getting started

```bash
cp .env.example .env.local   # then fill in the Supabase URL and anon key (+ server keys, below)
npm install
npm run dev                  # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

### Environment variables

| Variable | Where | What for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Supabase project and its public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (Vercel → Settings → Environment Variables) | `/api/cards` writes cards after the AI check. Never prefix it with `NEXT_PUBLIC_` |
| `GEMINI_API_KEY` | Server only | AI check of new and edited cards (Google AI Studio). Missing or failing: cards wait for a moderator |
| `GEMINI_MODEL` | Server only, optional | Another Gemini model; default `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODEL` | Server only, optional | Asked once when the main model answers 503 (overloaded) or 429 (limit); default `gemini-3.5-flash-lite` |

### AI check of cards

Before a card is published, and when its topics or files are edited, `/api/cards` sends the topics, the subject names and the attached photos / PDFs to Gemini. It rejects four kinds of content: swearing / insults / 18+ / violence, money and advertising, academic dishonesty (doing work or tests for someone, leaked answers; explaining is allowed), and spam or text unrelated to the subject.

- **Allowed:** the card is published (or the edit saved).
- **Rejected:** nothing is saved; the student sees a fixed reason for the category in their language, and the topic or file to fix is outlined in red.
- **AI unavailable** (no key, network error, timeout, rate limit of the free tier, odd reply): the card is saved with status `pending`, visible only to its author ("Under review") until an administrator approves or deletes it in `/admin`. Administrators see the photos / PDFs of every card there.
- **Limit:** at most 10 AI checks per student per hour (`take_ai_check` in the database); above it nothing is checked or saved and the student sees how many minutes to wait.
- Create says that topics and files are checked by Google Gemini and links to the Privacy Policy.

Students cannot write cards directly any more (see `supabase/migrations/20261102120000_ai_moderation.sql`), so the check cannot be skipped. Logic: `src/lib/server/gemini.ts` (prompt and reply), `src/lib/server/cards.ts` (limits, files), `src/app/api/cards/` (routes), `src/lib/publish.ts` (browser side).

## Project structure

```
src/
  app/                    Pages (one folder per route)
    page.tsx              /         Feed
    login/                /login    Sign in: code to any @astanait.edu.kz e-mail, or Microsoft (AITU accounts)
    welcome/              /welcome  Complete your profile (first sign-in; name fixed from the Microsoft account or a teacher's name e-mail, typed only by students signing in with a code; name e-mail = Teacher, no year)
    create/               /create   Create a barter offer
    profile/              /profile  Student profile; profile/edit: Telegram + student details
    u/[id]/               /u/<id>   Another student's profile: contact, matching subjects, active cards, share link
    c/[slug]/             /c/<subjects>-<code>  A card's own link: opens the Feed with its details; opengraph-image draws the card for chat previews
    search/               /search   Search: categories, filters, recent searches, results
    favorites/            /favorites Liked cards, with Undo
    terms/ privacy/       /terms, /privacy  Terms of Use and Privacy Policy (open without signing in; linked on the login page). Texts: src/i18n/legal.ts
    admin/                /admin    Administrators only: statistics (End-term analysis) and moderation (approve a card waiting for a check, delete a card with a reason)
    api/cards/            POST /api/cards (publish) and PATCH /api/cards/<id> (edit): AI check with Gemini, then the write (server only)
    layout.tsx            Fonts, metadata
    globals.css           Design tokens (colours, fonts, animations)
  components/
    layout/               AppHeader, BottomNav (phones), DesktopHotbar (≥992px, root layout), MobileShell, NavIcons
    auth/                 AuthGate (redirects to /login or /welcome), login page parts
    barter/               BarterCard: the "Needs help / Can teach" card
    ui/                   Generic UI: BottomSheet (accessible modal: bottom sheet on phones, centred modal or menu on desktop), AvatarViewer (tap a photo: small window, grows out of the avatar)
    feed/ create/ profile/ search/ favorites/  Components used by one page only
    files/                AttachmentsField (pick up to 3 photos / PDFs of tasks), TaskFiles (thumbnails in the swap window, full-screen photo viewer)
    student/              StudentLink (avatar + name → /u/<id>, avatar flies into the header), another student's page parts
    help/                 HelpSheet ("?": how-to video), WelcomeTutorial (Feed, once after each sign-in: Watch / Close)
    legal/                LegalPage: Terms of Use / Privacy Policy in the interface language
    moderation/           AiCheck: button label and scanner line during the AI check, rejection and "sent to a moderator" notices
  lib/
    supabase.ts           Supabase client
    categoryPalette.ts    Colours for each subject category (the only place they live)
    search.ts             Search filters, AITU programs, recent-search functions
    cardLink.ts           Card links (/c/...), parsing the code; cardPreview.ts: public preview data for the link picture
    student.ts            Another student's page: get_student_profile, their cards, matching subjects, avatar view transition
    favorites.ts          Likes: Supabase functions + useFavoriteIds (shared by Feed and Search)
    avatar.ts             Profile photos: crop to 256×256 WebP/JPEG, upload, public URL
    cardFiles.ts          Files on a card: compress photos (≤2000 px WebP/JPEG), upload to the student's folder, signed links
    publish.ts            Publish / edit a card through /api/cards; useFileUploads (upload each file once per form)
    moderation.ts         Shapes shared by the browser and /api/cards (rule categories, requests, answers)
    server/               Server only: supabaseAdmin (service role), gemini (AI check), cards (request checks, file rows)
    format.ts             Small text helpers (initials, short names)
    auth.ts               Sign-in: e-mail codes, Microsoft, current student, complete profile
    telegram.ts           Telegram linking through the bot: link token, status, unlink
    theme.ts              Light / dark theme: saved choice, applied before paint, circle reveal
    sound.ts              Interface sounds (like, publish, Telegram linked, error): on by default, switch in Settings and on Login
  i18n/                   EN / RU / KZ texts (en.ts is the source; ru.ts, kz.ts follow its shape), useT(), I18nProvider; legal.ts: Terms and Privacy texts (update them when the app starts storing or sharing something new)
  types/
    database.ts           Row types of the Supabase tables
public/                   Logo, icons, sounds/ (interface sounds, MP3), help/ (how-to video, poster, step screenshots)
media/                    Media sources and inventory (README): sound masters, video/screenshot recording scripts, PNG masters
```

### Conventions

- **Mobile first, desktop from 992px.** Breakpoints follow the Bootstrap grid of the Figma file: `lg` = 992px, `xl` = 1200px. Pages that have a desktop layout pass `wide` to `MobileShell` (container 912 / 1140px); the others keep the 576px phone column. On desktop the floating `DesktopHotbar` replaces `BottomNav`. Create passes `panel` instead: on desktop it is a 1000px panel in the middle of the screen. `BottomSheet` turns into a centred modal on desktop, or a drop-down menu when given an `anchor` (Search filters); `useIsDesktop()` tells components which layout is on screen.

- **Colours and fonts** come from the tokens in `globals.css` (`bg-page`, `text-ink`, `text-muted`, `border-line`, `font-bricolage`…) and from `categoryPalette.ts` for subjects. No hard-coded copies in pages.
- **Spacing:** page content has 16px side padding; blocks are 16px apart.
- **Data** is loaded in the page and passed down to components as props; components do not call Supabase.
- **Types:** database rows live in `src/types/database.ts`; page-specific shapes live next to the page.

## Database (Supabase)

| Table | Purpose |
| --- | --- |
| `users` | Students: name, university email, Telegram handle, major, year |
| `subjects` | Course catalogue with a category (CS & Dev, Mathematics, Humanities, Languages) |
| `barter_posts` | Barter cards: needed subject, offered subject, topics, contact method, status |
| `moderation_log` | Cards deleted by an administrator, with the reason (only through `admin_delete_card`) |
| `search_history` | Recent searches per student (only through RPC functions) |
| `favorites` | Cards a student liked (only through RPC functions) |
| `card_files` | Photos / PDFs of example tasks on a card |
| `ai_checks` | Time of each AI check per student, for the hourly limit (server only, kept one day) |

Administrators (`users.role` = `admin` or `moderator`) open `/admin` from Profile → Settings. Demo data for the End-term analysis: `supabase/seed/` (generated, removable with one file).

Row Level Security is on. Schema, migrations and the rules the database enforces: see [`supabase/README.md`](supabase/README.md).

## Team

- Alzhan Yerzhanuly: Lead UI/UX Designer & Project Lead
- Nursat Tileuberdyuly: Cloud & Systems Architecture Engineer
- Amanzhan Nurash: Business Analyst & Lead Presenter
