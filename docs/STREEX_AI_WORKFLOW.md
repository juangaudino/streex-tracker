# Streex AI Operating System

This document is a living workflow. Update it when the team's roles or execution rules change.

## Core Rule

Every new Streex idea starts with Sofi / ChatGPT.

```text
User -> Sofi / ChatGPT -> recommended next tool
```

The user should not need to decide first whether something belongs to Codex, Lovable, Gemini, or Claude.

## Roles

### Sofi / ChatGPT - Product Brain

Owns:

- roadmap and product strategy
- UX philosophy
- architecture direction
- prompt creation
- QA review
- workflow orchestration
- project memory and continuity

Use first for new ideas, roadmap questions, feature planning, and evaluating outputs.

### Codex - Engineering Brain

Owns:

- repo execution
- code changes and refactors
- migrations and Edge Functions
- backend logic
- tests
- bug fixes
- changelog discipline

Codex should receive a clear spec after product direction is defined.

### Lovable - Builder / UI Ecosystem

Owns:

- visual building
- fast UI iteration
- project previews
- Lovable-connected backend deployment
- frontend experience polish

Use Lovable when visual iteration or live backend deployment is the main need.

### Gemini Pro - Research + Challenger

Use for:

- provider and API research
- documentation analysis
- pricing comparisons
- technical second opinions
- external research challenges

### Claude - Special Ops

Use when available for:

- product philosophy
- motivation and reward systems
- deep UX critique
- alternative conceptual perspectives

Claude is optional and should not be required for critical execution.

## Workflow Types

### New Product / UX Idea

```text
Sofi / ChatGPT
-> optional Gemini challenge or research
-> Sofi final prompt
-> Lovable for UI preview
-> Codex for logic or polish if needed
```

### Backend / Logic / Analytics Feature

```text
Sofi / ChatGPT
-> optional Gemini documentation research
-> Codex implementation
-> preview and testing
```

### Product Philosophy / Career System Feature

```text
Sofi / ChatGPT
-> Claude if available
-> Sofi integrates final direction
-> Codex or Lovable depending on execution type
```

### Visual Polish / Theme / Experience Layer

```text
Sofi / ChatGPT
-> Lovable or Codex
-> preview
-> Sofi review
```

### Research / Provider Selection

```text
Sofi / ChatGPT
-> Gemini research
-> Sofi decision
-> Codex or Lovable execution
```

## Permanent Architecture Rules

- One backend only.
- Use the live Lovable-connected Supabase backend.
- Do not create a separate Supabase project.
- Do not expose secrets in frontend code.
- Keep production behavior stable.
- Prefer additive-first architecture.
- Preserve mobile-first UX.
- Update changelogs for meaningful changes.
- If backend ambiguity exists, stop and ask.

## Change Summary Rule

Whenever Codex, Lovable, Gemini, or Claude performs meaningful work, paste the summary back to Sofi / ChatGPT.

Sofi classifies it as:

- roadmap feature
- branch feature
- QA / polish
- experiment
- bug fix

Sofi then decides whether roadmap or status documentation needs updating.

## Versioning Rule

Streex is in public beta versioning.

Current baseline:

```text
Beta 0.1.0
```

Older `V3.x` through `V5.x` entries are preserved as Alpha Archive history.

Before implementing any prompt, bug fix, polish session, roadmap feature, or update request, Codex should:

1. classify the request
2. propose the version number
3. ask the user for approval if the version classification is not already explicit

Use:

- `0.1.x` for small bug fixes, QA fixes, and polish
- `0.2.0`, `0.3.0`, etc. for meaningful beta feature releases
- `1.0.0` only for the first stable public release

Do not continue the old Alpha `V5.x` sequence for new beta releases.

## Simple User Rule

```text
New Streex idea -> Sofi first.
```
