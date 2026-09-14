# Sklop roadmap

Sklop is an AI-native React component library, published on npm as `@sklop/react` and
ejectable with `@sklop/cli`. Thirty-three components for interfaces where an agent plans,
acts, asks and explains. Every component is themable from CSS custom properties, animated
with a motion system the user can turn down or off, accessible by construction, and
documented in a live hub with a theme studio.

This file is the only roadmap. Phase status lines are edited here and nowhere else.

## How we work

| Denis decides | Claude builds |
| --- | --- |
| Visual language, component anatomy, states, copy, priorities, what ships in a release | Architecture, tokens, CSS, behaviour, accessibility, tests, hub, release pipeline |
| Reviews each phase live in the hub and signs off | Flags cost and risk before starting, never silently narrows scope |

Each phase ends with a **review gate**: the phase is live on a branch, Denis reviews the
real components in the browser, and nothing moves forward until he signs off.

Effort is a relative band (S, M, L, XL), never a date. Every component phase publishes a
`0.x` minor, so the library is usable long before `1.0`. `1.0.0` follows the audit phase.

Each phase carries a **Status** line: `Not started`, `In progress`, `Partly done`, or
`Done` with the date and the release it produced.

## Settled decisions

Recorded so they are not re-argued later.

| Area | Decision | Why |
| --- | --- | --- |
| CSS shipping | Pre-compiled CSS with stable, readable class names (`sk-Message-bubble`) in `@sklop/react/styles.css`. Ejected copies are raw `.module.css`. | Next.js refuses to compile CSS Modules from `node_modules`. Stable selectors also give consumers a way in. |
| Layers | `@layer sklop.tokens, sklop.components`. | Consumer styles win without a specificity fight. |
| Tokens | A separate `@sklop/tokens` package: DTCG JSON source with Figma provenance, generated `tokens.css` and `tokens.json`, guards in the build. | One source of truth that both the CSS and the hub can read. |
| Theming | CSS custom properties only. A typed `Theme` is a flat map of variable names to values, never a nested object. Presets are JSON override maps. | Works from plain CSS, from JavaScript, and from a URL. |
| Default theme | The canonical Sklop theme is the default: coral accent and violet-grey neutrals from the Figma sample. Presets, starting with neutral, are override maps on top of it. | Sklop presents with its own identity, and the neutral preset proves rebranding works. |
| Motion | CSS-first: tokens, transitions, `@starting-style`, `linear()` springs, View Transitions. An optional `@sklop/react/motion` subpath wraps the `motion` library only for gesture, layout and reorder animation. | Rich motion for most components at zero dependency cost; the expensive engine only where it earns its weight. |
| Foundations | Button, IconButton, Tooltip, Popover, Menu, Avatar, Badge, Field and ScrollArea are public exports, documented as a Foundations section. | Adopters get one coherent set. Accepting a consumer's own Button through slots can be added later. |
| Icons | Components accept icons as props. Built-in glyphs (dismiss, send, chevron) are a handful of inline SVGs. The hub uses lucide for its own chrome. | No ongoing icon design work, and no icon set to keep current. |
| Accessibility engine | Hybrid. In-house hooks for the presentational majority. A headless engine for the hard patterns only (Composer autocomplete, Selector listbox, Data Grid, Action Card dialog, Inspector fields), chosen by a spike in Phase 3. | Most components need good semantics, not a state machine. |
| Rich text | Core accepts a render prop. `@sklop/react/markdown` and `@sklop/react/highlight` ship defaults as optional subpaths. | Syntax highlighting alone is over a megabyte. Nobody pays unless they ask. |
| Framework | Next.js App Router first-class: correct `'use client'` boundaries, SSR-safe modules, a Next example app in CI. | A broken first install costs real adopters. |
| Hub | Custom Vite and React app in `apps/hub`. No Storybook. | Page-wide live theming does not fit Storybook's iframe model, and the hub is the public face of the library. |
| Distribution | npm first, plus the eject registry (`sklop add message`). | The registry serves people who want to own the source, and its format is what makes agent installation work. |
| Releases | One `0.x` minor per component phase, changesets-driven. | Adopters get value early. |

## Theming contract

**Six axes**, all switchable at runtime, all driven from the token layer, all exposed in the
hub:

