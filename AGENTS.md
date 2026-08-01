# COS Agent Engineering Instructions

> Scope: repository root and all descendant directories.
> This file is the mandatory project-level instruction source for Codex and other coding agents.
> Standard filename: `AGENTS.md`.

## 1. Instruction precedence

When requirements conflict, follow this order:

1. The current GitHub Issue acceptance criteria;
2. This `AGENTS.md`;
3. `docs/design/LYL-ClauseOS-Desktop-UI-Implementation-Spec-V2.0.md`;
4. `docs/design/reference/ClauseOS-UI-UX-Design-Spec-V2.0.md`;
5. `docs/LYL-参谋台-SPEC-V1.0.md`;
6. `docs/LYL-参谋台-PRD-V1.0.md`;
7. Existing implementation conventions;
8. Developer or agent preference.

Do not silently resolve a real conflict between the current Issue, this file, PRD, SPEC, or design specifications. Stop and report the conflict with a recommended resolution.

Validation commands are intentionally distinct: `pnpm test:e2e` starts the
Playwright web server on port 3001, while `pnpm smoke` exercises the running
LangGraph Agent endpoint and does not start the web server.

## 2. Product boundaries

COS is the repository for the LYL personal strategic counsel agent.

Mandatory product constraints:

- The user-visible core object is always called **“议题”**. Do not expose “会商”, “Thread”, or mixed terminology in product UI.
- V0.1 uses one long-lived main Agent.
- Do not introduce a fixed multi-Agent team unless a later approved Issue explicitly requires it.
- Workflow is only an internal conditional path for complex research; do not build a Workflow editor.
- All counsel functions are initiated by the user in V0.1.
- Do not implement daily proactive cognitive training.
- Do not execute irreversible or external write operations.
- Do not expose private chain of thought. Show stages, evidence, conclusions, uncertainty, risk, and change conditions.
- Preserve Agent Chat UI foundations: Thread storage, streaming, stop, file upload, Interrupt, Artifact, and resumable streams.

## 3. Mandatory design sources

Before adding or modifying any user-visible UI, read:

1. `docs/design/LYL-ClauseOS-Desktop-UI-Implementation-Spec-V2.0.md`
2. `docs/design/reference/ClauseOS-UI-UX-Design-Spec-V2.0.md`
3. `docs/design/controls/CONTROL-INVENTORY.md`
4. `docs/design/controls/CONTROL-STATE-MATRIX.md`
5. `design-system/README.md`
6. `design-system/lyl-clauseos-ui.css`
7. `design-system/ui-contracts.ts`
8. `design-system/control-gallery.html`
9. `docs/design/ucd/lyl-interactive-ucd.html`

These files are normative implementation inputs, not optional visual references.

## 4. Design-token baseline

### 4.1 Token source of truth

The canonical executable token source is:

```text
design-system/lyl-clauseos-ui.css
```

Production code must consume semantic tokens. Do not scatter raw color, radius, blur, shadow, spacing, duration, or layout values across business components.

When a new token is necessary:

1. Confirm an existing semantic token cannot express the requirement;
2. Add it to the canonical token layer;
3. Document its purpose and allowed usage;
4. Add or update the Control Gallery example;
5. Add visual-regression evidence in the implementation PR.

### 4.2 Environment tokens

```css
--lyl-bg-void: #050608;
--lyl-bg-primary: #08090c;
--lyl-bg-content: #0d0f13;
--lyl-bg-content-raised: #12151a;
--lyl-bg-sidebar: rgba(13,15,19,.74);
--lyl-dot: rgba(255,255,255,.035);
```

Rules:

- Use `--lyl-bg-void` for the near-black environmental field.
- Use the low-contrast point grid as environmental texture.
- Use content tokens for long-form text, evidence, reports, and formal conclusions.
- Do not replace the background with large green, blue, or rainbow gradients.

### 4.3 Text tokens

```css
--lyl-text-1: #f3f5f7;
--lyl-text-2: #b8bec7;
--lyl-text-3: #777f8b;
--lyl-text-disabled: #4d535c;
--lyl-text-inverse: #04100a;
```

Use semantic text levels consistently. Do not lower long-form body contrast for decorative effect.

### 4.4 Accent and semantic tokens

```css
--lyl-green-500: #00c66b;
--lyl-green-400: #42e384;
--lyl-green-soft: rgba(66,227,132,.10);
--lyl-blue: #5f9dff;
--lyl-warning: #f5b73f;
--lyl-danger: #ff514b;
--lyl-neutral: #9299a3;
```

Green is restricted to:

- active/running states;
- completed states;
- selected status dots;
- keyboard focus;
- primary CTA;
- a narrow active light strip.

Do not use green for ordinary panel borders, body text, large backgrounds, or decorative gradients.

