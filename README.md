# STREEX

> **Gig earnings tracker. Career identity system. Personal performance cockpit.**

Streex is a mobile-first app for gig workers who want more than a spreadsheet.
It tracks weekly earnings, app performance, mileage, goals, records, achievements,
XP, career progression, narrative recaps, share cards, and AI-powered personal analytics.

It is built for one feeling:

**"My work has a story. My data belongs to me. My progress is real."**

## Project Continuity

New contributors and new Codex chats should begin with:

- `docs/NEW_CHAT_HANDOFF.md`
- `AGENTS.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/STREEX_AI_WORKFLOW.md`
- `docs/PRODUCT_STATUS.md`
- `docs/ROADMAP.md`
- `CHANGELOG.md`

`docs/PRODUCT_STATUS.md` is the master living status document for Claude, ChatGPT, Codex, and Lovable. If an external AI has repo access, ask it to read that file first.

`docs/NEW_CHAT_HANDOFF.md` is the concise operational handoff: current architecture, finished systems, pending work, design rules, known risks, routes, and collaboration workflow. A machine-specific `START_HERE.local.md` may also exist locally and is intentionally ignored by Git.

## Current Production Status

- Current release: **Beta 0.8.9**
- Production app: `https://gig.getstreex.com`
- Hosting: **Vercel**
- DNS/domain: **Cloudflare** for `getstreex.com`
- Active Supabase project ref: `ywbrovislvqkfzsyqpiv`
- Legacy Lovable Supabase project ref: `mnwymfyvvdhekzvipjmp`

The active production app is no longer dependent on Lovable hosting. Lovable can still be used for visual iteration or assistance, but production code should flow through GitHub/Vercel and the active owner-controlled Supabase project.

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
- 🧭 **Deep Insights** desktop analytics cockpit with configurable multi-period comparisons
- 🧰 **Full Focus Utility Slot** for unified conditions and Octopus reward progress
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

Streex includes multiple visual modes:

- Classic Light
- Classic Dark
- RPG
- Night
- Signature
- Velocity

Theme work is visual only unless a specific task says otherwise. Auth, earnings, shifts, exports, Ask My Data, and backend behavior should not change during theme-only work.

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
- 🚀 **Vercel production + previews**
- 🌐 **Cloudflare DNS**
- 🛠️ **Lovable-assisted development**

---

## 🔐 Backend Rule

Streex uses **one active production backend only**:

```text
Vercel app at gig.getstreex.com
→ owner-controlled Supabase backend
→ all Streex data and persistence
```

Active Supabase project:

```text
ywbrovislvqkfzsyqpiv
```

Legacy Lovable-managed Supabase project:

```text
mnwymfyvvdhekzvipjmp
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

No separate Supabase project should be assumed or created unless explicitly requested. Treat the legacy Lovable project as historical context unless the user explicitly asks to inspect or compare it.

---

## 🚀 Local / Preview Setup

This repo is configured for Vercel production and preview deployments.

### Vercel Settings

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### Required Environment Variables

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

The `vercel.json` file keeps nested app routes working when opened directly.

---

## 🧪 Safety Principles

Streex development follows these rules:

- keep production behavior stable
- additive-first architecture
- preserve existing dashboard, auth, earnings, exports, achievements, records, and Ask My Data behavior
- apply database migrations only to the confirmed active Supabase backend
- never expose auth tokens, API keys, Supabase secrets, or internal credentials
- keep user-owned data scoped by RLS
- avoid full raw data dumps into AI prompts
- make recovery, rest, and days off feel legitimate

---

## 📜 Changelog

Use these files for release history:

- `CHANGELOG.md`
- `src/lib/changelog.ts`
- `docs/PRODUCT_STATUS.md`

Older `V3.x` through `V5.x` labels are preserved as Alpha Archive history. Current work uses public beta versioning.

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