1. Colour theme (light, dark, any number of presets)
2. Density (compact, default, comfortable, spacious)
3. Font scale (small to extra large)
4. Radius scale (sharp, default, soft, round)
5. Motion level (full, reduced, off) plus a personality preset
6. Direction (LTR, RTL)

`SklopProvider` sets them as `data-sk-*` attributes, all together on one element, and ships a
no-flash head script.
`color-scheme` is declared with the theme so scrollbars and form controls follow it.

**Three tiers.** Components never reach past their own tier.

| Tier | Who touches it | Example |
| --- | --- | --- |
| Primitive | Nobody. Never used in a component, never overridden by a consumer. | `--sk-color-neutral-700` |
| Semantic | The public theming contract. Small enough to read in one screen. | `--sk-color-bg-raised`, `--sk-color-text-secondary` |
| Component | Generated from each component's manifest. For changing one component without touching the theme. | `--sk-message-bubble-bg-agent` |

**Every `var()` chain ends in a literal.** A missing or misspelled token renders the
intended value, never nothing.

**Three escape hatches**, in order of preference: override tokens; pass a `classNames`
slot map for a one-off; target the stable class names and the `data-sk-part` and
`data-sk-state` attributes every part carries.

**Guards in the build:** name grammar, no physical direction in a token name, WCAG AA
contrast for every documented pair, and a drift check that fails when the committed CSS
does not match the source.

## Motion contract

Motion is a token system, not a collection of one-off animations.

**Four tiers.** Primitives (durations, easings, `linear()` springs). Composite transitions
(`--sk-motion-transition-hover`, `-focus`, `-base`), so a component writes one declaration
and every interactive surface animates the same way. Role and choreography (enter, exit,
press scale, stagger, and the AI-specific stream cadence, think pulse, shimmer and
indeterminate cycle). Component tokens that default to their role token.

**Level and personality.** `prefers-reduced-motion` is the default. The provider can
force `full`, `reduced` or `off`; `useMotion()` exposes the level to JavaScript-driven
animation. Reduced drops travel and scale but keeps opacity and colour, so state changes
stay visible. Off is instant. A personality preset (crisp, soft, playful) is a token
override map that changes durations, easings and travel together.

**Substitute, never delete, animation that carries meaning.** A spinner does not freeze
under reduced motion; it swaps rotation for an opacity pulse.

**Craft rules, checked at every review gate.** Every animation answers why it animates.
Motion matches frequency: keyboard-driven and constant actions get none. Entrances use
ease-out or a custom curve, never ease-in. UI motion stays under 300 ms. Only `transform`
and `opacity` animate. Popovers scale from their trigger, never from `scale(0)`.
Rapidly triggered motion is interruptible. Press is slower than release. Hover motion is
gated behind `(hover: hover)`. The hub's motion inspector replays any animation in slow
motion so these can be seen, not guessed.

## The hub

`apps/hub` is a Vite and React app. It is the review surface for every phase, the public
documentation, and the theme studio.

**It has its own kit.** Hub chrome uses a `--hub-*` token namespace and components under
`apps/hub/src/kit/` that are never published. This is not tidiness: editing a Sklop token
in the studio must restyle the preview and nothing else, so the chrome cannot be built
from the library it documents.

| Hub-only component | Purpose |
| --- | --- |
| AppShell, SideNav, TopBar, Tabs, SplitPane | Layout and navigation |
| CommandSearch | Find any component, token or page |
| PreviewFrame | Theme-scoped preview with axis toolbar, background, zoom, resize |
| PreviewErrorBoundary | A crashing preview never takes the hub down |
| Toast | Feedback for copy, export, errors |
| TokenEditor | Every token by tier and category, live edit, filter to the current component, reset, diff |
| ContrastChecker | AA and AAA for every documented pair |
| ExportDialog | CSS, DTCG JSON or Tailwind theme |
| PreviewThemeBanner | Shows an agent-suggested theme arriving by URL, with Copy CSS and Discard |
| ControlsPanel, PropsTable | Props playground generated from TypeScript types |
| CodePanel | Copyable usage, omitting props equal to their defaults |
| StateMatrix | Every variant, size and state on one page |
| KeyboardMap, A11yPanel | Keyboard contract and live axe results |
| InspectOverlay | Click any element to see its matched rules and the resolved `var()` chain |
| MotionInspector | Slow-motion scrubber and replay |
| ChangelogView | Release history from changesets |
| Callout, StatusPill | Documentation furniture |

