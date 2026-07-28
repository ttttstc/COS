# Issue #2 validation matrix

| Acceptance item | Implementation | Validation | Status |
|---|---|---|---|
| `pnpm install` | Root pnpm workspace | `pnpm install --frozen-lockfile` | Passed |
| Web starts | `apps/web` Next.js app | `pnpm dev`, HTTP 200 | Passed |
| Agent installs and starts | `apps/agent`, `langgraph.json` | frozen `uv sync`; local server `/info` | Passed |
| Web connects to Agent | Web environment + LangGraph SDK | SDK and browser smoke | Passed |
| Create Thread | Upstream Stream provider | SDK and browser smoke | Passed |
| Stream response | Minimal chat model node | SDK and browser smoke | Passed |
| Stop generation | `ComposerAction` and `stream.stop()` | component and browser validation | Passed |
| Reopen Thread | URL `threadId` + server state | SDK reopen and browser refresh | Passed |
| Readable errors | connection toast + Next error boundary | component test and production build | Passed |
| File chooser retained | upstream file-upload hook and input | browser validation | Passed |
| Artifact retained | upstream Artifact provider/slots | component test | Passed |
| Interrupt retained | upstream generic and agent-inbox renderers | source review, typecheck, build | Passed |
| Safe environment examples | root and app examples | credential-shape scan | Passed |
| Complete startup docs | root README | clean-checkout command review | Passed |
| Web lint/typecheck/tests | package scripts | local CI-equivalent commands | Passed |
| Agent unit tests | `apps/agent/tests` | 5 pytest tests | Passed |
| CI | `.github/workflows/ci.yml` | syntax + local equivalent; PR run pending | Configured |
| MIT attribution | `apps/web/LICENSE`, `NOTICE.md` | copyright and commit review | Passed |
