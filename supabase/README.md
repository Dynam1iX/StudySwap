# StudySwap database (Supabase / PostgreSQL)

Every change to the database lives in `migrations/` as a numbered SQL file, so the schema can be reviewed, versioned and recreated from scratch.

## Migrations

| File | What it does | Status on the project |
| --- | --- | --- |
| `20261010000000_baseline.sql` | Snapshot of the schema that was created by hand in the dashboard | Applied (before tracking) |
| `20261020182414_phase1a_hardening.sql` | Data rules, least privilege, swap rules, indexes | Applied |
| `20261020190000_phase1b_cleanup.sql` | Removes duplicate policies, the old e-mail rule, 2 self-swap test rows, unused colour columns | Applied, then wiped by the reset below |
| `20261020194518_phase1c_restore.sql` | Restores phase 1a on the re-created tables | Applied |
| `20261020194600_phase1c_cleanup.sql` | Restores phase 1b, keeping the `public_read_*` policies (the only read policies after the reset) | Applied (SQL Editor) |
| `20261022120000_search_history.sql` | Recent searches: `search_history` table + `get/add/delete_recent_search(es)`, `clear_recent_searches` | Applied (SQL Editor) |
| `20261022140000_favorites.sql` | Likes: `favorites` table + `get_favorites`, `add_favorite`, `remove_favorite` | Applied (SQL Editor) |
| `20261023010000_owner_rules.sql` | Phase 2: no access without sign-in, own cards/requests only, read-only profile, Telegram handle hidden by column (`get_telegram_handles`), participants-only swap requests, `delete_my_account`, demo fallback removed | Applied (SQL Editor) |
| `20261023120000_telegram_bot.sql` | Telegram bot: one-time link tokens (`create_telegram_link`, `get_telegram_link_status`), `telegram_link_from_bot` (service role only), `unlink_my_telegram`, `users.telegram_user_id` (one Telegram account per student) | Applied (SQL Editor) |
| `20261023140000_remove_test_accounts.sql` | Removes the 2026-10-20 test accounts (profiles without a sign-in account) with their cards, requests and likes | Applied (SQL Editor) |
| `20261023180000_private_data.sql` | Part 1 (additive): `get_my_profile`, `get_post_contacts` (Telegram handle or e-mail per card), signed-in read policy for profile photos | Applied (SQL Editor) |
| `20261023190000_private_data_lock.sql` | Part 2 (after the app is live): other students see only id, name, major, year, photo path; private avatars bucket | Applied (SQL Editor) |
| `20261024020000_no_requests.sql` | No swap requests or ratings: every linked Telegram is visible to signed-in students; `set_telegram_visibility` no longer callable | Applied (SQL Editor) |
| `20261027120000_student_profile.sql` | Another student's page `/u/[id]`: `get_student_profile` (name, major, year, photo path; contact = visible Telegram handle, otherwise the university e-mail only for students with an active card, as on the cards) | Applied (SQL Editor) |
| `20261027140000_card_preview.sql` | Card links `/c/<slug>-<code>`: `get_card_preview` — **public on purpose** (chat apps fetch link previews without signing in); returns only subjects, topics, author first name + initial, major, year of an active card | Applied (SQL Editor) |
| `20261024010000_swap_requests.sql` | Swap requests in the app (statuses, six request functions, handles visible after an accepted swap). Applied 2026-10-24 but the file was lost; **restored from the live database for history only — do not re-run** | Applied (SQL Editor) |
| `20261027160000_hardening.sql` | Bug review fixes: cards cannot set their own `id` / `created_at`, unique 8-character link code; drops `swap_requests` and its functions (`get_telegram_handles`, `export_my_data` updated); the AITU e-mail rule also on e-mail change | Applied (SQL Editor) |
| `20261029120000_polish.sql` | Small review fixes: `update_my_card` fails for a card that no longer exists; topic texts at most 150 characters as stored; `complete_my_profile` requires a year; photos readable only while they are someone's current photo (`avatars_read_current`) | Applied (SQL Editor) |
| `20261029180000_teachers.sql` | Any `@astanait.edu.kz` e-mail can sign up (codes, Microsoft, e-mail change); **Teacher** next to Bachelor's / Master's: `degree_level = 'Teacher'`, `study_year` null (shown as "Teacher" instead of the year); `complete_my_profile` accepts a teacher without a year | Applied (SQL Editor) |
| `20261029200000_card_files.sql` | Files on a card ("Needs help" side): private bucket `card-files` (WebP/JPEG photos and PDFs, 10 MB), table `card_files` (at most 3 per card, readable for cards you can see, added/removed by the author only) | Applied (SQL Editor) |
| `20261029190000_teacher_by_email.sql` | Teacher is decided by the e-mail: exactly 6 digits = student, anything else = teacher (`check_teacher_email` on `users`; `complete_my_profile` sets Teacher for a name e-mail and refuses it for a student e-mail) | Applied (SQL Editor) |
| `20261101120000_admin.sql` | Administrator page `/admin`: `moderation_log` table; `am_i_admin`, `admin_list_cards`, `admin_delete_card` (with a reason), `admin_stats` (totals + the three End-term analysis queries); every function checks the role in the database; 260668 becomes admin | Applied (SQL Editor) |
| `20261102120000_ai_moderation.sql` | AI check of cards: status `pending` (the AI could not check the card: only its author sees it); students no longer insert cards or file rows, or call `update_my_card` — `/api/cards` writes them with the service role after the Gemini check; `set_my_card_status` refuses a pending card; `admin_approve_card`; `ai_checks` + `take_ai_check` (10 AI checks per student per hour, service role only); `admin_list_cards` also returns each card's files, and administrators may open every file in `card-files` (`card_files_read_admin`) | Applied (SQL Editor, 02.11 after PR #53) |
| `20261104120000_fixed_names.sql` | `complete_my_profile` takes the name from the Microsoft account, or for a teacher from the name e-mail (bakyt.bakayeva@… → Bakyt Bakayeva); only a student signed in with an e-mail code types it. Fixes the teacher who signed up with a made-up name; **removes the demo data** (demo students 0000NN and their cards, likes) | **Not applied yet** — run in the SQL Editor |
| `20261022200000_sign_in.sql` | Only `6 digits@astanait.edu.kz` can sign up (trigger on `auth.users`); `complete_my_profile`; signed-in students never fall back to the demo account | Applied (SQL Editor) |
| `20261022180000_avatars.sql` | Storage bucket `avatars` (own-folder policies), `users.avatar_path`, `set_my_avatar`, `remove_my_avatar` | Applied (SQL Editor) |
| `20261022160000_profile_settings.sql` | `users.telegram_visibility`; `get_my_cards`, `update_my_card`, `set_my_card_status`, `delete_my_card`, `set_telegram_visibility`, `export_my_data` | Applied (SQL Editor) |