**Docs are generated.** Each component folder carries a manifest (declared tokens and
parts), a demos file and a docs file. The hub discovers components by glob, so an unbuilt
component still appears in navigation showing its spec and lights up when implemented.
The same build emits a machine-readable catalog and `llms.txt`.

**Themes travel by URL.** Every axis and every token override serialises to the URL, so a
theme is a shareable link. A size-capped, sanitised `overrides` parameter lets a coding
agent push a proposed theme into a live preview.

## Phases

### Phase 0: Rig `S`

**Status.** In progress.

**Goal.** Everything that makes later phases fast, in place before any component exists.

**Done already.** pnpm workspace with `@sklop/react` and `@sklop/cli`. Vite library build
emitting stable class names. Registry generator and the eject CLI. Biome, Vitest,
Changesets, CI running `pnpm check`, trusted publishing.

**Claude builds.** `apps/*` in the workspace. A lint rule or check script for logical
properties and for raw hex, px and ms in component CSS. axe in Vitest. A Playwright
visual-regression harness. A Next.js App Router example app rendered in CI. A check that
every component folder has a manifest and appears in the registry. The `./styles.css`
export returns with the first component.

**Exit.** A PR that breaks a rule goes red. The Next example renders a hello-world export.

### Phase 1: Theme engine `L`

**Status.** In progress.

**Goal.** The full token system with all six axes, generated and guarded.

**Claude builds.** `@sklop/tokens`: DTCG source with primitive and semantic tiers, Figma
provenance on every token, a ramp generator, contrast tests, and a build that emits
`tokens.css` and `tokens.json`. Then: the dark theme with `color-scheme`; density, font
scale, radius, motion level and direction as override maps; the component tier generated
from manifests; the motion token pyramid including personality presets; `SklopProvider`
with the no-flash script; the typed `Theme` map and preset JSON; the four guards.

**Denis decides.** The palette, the type scale, the spacing scale, which density steps
exist, and the motion personality: how fast, how bouncy, how much travel.

**Exit.** A single page renders every token. Switching any axis changes it live.
Contrast passes AA everywhere. The drift check is green.

### Phase 2: Hub shell and theme studio `L`

**Status.** Not started.

**Goal.** The surface Denis reviews every later phase in.

**Claude builds.** The hub app and the first half of the kit: AppShell, SideNav, TopBar,
CommandSearch, Tabs, SplitPane, the PreviewFrame skeleton with its axis toolbar,
PreviewErrorBoundary, Toast, TokenEditor, ContrastChecker, ExportDialog,
PreviewThemeBanner and ChangelogView. URL-synced axes. The docs generator's first version:
catalog JSON, `llms.txt`, token catalog. Reviewed against the token page and the presets.

**Denis decides.** Hub design, information architecture, and the landing page.

**Exit.** Deployed. Editing a token in the browser rebrands the whole page. A theme
exports and drops into the Next example app.

### Phase 3: Foundations and playground `XL`

**Status.** Not started.

**Goal.** The parts the thirty-three components are built from, and the playground that
shows them.

**Claude builds.** Hooks: `useFocusTrap`, `useDismiss`, `useAnchoredPosition`,
`useScrollLock`, `useControllableState`, `Portal`, `VisuallyHidden`. The Foundations:
Button, IconButton, Tooltip, Popover, Menu, Avatar, Badge, Field, ScrollArea, each to the
full definition of done, with the label-in-its-own-box anatomy so icon and text sit at
different insets. A spike that picks the headless engine for the hard patterns. The
second half of the hub kit, built against real components: ControlsPanel, PropsTable,
CodePanel, StateMatrix, KeyboardMap, A11yPanel, InspectOverlay, MotionInspector, and
per-component docs pages from manifest, types and demos.

**Denis decides.** The visual design of the Foundations. The motion personality, seen
for the first time on Tooltip, Popover and Menu.

**Exit.** Every Foundation passes the definition of done. A motion review of Tooltip,
Popover and Menu against the craft rules passes before sign-off.

### Phase 4: State vocabulary `M` → `0.1.0`

**Status.** Not started.

01 Async State · 10 Status · 11 Progress · 13 Alert

**Goal.** The state and feedback primitives every other component uses, and the first
installable release.

