# Fan Arena – Implementation TODO

## Plan items
- [ ] Ensure live Day label always uses `match.day_number` (no hardcoded “Day 01”).
- [ ] Update leaderboard tie-break: same `total_xp` => rank by first-come-first-serve using `xp_ledger.created_at` (earliest ledger row) as deterministic tie-break.
- [ ] Add Quiz tab in fan UI (match screen + bottom nav).
- [ ] Add Quiz component for fans to answer quiz questions.
- [ ] Add admin Quiz section to add quiz questions + mark correct + run XP payout.
- [ ] Verify build/lint and basic runtime flows.

## Notes
- “Roaster/roster” explanation will be provided in final response (no code change requested). 

