# STREEX

> **Gig earnings tracker. Career identity system. Personal performance cockpit.**

Streex is a mobile-first app for gig workers who want more than a spreadsheet.
It tracks weekly earnings, app performance, mileage, goals, records, achievements,
XP, career progression, narrative recaps, share cards, and AI-powered personal analytics.

It is built for one feeling:

**"My work has a story. My data belongs to me. My progress is real."**

---

## ✨ What Makes Streex Different

Most earning trackers answer:

> How much did I make?

Streex also asks:

> What kind of driver am I becoming?

Streex turns gig work into a living professional identity system:

- 💸 **Earnings tracking** across multiple gig apps
- 📈 **Weekly goals, records, streaks, and momentum**
- 🏆 **Achievements and rarity tiers**
- 🧠 **Ask My Data** AI assistant for personal analytics
- 🧬 **XP + Driver Identity system**
- 🛣️ **Career titles, archetypes, rival benchmarks, and ideal week comparisons**
- 📚 **Weekly letters, monthly recaps, and journey timeline**
- 🎨 **Light, Dark, RPG, and Night Drive themes**
- 🫀 **Pulse Mode** that lets the UI subtly react to momentum
- 📤 **JSON and CSV data export**

---

## 🧭 Product Philosophy

### Identity > Money

Income matters, but Streex is not only about totals.
It helps drivers feel discipline, momentum, recovery, standards, progress, and pride.

### No Shame Analytics

Streex avoids toxic hustle language.
Days off are treated as part of the gig lifestyle, not as failure.

### Your History Is The Benchmark

The app compares the driver against their own past:

- best same weekday
- best week
- best month
- worked-day pace
- personal records
- ideal week built from their own history

The rival is not someone else.
The rival is your own previous standard.

---

## 🧩 Core Features

### 📊 Dashboard

The dashboard is the main cockpit:

- current week total
- goal progress
- remaining amount
- same-point comparisons
- record chase
- best day and best app
- days logged vs active days
- smart mood headline
- momentum chip
- Driver Identity card
- active milestones

It is designed to feel smart without being noisy.

### ⚡ Quick Entry

Fast daily input for active apps:

- Uber
- Lyft
- Spark
- DoorDash
- Amazon Flex
- Instacart
- Shipt
- custom apps

Each day can be saved, closed, and reflected in weekly totals.

### 🏁 End Day

The End Day flow gives the driver a compact daily recap:

- daily total
- daily rank context
- record proximity
- weekly momentum
- near achievements

It closes the day with forward motion, not judgment.

### 🏆 Achievements

Achievements include rarity tiers and progression:

- common
- rare
- epic
- legendary
- mythic

They reward goals, records, streaks, growth, app variety, and consistency.

### 🧬 Driver Identity

Streex V5.4 introduced a full identity layer:

- Consistency XP
- Performance XP
- cumulative driver levels
- automatic driver archetypes
- historical day ranking
- rival snippets
- ideal week comparison
- adaptive pace
- day off language

Driver levels:

1. Rookie
2. Road Runner
3. Steady Grinder
4. Street Pro
5. Top Earner
6. Elite Driver
7. Streex Legend

### 🪪 Career Titles

V5.4.2 added dynamic career titles, combining real behavior with progression.

Examples:

- `Street Pro - Record Hunter`
- `Road Runner - Goal Closer`
- `Steady Grinder - Week Builder`
- `Rookie - Identity Forming`
- `Streex Legend - Legendary Spark Specialist`

### 🫀 Pulse Mode

Pulse Mode is an optional visual layer.

When enabled, Streex subtly reacts to the current dashboard state:

- calm
- steady
- streak
- strong
- record chase

It is visual only, local-only, and can be disabled instantly.

### 🤖 Ask My Data

Ask My Data is an experimental analytics assistant inside Streex.

It can answer questions like:

- What was my best week?
- What is my average weekly income?
- Which week had the strongest performance?
- What achievements have I unlocked recently?
- What pattern do you see in my recent weeks?

Architecture principles:

- server-side AI only
- user JWT verification
- RLS-scoped Supabase queries
- no arbitrary SQL
- compact scoped context
- no full raw database dumps
- streaming responses
- usage logging
- graceful rate-limit and credit errors

### 📚 Journey, Letters, and Recaps

Streex treats work history like a career narrative:

- Journey Feed
- Weekly Letters
- Letters Library
- Monthly Recaps
- monthly heatmaps
- strongest week highlights
- emotional summaries
- shareable career moments

### 📤 Export My Data

Users can export their data from Settings:

- JSON backup
- CSV earnings export

Exports support:

- backups
- personal ownership
- future AI analytics
- migration safety
- trust

---

## 🎨 Themes

Streex currently includes four visual modes:

### ☀️ Light

Clean, bright, and practical.

### 🌙 Dark

Quiet, focused, and low-friction.

### 🎮 RPG

Futuristic tactical HUD with neon accents and achievement energy.

### 🛣️ Night Drive

Cockpit-inspired surfaces, streetlight amber, dashboard teal, asphalt depth,
and subtle road-lane atmosphere.

---

## 🏗️ Tech Stack

- ⚛️ **React**
- ⚡ **Vite**
- 🧭 **React Router**
- 🎨 **Tailwind CSS**
- 🧱 **shadcn/ui**
- 🔐 **Supabase Auth**
- 🗄️ **Supabase Postgres**
- 🧠 **Supabase Edge Functions**
- 🤖 **Lovable AI Gateway**
- 🚀 **Vercel previews**
- 🛠️ **Lovable-assisted development**

---

## 🔐 Backend Rule

Streex uses **one backend only**:

```text
Lovable app
→ live Lovable-connected Supabase backend
→ all Streex data and persistence
```

The live source of truth includes:

- `weeks`
- `user_settings`
- `user_achievements`
- `xp_events`
- Ask My Data logs
- auth
- future analytics
- future identity and career systems

No separate Supabase project should be assumed or created unless explicitly requested.

---

## 🚀 Local / Preview Setup

This repo is configured for Vercel preview deployments.

### Vercel Settings

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### Required Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The `vercel.json` file keeps nested app routes working when opened directly.

---

## 🧪 Safety Principles

Streex development follows these rules:

- keep production behavior stable
- additive-first architecture
- preserve existing dashboard, auth, earnings, exports, achievements, records, and Ask My Data behavior
- apply database migrations only to the confirmed live Lovable-connected backend
- never expose auth tokens, API keys, Supabase secrets, or internal credentials
- keep user-owned data scoped by RLS
- avoid full raw data dumps into AI prompts
- make recovery, rest, and days off feel legitimate

---

## 📜 Changelog

### V5.4.2 — Pulse Mode + Career Titles

- Pulse Mode added as an optional momentum-reactive visual layer
- Dashboard can now subtly shift visual intensity for calm, steady, streak, strong, and record-chase states
- Career Title Generator added to Driver Identity
- Career titles combine driver level, behavior, goals, records, and archetype signals
- Pulse Mode is stored locally and can be turned on or off from Settings

### V5.4.1 — Night Drive Theme

- Night Drive added as a fourth visual theme
- Cockpit-style surfaces with streetlight and dashboard accents
- Subtle road-lane atmosphere across the app shell
- Theme selector updated in Settings without changing production data behavior

### V5.4 — XP + Identity System

- Dual XP System with Consistency XP and Performance XP
- Driver Levels from Rookie to Streex Legend
- Automatic Driver Archetypes based on real behavior
- Historical day ranking and healthy rival snippets
- Ideal Week comparison built from your own best weekdays
- Day Off V1 keeps quiet days neutral and non-punitive
- Adaptive Calendar Pace and Worked-Day Pace
- XP ledger with idempotent event keys to avoid duplicate awards

### V5.3B.3 — Ask My Data

- Ask My Data added as a beta assistant
- Scope-aware answers for recent, all-time, and seasonal questions
- Streaming assistant responses
- AI usage logging for tokens, latency, scope, and estimated cost
- Server-side record answers for best-week questions

### V5.3B.2 — Dashboard Clarity & Data Export

- Dashboard semantics cleanup
- Adaptive Active Days logic
- Human-readable Active Days labels
- Export My Data added to Settings
- JSON backup export
- CSV earnings export

### V5.3B — Social Layer & Share Center

- Share Center added inside Journey
- Premium share cards for weekly highlights, milestones, and career moments
- Monthly flex cards generated from recap data
- Weekly letter excerpts as quote-style share cards
- Story, Square, and Wide export formats
- Copy, Save, and Share support
- Legendary moments get a quiet gold treatment

### V5.3A.1 — Letters Library & Share Export

- Letters Library added
- Every closed week archived as a chapter
- Letters tagged by emotional theme and anchored to weekly total
- Letters persist permanently
- Share cards can be saved as images or shared natively
- Letters surfaced inside Progress Hub

### V5.3A — Narrative Core

- Weekly Letter generated from real week data
- Expanded Journey Feed with narrative events
- Three strong days, streak protection, and goal-defended moments
- First $200/$300 weekday milestones
- Share card foundation for future export and social moments

### V5.2.1 — Branding, Navigation & Heatmap Polish

- Improved Streex branding on splash and header
- Cleaner 4-item bottom navigation
- New Progress Hub for Journey, Recap, and Achievements
- Improved monthly heatmap contrast and hierarchy
- Enhanced legendary day visuals with shimmer and glow

### V5.2 — Monthly Recap System

- Monthly Recap System added
- Monthly Heatmap with all-time best day glow
- Emotional month summaries and closing lines
- Strongest week spotlight inside each month
- Monthly narrative flow integrated into Journey

### V5.1.5 — Cohesion & Momentum Refinement

- Milestones grid uses equal heights and contextual cards
- Removed early-day negative pacing
- New early/mid/high state vocabulary
- Active Momentum keeps building anticipation
- Fresh Chapter screen echoes last week's wins
- Smarter time-of-day aware motivational logic

### V5.1 — Narrative Evolution

- Weekly Closing Experience
- Journey Feed
- Full Changelog history with version timeline
- Near-momentum items
- Smarter pacing
- 2-column mobile trophy grid
- Expanded performance insights
- Post-week state

### V5.0.2 — UX, Emotional Logic & Monthly Progression

- Unified mood engine
- Pre-run states for $0 mornings
- End Day moved inside Quick Add
- Closed-day badge prevents accidental edits
- Monthly Progression replaces punishing growth percentage

### V5.0.1 — Navigation Cleanup

- Settings moved to user menu
- Less crowded mobile bottom navigation
- Improved dashboard hierarchy

### V5.0 — Career Journey & End Day

- Career page with archetype and lifetime stats
- End Day flow with rich daily recap
- Daily record progression psychology

### V4.5 — Emotional Reward & Stability

- Record Celebration system
- Advanced rotating commentary
- Layout stability fixes for long emotional headers

### V4.0 — Smart Momentum Layer

- Active Momentum streak section
- Smart dashboard headers
- Daily and weekly record chases

### V3.0 — Achievements & Rarity

- Achievements system with rarity tiers
- RPG mode polish
- Mobile day detail view

---

## 🧠 The Big Idea

Streex is not just tracking gig earnings.

It is building a personal operating system for independent work:

- track the money
- understand the rhythm
- protect the recovery
- celebrate the progress
- own the data
- grow the identity

**Built for drivers who want their work to feel like progress, not just transactions.**
