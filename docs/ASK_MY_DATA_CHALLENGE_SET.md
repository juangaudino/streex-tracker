# Ask My Data Challenge Set

Version: V5.7.7

Purpose: manual QA certification prompts for Ask My Data. This file tracks question intent, expected behavior, and current status so Ask My Data improves through repeatable audits instead of one-off screenshots.

## Core Pass Set

| Question | Intent | Expected answer type | Status |
| --- | --- | --- | --- |
| Si quisiera descansar dos dias seguidos, cuales deberian ser? | DAY / REST PAIR | Compare valid consecutive weekday pairs by combined average and recommend lowest impact pair. | PASS |
| Y los dos dias que no deberia descansar? | DAY / REST PAIR | Recommend highest combined consecutive pair if user means protecting earnings. | PASS |
| What was my best day ever? | DAY | Return top single earning day, not an unrelated list unless user asks for a list. | PASS |
| What is my best weekday? | DAY | Return weekday with highest average and evidence. | PASS |
| Which weekday makes me the most money? | DAY | Return weekday with highest average and evidence. | PASS |
| What was my strongest month? | MONTH | Calculate month totals from daily entries and return strongest month. | PASS |
| How much did I earn this month compared to last month? | MONTH | Compare current month vs previous month. | PASS |
| What was my highest earning streak? | STREAK | Return highest total consecutive active-day streak, not top single days. | PASS |
| What is my best earning hour? | HOUR | State hourly earnings are not tracked yet; do not return day rankings. | PASS |
| Where does today rank in my history? | RANKING | Rank current tracked day against historical earning days when current day is available. | PASS |
| What record am I closest to breaking? | RANKING | Compare current tracked day to closest daily or same-weekday record. | PASS |
| What do I need per day to hit my goal? | GOAL | Use current open week total, goal, and remaining tracked days. | PASS |
| Are my weekends getting stronger or weaker? | PATTERN | Compare combined Saturday + Sunday trend, not only individual days. | PASS |
| Tell me something surprising about my data. | INSIGHT | Return Insight / Evidence / Opportunity using supported data. | PASS |
| What's a pattern I haven't noticed? | PATTERN | Return one concrete pattern with evidence and opportunity. | PASS |
| If you were coaching me, what would you focus on? | COACHING | Give a grounded coaching focus from earnings data, not generic refusal. | PASS |

## Capability Awareness Set

| Question | Expected limitation handling |
| --- | --- |
| Park City and Ski rides | Explain that trip locations and ride types are not tracked yet. |
| What's my healthiest schedule based on my history? | Avoid medical/health claims; offer earnings-friendly and rest-aware framing. |
| What mistake do I repeat most often? | Avoid pretending to know qualitative mistakes; infer only from supported earnings patterns if useful. |
| Which version of me is my toughest rival? | Explain rival/version comparisons need a defined comparison layer or period pair. |

## QA Notes

- Default scope is full history unless user asks for a bounded timeframe.
- Do not answer unsupported intents by substituting a similar supported query.
- If the system cannot calculate something, say what is missing and offer the closest supported Streex analysis.
- For insight prompts, avoid "I don't know what is surprising to you" as the final answer. Provide one data-backed insight with measured language.