**Claude builds.** Loading, streaming, empty, waiting and processing states. The seven
states (queued, running, waiting, completed, blocked, cancelled, failed) as one type that
the data model reuses. Determinate, indeterminate, step and elapsed-time progress.
Information, warning, validation, policy and error messages. This is where shimmer, pulse
and fill microinteractions are set for the whole library.

**Denis decides.** The status vocabulary made visual, including how each state reads
without colour. What "waiting" looks like versus "stuck".

**Exit.** `0.1.0` published. Four components prove the whole pipeline: tokens, motion at
three levels, hub page, docs, registry, eject.

### Phase 5: Streaming core `L` → `0.1.x`

**Status.** Not started.

**Goal.** The hard problems of AI interfaces, solved once, before any component depends
on them. Streaming, scroll behaviour and live-region etiquette are where AI interfaces
fail, and they cannot be retrofitted into Message later.

**Claude builds.** `useStream`: incremental text at a cadence the design controls, not
whatever the network delivers. Mid-stream markdown repair, so unclosed fences and
dangling emphasis never flicker. A stick-to-bottom scroller that follows new content,
releases the moment the user scrolls up, and offers "jump to latest". A chunked
live-region announcer, so a screen reader hears meaningful chunks rather than every token.
List virtualisation. The canonical data model: message, part, tool call, trace event,
status, source, artifact. Adapters from the Vercel AI SDK, Anthropic and OpenAI stream
shapes onto that model. The markdown and highlight subpaths.

**Denis decides.** The streaming feel: cadence, per-token or per-word fade, cursor
behaviour, what "thinking" looks like before the first token.

**Exit.** A harness page in the hub streams a real response with broken markdown and
renders it cleanly throughout. A screen reader follows the same stream without being
flooded. Ten thousand messages scroll at 60 fps.

### Phase 6: Conversation core `XL` → `0.2.0`

**Status.** Not started.

02 Message · 03 Composer · 04 Suggestion · 05 Attachment · 21 Code Block · 28 Selector ·
33 Conversation

**Goal.** The surface every AI product builds first, and the first release someone else
can build a product on.

**Claude builds.** User, agent, system and tool messages with full part rendering.
A composer with text, slash commands, mentions, dictation and model selection; the send
control becomes Stop while generating, so interrupting is always one action. Prompts,
follow-ups and recommended actions. Files, images, audio, video and generated media.
Streaming code with line numbers, terminal output, logs, schemas and stack traces. The
selector for models, agents, tools, personas and output formats. The thread list with
switching, history, rename and delete.

**Denis decides.** The entire visual language of a conversation. Bubble or no bubble. How
a tool message differs from an agent message. Composer anatomy. What an attachment looks
like while it uploads and after it fails.

**Exit.** `0.2.0` published. A working chat app in the hub built only from Sklop. Full
keyboard and screen reader pass on the composer.

### Phase 7: Agent run surface `L` → `0.3.0`

**Status.** Not started.

06 Activity Trace · 07 Process List · 09 Tool Call · 12 Timeline · 18 Diff · 30 Usage Meter

**Goal.** Everything that shows what the agent is doing.

**Claude builds.** Searches, reasoning summaries and tool activity. Plans, tasks, queues,
dependencies and execution steps. Tool name, arguments, status, result and error, with
every call inspectable. Runs, tool events, handoffs and audit history. Text, code, data,
configuration and interface diffs, here because tool results are often diffs and
Checkpoint needs them next. Tokens, context, cost, latency, time and limits.

**Denis decides.** Trace density: how much detail by default, what collapses. How a
long-running step communicates patience rather than being stuck. Diff presentation and
how it degrades on a narrow screen.

**Exit.** `0.3.0` published. Status is never carried by colour alone. Live regions
announce state changes without flooding. Diffs read without red and green.

### Phase 8: Control, recovery and feedback `M` → `0.4.0`

**Status.** Not started.

08 Action Card · 14 Recovery · 29 Checkpoint · 32 Feedback

**Goal.** The human-in-the-loop surface: approving, correcting, undoing.

**Claude builds.** Questions, approvals, permissions, recommendations and decisions, with
approval scaled to risk: read-only actions run, reversible writes run with visible undo,
irreversible or costly actions ask first. Retry, edit, skip, resume, roll back and
fallback. Save, restore, branch, compare and version states. Ratings, corrections,
reports and "why this answer".

