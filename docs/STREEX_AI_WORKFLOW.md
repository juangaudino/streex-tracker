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

## Simple User Rule

```text
New Streex idea -> Sofi first.
```

