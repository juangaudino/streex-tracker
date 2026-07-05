# STREEX canonical data contracts

These contracts are the approval boundary for the July 2026 integrity audit.

| Datum | Canonical meaning | Storage | Aggregation rule |
|---|---|---|---|
| App earnings | Accumulated operational earnings for one app and day | `day.apps[app]` | Sum apps; never add a Quick Update value to the stored app total |
| Bonus | Non-operational reward income | `day.bonuses[]` | Included in money totals, excluded from efficiency denominators |
| Rides | Accumulated rides for one app inside a shift | `shift.ridesByApp[app]` | Sum app counts; preserve unattributed legacy total without inventing attribution |
| Miles | Accumulated business miles for the whole day | `day.mileage` | Day value is authoritative; shift miles are attribution components, not another daily total |
| Shift time | Active work inside edited shift boundaries | `shift.blocks[]` | Sum valid blocks; exclude pauses; clamp blocks to edited boundaries |
| Earnings snapshot | One observed app-total transition | `earnings_snapshots` | `delta = new - previous`; identical transition rows must not repeat |
| Day total | Operational app earnings plus bonuses | derived | Same result in Dashboard, Entry, report, analytics, Ask context, JSON and CSV |
| Week total | Sum of seven canonical day totals | derived | Exact to the cent across all surfaces |

Runtime parsing is implemented in `src/lib/weekIntegrity.ts`. Structurally invalid week JSON is rejected during hydration; semantic P0/P1 contradictions are detected and logged without hiding otherwise readable historical data.