**Denis decides.** How an approval reads as consequential without being alarming. Error
copy voice. What a destructive confirmation looks like. How a checkpoint timeline reads.

**Exit.** `0.4.0` published. A trust-and-control review of the hub's chat app (intent
echo, plan preview, approval scaled to risk, live state, tool transparency, honest
uncertainty, interruptibility, reversibility, error recovery) returns no high finding.

### Phase 9: Knowledge, artifacts and generated UI `L` → `0.5.0`

**Status.** Not started.

15 Context · 16 Source · 17 Artifact · 31 Generated UI Boundary

**Goal.** Everything the agent knows, cites or produces, and the boundary that keeps
model-authored interfaces safe.

**Claude builds.** Retrieved knowledge, memory, instructions and active data, visible and
editable. Citations, provenance, evidence and source previews. Documents, code, images,
media and generated interfaces. Validated, mounted, replaced, blocked and fallback
interfaces, with a sanitisation and allowlist model.

Component 31 renders interfaces the model wrote, which is an injection surface. Its
threat model (what markup is allowed, what is stripped, what happens on validation
failure, how a blocked interface is shown) is designed and reviewed before it is built.

**Denis decides.** How a citation reads inline versus in a panel. Artifact chrome. What a
blocked interface looks like.

**Exit.** `0.5.0` published. The sanitiser has a documented threat model and a test suite
of hostile payloads.

### Phase 10: Data and insight `XL` → `0.6.0`

**Status.** Not started.

19 Data Grid · 20 Insight

**Goal.** The two hardest components in the set.

**Claude builds.** Records, filtering, editing, calculations and agent-proposed changes,
with full keyboard navigation and virtualisation. Metrics, trends, forecasts, anomalies
and recommendations, with charts inside the token system.

**Denis decides.** Grid density and editing affordances. How a proposed change reads as
pending rather than applied. Chart style.

**Exit.** `0.6.0` published. The grid is fully keyboard operable and announces cell
context correctly. Fifty thousand rows scroll smoothly.

### Phase 11: Canvas and flow `XL` → `0.7.0`

**Status.** Not started.

22 Canvas · 23 Node · 24 Port · 25 Edge · 26 Group · 27 Inspector

**Goal.** The most distinctive part of the library.

**Claude builds.** Pan, zoom, selection, layout and navigation. Trigger, agent, model,
tool, condition, data and output node variants. Typed inputs and outputs. Data, control,
conditional and error connections. Groups, subflows, loops and agent teams. Node,
artifact, model and generated-interface properties. The motion adapter earns its place
here: drag, reorder and layout animation.

**Denis decides.** The node visual system and how types are distinguished. Edge routing
style. Canvas background and depth cues.

**Exit.** `0.7.0` published. The canvas is fully operable by keyboard, which almost no
node editor manages.

### Phase 12: Agent distribution `M` → `0.8.0`

**Status.** Not started.

**Goal.** Make Sklop installable and usable by coding agents, which is what AI native
should mean in both directions.

**Claude builds.** `llms.txt` and a full-text variant. Machine-readable component and
token catalogs carrying the field aliases below. Per-component usage recipes written for
an agent. An MCP server or skill so Claude Code and Cursor can search components, read
token contracts, generate correct usage, and push a proposed theme into the hub preview.
The eject registry polished so `sklop add message` drops source and CSS into a consumer's
repo.

**Denis decides.** What the recipes emphasise, and whether the registry ships every
component or a subset.

**Exit.** `0.8.0` published. An agent that has never seen Sklop builds a working chat
interface from the catalog alone.

### Phase 13: Hardening and 1.0 `L` → `1.0.0`

**Status.** Not started.

**Goal.** Earn the version number.

**Claude builds.** A full accessibility audit with real screen readers (NVDA, VoiceOver,
JAWS). A full RTL audit in Arabic and Hebrew. Pseudo-localisation for text expansion.
A motion audit of every component at all three levels against the craft rules. A
trust-and-control audit of every agent surface. Visual regression baselines across every
component, theme and direction. Bundle size budgets enforced per component. SSR and RSC
verification. Performance profiling of streaming and virtualisation. Migration and
deprecation policy. Complete documentation.

**Denis decides.** Launch, positioning, and what is deliberately left out of 1.0.

**Exit.** `1.0.0` published.

