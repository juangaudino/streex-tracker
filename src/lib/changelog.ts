export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  tags?: ("new" | "fix" | "polish" | "feature" | "balance")[];
  items: string[];
}

export const CURRENT_VERSION = "5.2";

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "5.2",
    date: "2026-05",
    title: "Monthly Recap System",
    tags: ["new", "feature"],
    items: [
      "Monthly Recap System — a cinematic end-of-month story",
      "Monthly Heatmap with all-time best day glow",
      "Emotional month summaries and closing lines",
      "Strongest week spotlight inside each month",
      "Monthly narrative flow integrated into your Journey",
    ],
  },
  {
    version: "5.1.5",
    date: "2026-05",
    title: "Cohesion & Momentum Refinement",
    tags: ["polish", "balance"],
    items: [
      "Milestones grid now uses equal heights and auto-fills with contextual cards",
      "Removed early-day negative pacing — mornings always feel hopeful",
      "New early/mid/high state vocabulary (Fresh Start → Locked In → Monster Session)",
      "Active Momentum never feels empty — near-unlock cards keep building anticipation",
      "Fresh Chapter screen now echoes last week's wins to bridge continuity",
      "Smarter motivational logic — time-of-day aware, never punishes a normal start",
    ],
  },
  {
    version: "5.1",
    date: "2026-05",
    title: "Narrative Evolution",
    tags: ["new", "feature"],
    items: [
      "Weekly Closing Experience — chapter recap when a week ends",
      "Journey Feed — your career in a living timeline",
      "Full Changelog history with version timeline",
      "Near-momentum items keep the dashboard alive",
      "Smarter pacing — no more 'rebuilding' too early in the day",
      "Milestones now use a 2-column trophy grid on mobile",
      "Expanded Performance insights (weekday averages, weekend pace, app strength)",
      "Post-week state replaces the old onboarding screen",
    ],
  },
  {
    version: "5.0.2",
    date: "2026-05",
    title: "UX, Emotional Logic & Monthly Progression",
    tags: ["polish", "feature"],
    items: [
      "Unified mood engine — headline, pace and commentary always agree",
      "Pre-run states for $0 mornings",
      "End Day moved inside the Quick Add card",
      "Closed-day badge prevents accidental edits",
      "Monthly Progression replaces punishing growth %",
    ],
  },
  {
    version: "5.0.1",
    date: "2026-05",
    title: "Navigation Cleanup",
    tags: ["polish"],
    items: [
      "Settings moved to user menu",
      "Less crowded mobile bottom navigation",
      "Improved dashboard hierarchy",
    ],
  },
  {
    version: "5.0",
    date: "2026-04",
    title: "Career Journey & End Day",
    tags: ["feature"],
    items: [
      "Career page with archetype + lifetime stats",
      "End Day flow with rich daily recap",
      "Daily record progression psychology",
    ],
  },
  {
    version: "4.5",
    date: "2026-04",
    title: "Emotional Reward & Stability",
    tags: ["feature", "polish"],
    items: [
      "Record Celebration system with particles + haptics",
      "Advanced rotating commentary",
      "Layout stability fixes for long emotional headers",
    ],
  },
  {
    version: "4.0",
    date: "2026-03",
    title: "Smart Momentum Layer",
    tags: ["feature"],
    items: [
      "Active Momentum streak section",
      "Smart dashboard headers",
      "Daily and weekly record chases",
    ],
  },
  {
    version: "3.0",
    date: "2026-02",
    title: "Achievements & Rarity",
    tags: ["feature"],
    items: [
      "Achievements system with rarity tiers",
      "RPG mode polish",
      "Mobile day detail view",
    ],
  },
];