Every semantic state must use icon/shape + text + color. Color alone is insufficient.

### 4.5 Glass-body and edge-light tokens

```css
--lyl-glass-clear: rgba(255,255,255,.025);
--lyl-glass-thin: rgba(255,255,255,.045);
--lyl-glass-regular: rgba(255,255,255,.065);
--lyl-glass-thick: rgba(255,255,255,.105);
--lyl-glass-border: rgba(235,242,255,.30);
--lyl-glass-border-soft: rgba(235,242,255,.13);
--lyl-glass-inner: rgba(255,255,255,.13);
--lyl-edge-white: rgba(255,255,255,.72);
--lyl-edge-cool: rgba(141,193,255,.24);
--lyl-edge-warm: rgba(255,203,121,.16);
--lyl-edge-green: rgba(0,255,157,.24);
```

A ClauseOS glass surface is not merely `background + backdrop-filter`.

Every important glass surface must visually combine:

```text
transparent glass body
+ soft inner highlight
+ single silver physical rim
+ localized white edge sweep
+ very small cool/warm prism corner refraction
```

Glass usage is allowed for:

- environmental shells;
- navigation;
- controls;
- mode cards;
- command palettes;
- popovers;
- toolbars;
- Interrupt and confirmation overlays.

Glass usage is forbidden for:

- long Agent prose;
- research reports;
- evidence bodies;
- formal conclusion body text;
- long historical source content.

Those must use low-saturation solid content surfaces.

Visual rejection conditions:

- uniform grey translucent card;
- blur-only implementation;
- uniformly glowing perimeter;
- full green outline;
- large rainbow surface;
- strong glass glare behind long text.

### 4.6 Typography tokens

```css
--lyl-font-brand: Urbanist, Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--lyl-font-ui: Inter, "PingFang SC", "Microsoft YaHei", ui-sans-serif, -apple-system, sans-serif;
--lyl-display: 36px;
--lyl-title-xl: 28px;
--lyl-title-lg: 22px;
--lyl-title-md: 18px;
--lyl-title-sm: 16px;
--lyl-body: 14px;
--lyl-body-sm: 13px;
--lyl-caption: 12px;
--lyl-micro: 11px;
```

- Brand names, page titles, and mode titles use the brand stack.
- Body text, data, forms, and conversation content use the UI stack.
- Do not commit unlicensed or unknown-origin font files.

### 4.7 Spacing tokens

```css
--lyl-space-1: 4px;
--lyl-space-2: 8px;
--lyl-space-3: 12px;
--lyl-space-4: 16px;
--lyl-space-5: 20px;
--lyl-space-6: 24px;
--lyl-space-8: 32px;
--lyl-space-12: 48px;
```

Use this spacing scale. A one-off spacing value requires a documented reason.

### 4.8 Radius tokens

```css
--lyl-radius-xs: 6px;
--lyl-radius-sm: 10px;
--lyl-radius-md: 14px;
--lyl-radius-lg: 20px;
--lyl-radius-xl: 24px;
--lyl-radius-pill: 999px;
```

Do not invent component-local radius systems.

### 4.9 Motion tokens

```css
--lyl-dur-fast: 120ms;
--lyl-dur-normal: 160ms;
--lyl-dur-panel: 220ms;
--lyl-dur-layout: 250ms;
--lyl-ease-out: cubic-bezier(.16,1,.3,1);
--lyl-ease-standard: cubic-bezier(.2,.8,.2,1);
```

Rules:

- Hover/press feedback: 120–160ms.
- Panel transitions: 220ms.
- Layout transitions: at most 250ms unless specifically approved.
- Simultaneous decorative animations must be limited.
- Every motion implementation must support `prefers-reduced-motion`.

### 4.10 Desktop layout tokens

```css
--lyl-sidebar-wide: 272px;
--lyl-sidebar-mid: 240px;
--lyl-sidebar-compact: 72px;
--lyl-material-wide: 392px;
--lyl-material-mid: 360px;
--lyl-material-compact: 320px;
--lyl-topbar-height: 64px;
--lyl-composer-min: 76px;
```

V0.1 layout:

| Viewport | Issue navigation | Main issue area | Counsel material |
|---|---:|---|---:|
| `>=1440px` | 272px | `minmax(600px,1fr)` | 392px |
| `1280–1439px` | 240px | `1fr` | 360px |
| `1024–1279px` | 72px | `1fr` | 320px |
| `<1024px` | Desktop-only notice | No mobile implementation | N/A |

Do not add mobile/tablet layouts in V0.1 unless an approved Issue changes the scope.

## 5. Component implementation rules

### 5.1 Reuse before creation

Before creating a component:

1. Search the existing design-system and production component directories;
2. Check `CONTROL-INVENTORY.md`;
3. Reuse or extend an existing primitive;
4. Create a new primitive only when the behavior cannot be expressed by composition.

Business components must not duplicate glass formulas, focus styles, badges, buttons, inputs, popovers, dialogs, or motion CSS.

### 5.2 Required UI primitives

Production components must compose the shared equivalents of:

- `StarGridBackground`
- `AmbientWhiteWash`
- `GlassSurface`
- `GlassThin`
- `GlassRegular`
- `GlassThick`
- `SilverPhysicalEdge`
- `EdgeWhiteSweep`
- `PrismCornerLight`
- `ContentSurface`
- `FocusRing`
- `StatusDot`

### 5.3 Icon baseline

All user-visible icons use Phosphor Icons with the mapping defined in:

```text
design-system/ui-contracts.ts
```

Do not mix Lucide and Phosphor in user-visible product UI. Existing upstream icons may remain only until the owning surface is migrated under an approved Issue.

### 5.4 Required states

Every interactive control must cover, as applicable:

- default;
- hover;
- focus-visible;
- active/pressed;
- disabled;
- selected/checked;
- loading;
- error;
- success.

The required matrix is defined in:

```text
docs/design/controls/CONTROL-STATE-MATRIX.md
```

Do not declare a component complete when only its default state exists.

### 5.5 Accessibility baseline

- Body text contrast must meet WCAG AA.
- All interactive controls must be keyboard operable.
- Use visible `focus-visible` treatment.
- Provide accessible names for icon-only controls.
- State changes use suitable `aria-live` behavior where necessary.
- Do not encode status by color alone.
- Respect reduced motion.

## 6. LYL information architecture and terminology

The desktop shell is always:

```text
IssueNavigator | IssueWorkspace | CounselMaterialPanel
```

The material panel contains exactly these primary tabs unless an approved Issue changes them:

1. 参谋结论
2. 关键证据
3. 历史依据
4. 调研过程

Core issue modes:

- 下一步做什么 (`ask-lyl`)
- 帮我做决定 (`decide-lyl`)
- 调研后判断 (`research-lyl`)
- 诊断历史思维 (`diagnose-lyl`)

Formal counsel output must expose, where applicable:

- current stage;
- main contradiction;
- explicit recommendation;
- confidence;
- change conditions;
- deferred or stopped items;
- evidence and historical basis.

Do not collapse all formal output into Markdown chat bubbles.

## 7. New-feature UI workflow

Any Issue that adds or changes visible UI must include:

1. User scenario and issue state;
2. Existing component reuse analysis;
3. Token impact analysis;
4. New or changed component contracts;
5. State matrix updates;
6. Control Gallery or interactive UCD updates;
7. Accessibility checks;
8. Desktop screenshots at required widths;
9. Regression evidence for Thread, streaming, stop, upload, Interrupt, and Artifact when affected.

Required screenshots for a major UI feature:

- 1440px desktop;
- 1280px desktop;
- 1024px compact desktop;
- hover/focus/disabled/error states as applicable;
- reduced-motion verification where motion changes.

## 8. Design-completeness rule

There are three separate completion states. Do not conflate them:

### 8.1 Design input complete

Means specification, tokens, component inventory, state matrix, contracts, gallery, UCD, and acceptance criteria are available.

### 8.2 Production design system complete

Means typed React primitives and P0 controls are implemented, documented, tested, keyboard-accessible, and visual-regression protected.

### 8.3 Product surface complete

Means the approved issue flows are integrated with real Agent state and pass functionality, accessibility, and visual acceptance.

At present, Issue #20 owns the transition from design-input-complete to production-design-system and product-surface completion. Do not claim the latter states before its acceptance criteria pass.

## 9. Coding and PR requirements

- Use semantic tokens; no arbitrary raw design values in business components.
- Keep design primitives centralized.
- Do not rewrite backend or LangGraph protocols for a visual task.
- Avoid unrelated refactors and formatting churn.
- Add tests for changed interaction behavior.
- Add visual evidence to the PR.
- List intentional deviations from this file. No silent deviations.
- If an approved requirement cannot be met, stop and request a product decision before weakening acceptance criteria.

## 10. Primary references

- `docs/design/reference/ClauseOS-UI-UX-Design-Spec-V2.0.md`
- `docs/design/LYL-ClauseOS-Desktop-UI-Implementation-Spec-V2.0.md`
- `docs/design/controls/CONTROL-INVENTORY.md`
- `docs/design/controls/CONTROL-STATE-MATRIX.md`
- `design-system/lyl-clauseos-ui.css`
- `design-system/ui-contracts.ts`
- `design-system/control-gallery.html`
- `docs/design/ucd/lyl-interactive-ucd.html`
- GitHub Issue #20