## Component coverage

Every component appears in exactly one phase. Numbering matches the source list.

| No | Component | Scope | Phase | Size | Accessibility pattern |
| --- | --- | --- | --- | --- | --- |
| 01 | Async State | Loading, streaming, empty, waiting, processing | 4 | S | Live region |
| 02 | Message | User, agent, system, tool | 6 | L | Semantics, live region |
| 03 | Composer | Text, commands, mentions, dictation, model selection | 6 | XL | Combobox, toolbar |
| 04 | Suggestion | Prompts, follow-ups, next actions | 6 | S | Semantics |
| 05 | Attachment | Files, images, audio, video, generated media | 6 | M | Semantics |
| 06 | Activity Trace | Searches, reasoning summaries, tool activity, progress | 7 | M | Disclosure, live region |
| 07 | Process List | Plans, tasks, queues, dependencies, steps | 7 | M | Tree, live region |
| 08 | Action Card | Questions, approvals, permissions, recommendations, decisions | 8 | M | Dialog |
| 09 | Tool Call | Name, arguments, status, result, error | 7 | M | Disclosure |
| 10 | Status | Queued, running, waiting, completed, blocked, cancelled, failed | 4 | S | Live region |
| 11 | Progress | Determinate, indeterminate, step, elapsed time | 4 | S | Live region |
| 12 | Timeline | Runs, tool events, handoffs, audit history | 7 | M | Semantics |
| 13 | Alert | Information, warning, validation, policy, error | 4 | S | Alert role |
| 14 | Recovery | Retry, edit, skip, resume, roll back, fallback | 8 | M | Semantics |
| 15 | Context | Retrieved knowledge, memory, instructions, active data | 9 | M | Disclosure |
| 16 | Source | Citations, provenance, evidence, previews | 9 | M | Semantics, popover |
| 17 | Artifact | Documents, code, images, media, generated interfaces | 9 | L | Semantics |
| 18 | Diff | Text, code, data, configuration, interface changes | 7 | L | Semantics |
| 19 | Data Grid | Records, filtering, editing, calculations, proposed changes | 10 | XL | Grid, virtualised |
| 20 | Insight | Metrics, trends, forecasts, anomalies, recommendations | 10 | L | Semantics |
| 21 | Code Block | Code, terminal output, logs, schemas, stack traces | 6 | M | Semantics |
| 22 | Canvas | Pan, zoom, selection, layout, navigation | 11 | XL | Custom keyboard model |
| 23 | Node | Trigger, agent, model, tool, condition, data, output | 11 | M | Custom keyboard model |
| 24 | Port | Typed inputs and outputs | 11 | S | Custom keyboard model |
| 25 | Edge | Data, control, conditional, error connections | 11 | M | Custom keyboard model |
| 26 | Group | Node groups, subflows, loops, agent teams | 11 | M | Custom keyboard model |
| 27 | Inspector | Node, artifact, model, generated-interface properties | 11 | M | Form semantics |
| 28 | Selector | Models, agents, tools, personas, output formats | 6 | M | Listbox |
| 29 | Checkpoint | Save, restore, branch, compare, versions | 8 | M | Semantics |
| 30 | Usage Meter | Tokens, context, cost, latency, time, limits | 7 | S | Live region |
| 31 | Generated UI Boundary | Validated, mounted, replaced, blocked, fallback | 9 | M | Semantics |
| 32 | Feedback | Ratings, corrections, reports, why this answer | 8 | S | Radio group |
| 33 | Conversation | Thread list, switching, history, rename, delete | 6 | M | Listbox, menu |

Per phase: 4 · 7 · 6 · 4 · 4 · 2 · 6 = 33.

### Field aliases

The field has converged on a small vocabulary. Sklop's names are broader on purpose; the
field's words are recorded so a search finds the right component, and Phase 12 carries
them into the catalogs.

| The field says | Sklop calls it |
| --- | --- |
| Reasoning, Thinking, Chain of Thought | Activity Trace |
| Approval, Confirmation, Tool Approval | Action Card |
| Prompt Input, Prompt Bar | Composer |
| Citation, Inline Citation, Evidence Panel | Source |
| Queue, Plan, Task, Todo List | Process List |
| Thread List, Conversation History | Conversation |
| Loader, Shimmer | Async State |
| Panel, Web Preview, Sandbox | Artifact |
| Branch, Time Travel | Checkpoint |
| Terminal, Stack Trace, Snippet | Code Block |
| Model Selector, Autonomy Dial | Selector |

