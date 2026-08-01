# Issues #8 and #9 capability validation

The Agent now asks the configured model for a mode-specific JSON reasoning
contract and normalizes partial or plain-text responses into the existing
`NextActionCard` or `DecisionCard` schema.

The automated scenario matrix covers eight ask cases and eight decide cases.
Run it against the configured provider with:

```powershell
$env:LYL_LIVE_TEST="1"
uv run pytest apps/agent/tests/test_counsel_skills.py -m live
```

The non-live matrix runs by default and verifies the same acceptance fields
without a network call:

```powershell
uv run pytest apps/agent/tests/test_counsel_skills.py -m "not live"
```

Coverage includes local/global scope, unclear goals, insufficient information,
too many options, action resistance, low-risk reversible actions, goal
reframing, 2–4 decision options, recommendation, opposition view, and
reconsideration conditions. External research execution remains outside these
issues; when information is insufficient the graph records the unknown and
uses the existing report-now interrupt path.