### Never re-run the setup script

On 2026-10-20 19:03 UTC the old setup script (`DROP TABLE … CASCADE`, `CREATE TABLE …`, test data) was run again from the SQL Editor. It deleted every table, so all phase 1 rules and all data created through the app were lost; phase 1c restores the rules. Change the database only through new files in `migrations/`.

### Destructive migrations

Supabase asks for confirmation before destructive statements (`DROP`, `DELETE`). Run such a migration in the [SQL Editor](https://supabase.com/dashboard/project/bepchknwwdmvugpcypgt/sql/new), confirm, then record it in `supabase_migrations.schema_migrations` with the file's version so the history matches this folder.

## Demo data (`seed/`)

`seed/demo_data.sql` adds 40 demo students (student IDs 000001–000040, which no real student has) and 125 barter cards spread over 12 Oct – 1 Nov 2026, for the End-term data analysis. It is **generated test data** and deterministic (`setseed`), so every run gives the same cards. Added on 2026-11-01. `seed/demo_data_remove.sql` deletes all of it.

## Tables

| Table | Purpose |
| --- | --- |
| `card_files` | Photos / PDFs of example tasks on a card: path in the `card-files` bucket, name, kind (image / pdf), size; at most 3 per card |
| `users` | AITU students and teachers: name, `@astanait.edu.kz` e-mail, optional Telegram, major, year (null for a teacher) |
| `subjects` | Course catalogue in four categories: CS & Dev, Mathematics, Humanities, Languages |
| `barter_posts` | Barter cards: needed subject + topics, offered subject + topics, contact method, status |
| `search_history` | Recent searches of a student (10 newest, one row per query) |
| `favorites` | Cards a student liked (one row per student and card) |
| `moderation_log` | Cards an administrator deleted: card details, reason, who and when (no direct access; written by `admin_delete_card`) |
| `ai_checks` | Time of each AI check per student (no direct access; `take_ai_check` counts them for the hourly limit and removes rows older than a day) |

## Rules enforced by the database

**Data**
- Accounts: any `…@astanait.edu.kz` can sign up or switch to it (before `20261029180000_teachers.sql`: only 6 digits). 6 digits = student, a name e-mail = teacher (triggers on `auth.users`, insert and e-mail change)
- Telegram is optional; when set: 5–32 letters, digits or `_`, without `@`
- Topic texts are required, at most 150 characters (same as the Create form)
- The two subjects of a card must differ
- A card's `id` and `created_at` are set by the database; the first 8 characters of the id (the link code) are unique
- Status (`active`, `completed`, `archived`, `pending`), contact method, role, year and category only accept the listed values

**Access (Row Level Security, phase 2)**
- Nothing is readable or callable without signing in, except `get_card_preview` (link previews: subjects, topics, first name + initial, major, year of an active card)
- Students do not write cards themselves: the server (`/api/cards`, service role) creates them and changes their topics and files after the AI check (`20261102120000_ai_moderation.sql`). Students switch their own cards on / off (`set_my_card_status`, not while `pending`), delete them (`delete_my_card`) and remove their files
- A `pending` card (the AI could not check it) is visible only to its author until an administrator approves it (`admin_approve_card`) or deletes it
- The profile row is read-only; it changes only through functions (avatar, Telegram)
- Other students' rows: only id, name, major, year and photo path; e-mail and Telegram only through `get_post_contacts`, `get_student_profile`, `get_telegram_handles` (every linked handle is visible to signed-in students)
- `search_history`, `favorites` and every `*_my_*` function act only on the signed-in student
- Profile photos: anyone signed in can view a photo that is someone's current one; a student sees and changes every file only in `avatars/<own id>/`

## Roadmap

**Phase 2: with Microsoft sign-in**
- Link `users.id` to `auth.users.id` and create the profile automatically on first sign-in
- Remove the demo-account fallback from `private.current_user_id()` and revoke the recent-search and favorite functions from `anon`
- Owner-based rules: create, edit and close only your own cards and requests
- E-mails visible to signed-in students only
- Authors see their own completed and archived cards

**Phase 3: new tables**
- Ratings after a swap
- The subjects a student can teach, from the sign-up questionnaire

## Edge Functions

`functions/telegram-bot` is the Telegram bot's webhook (deployed with `verify_jwt = false`; it checks Telegram's `X-Telegram-Bot-Api-Secret-Token` header instead). A student opens `t.me/<bot>?start=<token>` from the site; the function links the account through `telegram_link_from_bot` and answers in the student's Telegram language (EN/RU/KZ) inside the webhook response, so it needs no bot token.

Secret: `TELEGRAM_WEBHOOK_SECRET` (Edge Functions → Secrets). The webhook is registered once with Telegram's `setWebhook` (url = `https://bepchknwwdmvugpcypgt.supabase.co/functions/v1/telegram-bot`, the same `secret_token`, `allowed_updates=["message"]`).