### Considered and left out

- **Voice.** Mic state, agent-state visualisers, live transcript, speech output. A whole
  modality rather than a component; dictation inside Composer covers what a text-first
  product needs.
- **Agent or Persona card.** Split across Selector, Context and Group today; multi-agent
  interfaces are not settled enough to name a component after.

## Definition of done, per component

The same list every time, which is what makes thirty-three components feel like one
library.

- [ ] Every variant, size and state present in the demo matrix
- [ ] Controlled and uncontrolled paths where the component holds state
- [ ] Full keyboard contract per the ARIA Authoring Practices, direction-aware
- [ ] `forwardRef`, a `classNames` slot map, `data-sk-part` and `data-sk-state` on every part
- [ ] axe clean, plus a manual screen reader pass on the hard ones
- [ ] RTL snapshot under `dir="rtl"`, zero physical CSS properties, zero physical token names
- [ ] Contrast passes AA for every documented pair
- [ ] No raw hex, px or ms in CSS; every `var()` ends in a literal fallback
- [ ] Motion verified at full, reduced and off, and reviewed against the craft rules
- [ ] `forced-colors` block where colour carries meaning
- [ ] SSR-safe, correct `'use client'` boundary, renders in the Next example app in CI
- [ ] Bundle size within budget
- [ ] Visual regression baseline captured
- [ ] Manifest declares every token and part the component uses
- [ ] Docs page with props table, live playground, keyboard map and copyable code
- [ ] An agent-facing usage recipe
- [ ] A changeset

## Bidirectional and language support

Not a phase, a constraint on every phase.

- Logical properties in CSS and in token names. `padding-inline-start`, never
  `padding-left`. Enforced by lint and by the token grammar guard.
- Direction-aware keyboard handling. Arrow keys follow reading direction.
- `Intl` throughout for dates, numbers, lists and relative time.
- Every user-visible string overridable through the provider and per-component props.
  English ships as the only default.
- `lang` and `<bdi>` around mixed-direction content: model names, file paths, code.
- No fixed widths on text. A pseudo-localisation check in the hub proves it.
- Out of scope for 1.0: vertical writing modes.

## Open questions for Denis

| Question | Why it matters | Needed by |
| --- | --- | --- |
| Hub hosting: GitHub Pages on a custom domain, or Vercel? | Deploy pipeline, and whether server-side features are possible later. | Phase 2 |
| Is the hub public from Phase 2, or only from `0.2.0`? | Whether early phases are reviewed on a public URL. | Phase 2 |
| Publish `@sklop/tokens` separately, or bundle it into `@sklop/react`? | A separate package needs its own trusted publisher on npm. | Phase 4 |
| Which SDK adapter ships first? | Decides which example app is written first. | Phase 5 |
| Should Sklop components accept a consumer's own Button and Icon through slots? | Decides whether adoption is all-or-nothing for teams already on another library. | Phase 6 |
| Is RTL a `1.0` requirement or a `1.x` follow-up? | Changes the Phase 13 audit scope. | Phase 13 |

## Risks

| Risk | Mitigation |
| --- | --- |
| Thirty-three components is a large surface for a small team. Phases 10 and 11 alone are as much work as everything before Phase 6. | Every phase from 4 onward publishes a usable release. Stopping after any phase still leaves something real. |
| The hub is a product in its own right and could consume the schedule. | It is built on generators, so adding a component adds a page automatically. The kit is split so the second half is built against real components rather than guessed. |
| The token surface could grow past the point where a consumer can reason about it. | The semantic tier stays small. Component tokens are generated and discoverable in the studio rather than memorised. |
| Motion drifts across thirty-three components, each animation working alone and the set feeling inconsistent. | Composite transition tokens make the default the same everywhere. A motion review gate after the Foundations, and a full audit before `1.0`. |
| Accessibility work that is deferred is never done. | It is in the definition of done and CI fails without it. |
| The AI SDK landscape moves fast and adapters go stale. | Adapters are a thin, separately versioned subpath. The canonical model does not change when a vendor's shape does. |
| Generated UI is an injection surface. | Component 31 gets a threat model and a hostile-payload suite before it gets a visual design. |
