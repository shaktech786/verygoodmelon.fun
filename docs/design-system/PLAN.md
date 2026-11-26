# Seedpress: a new design system for VeryGoodMelon.Fun

**Status:** plan only. No app code has changed.
**Scope:** the site shell, the chrome of all 14 games, keepsakes, and how game art is brought into line.
**Sources:** keys in square brackets, such as [COGA], point to entries in [RESEARCH.md](./RESEARCH.md).
**Contrast figures:** every ratio in §5 was computed with a WCAG 2.x relative-luminance script, not estimated.

---

## 1. Diagnosis: why the current UI reads as corporate

The site's words and games are unusually thoughtful, but its chrome is a SaaS starter kit in a watermelon hat. These are the specific causes, drawn from the code.

### 1.1 The homepage, as the code draws it

**At 390 px:**
- **Header** (`components/ui/Header.tsx`):
  - A 40×24 pixel-art PNG logo (`public/logo.png`, **212 KB**) beside "VeryGoodMelon.Fun" in 18 px Quicksand.
  - On the right, a "Games" text link and a lucide `Settings` gear.
  - The whole bar is sticky, with `bg-background/80 backdrop-blur-sm` and a hairline bottom border.
- **Hero** (`app/page.tsx`): a centred `font-light` 24 px headline, "Small, quiet games for a busy mind…", with one word in green. It fades and slides up 16 px, 0 ms after mount.
- **Today's pick** (`components/home/TodaysPick.tsx`):
  - A white `rounded-3xl` card with a `soft-shadow`.
  - A tilted 76×114 thumbnail sits on a tinted "second card".
  - Text: an uppercase tracked "TODAY'S PICK" eyebrow with a dot, a 24 px title and a reason line.
  - Action: a red `rounded-full` "Play →" pill.
  - It fades in 150 ms later.
- **Mood doors** (`components/home/MoodDoors.tsx`): "Or start from how you feel", then three equal white `rounded-2xl` tiles, each with an 11×11 pixel glyph and a word. They fade in 300 ms later.
- **Every game** (`components/games/GameDirectory.tsx` → `GameCardShowcase.tsx`):
  - An uppercase tracked "EVERY GAME" label, then **14 identical white `rounded-2xl` rows**, one column on phones and two from `sm`.
  - Each row has a 56×84 thumbnail, a bold title and a grey hook line.
  - On hover the shadow grows and the title turns red.
  - The list fades in 450 ms after load, so a visitor waits almost half a second to see the games.
- **Footer** (`components/ui/Footer.tsx`): centred grey 12–14 px links ("Need to talk?", Privacy, Terms, Feedback, Thoughts, About, GitHub) and a copyright line.
- **Behind everything** (`components/ui/AmbientParticles.tsx`): a full-viewport canvas "constellation" runs a `requestAnimationFrame` loop on every page. Its lines reach towards the mouse pointer.

**At 1440 px:**
- The same column, capped at `max-w-2xl` (672 px) and centred, so about 770 px of the width is empty grey `#fafafa`.
- The header spans `max-w-7xl` and the footer `max-w-6xl`, so the page's three bands have three different edges.

**In dark mode:** the same layout in neutral greys `#1a1a1a` and `#2a2a2a`. The red accent turns into a light salmon `#ff6b7a`, and global `!important` overrides repaint any `bg-white` or `text-gray-*` they catch (`app/globals.css` lines 70–184).

### 1.2 The corporate tells

| Tell | Evidence in code | Why it reads as corporate |
|---|---|---|
| Neutral greys and a palette lifted from Tailwind's defaults | `--background #fafafa` and `--foreground #1a1a1a`. The "extended game palette" in `app/globals.css` lines 20–27 is Tailwind's own `violet-500 #8b5cf6`, `blue-500 #3b82f6`, `orange-500 #f97316`, `pink-500 #ec4899`, `teal-500 #14b8a6` and `indigo-500 #6366f1`. | These are the colours of most dashboards built since 2020. OKLCH chroma reaches about 0.24 for pink-500. |
| One radius for everything | `rounded-lg` appears 164 times, `rounded-full` 71 times. | It is the default shape of every component kit. |
| Blurred drop shadows as the only edge | The card border `#e8e8e8` on `#fafafa` is **1.17:1**, and **1.68:1** in dark. Cards are defined only by `soft-shadow`. | This is the "floating white card" look. It also fails WCAG 1.4.11 wherever the edge is the only sign of a control. |
| Uppercase tracked micro-labels | `text-sm font-semibold uppercase tracking-wider` appears in 12 files ("EVERY GAME", "TODAY'S PICK", section heads in settings). | A SaaS eyebrow label. It is also block capitals, which the BDA and Home Office advise against [BDA][HO]. |
| A stock icon set | 70 distinct `lucide-react` icons across 31 files. | The most recognisable SaaS icon set there is. |
| A component API copied from shadcn | `Button` has `primary`/`secondary`/`ghost`/`danger` variants in `sm`/`md`/`lg`; `Badge`, `Modal`, `Toast` and `Card` follow the same pattern. | It is generic by construction. Most of it is also **dead code**: `Card`, `Modal`, `Input`, `Badge`, `Toast`, `EmptyState`, `ErrorState`, `LoadingSpinner`, `WatermelonLoader`, `Watermelon`, `PageTransition`, `PointsDisplay` (itself a counter), `CharityTracker`, `OrganicBlob` and `Divider` are imported by **no page**, only by tests. `ToastContainer` is mounted, but nothing ever calls `addToast`. |
| A marketing-hero homepage | A centred light headline, a featured card with a pill CTA and an arrow, then a uniform list. | It is the shape of a landing page, not of a toy shop. |
| Identical rows for 14 different games | `GameList` renders the same row for a breathing guide and for a deckbuilder. | Scannable but anonymous. The games' character never reaches the shelf. |
| Card art that fights its size | Each `public/games/*/card.svg` is a 1024×1792 slab with the title set in **112 px system-ui weight 800 capitals**, shown at 56×84. | The title shrinks to about 6 px of illegible capitals that repeat the heading next to it. Every card is a different flat colour slab, so the 14 do not belong together. |
| Quicksand through `next/font/google` | `app/layout.tsx` lines 16–21, five weights, with `font-light` headings. | A friendly but ubiquitous rounded face. Light weights lose contrast. |
| Ten copies of the same game header | The same `text-center … text-2xl sm:text-3xl md:text-4xl` `h1` and `text-foreground/70` subtitle block is pasted into 10 `app/games/*/page.tsx` files. | Nothing owns the game page template, so each one drifts. |
| Decoration nobody chose | About 15 global classes in `app/globals.css` are never used: `.card-organic` (150 lines of "burnt paper" clip-paths), `.cursor-melon`, `.pull-quote`, `.loading-dot`, `.typing-dot`, `.seed-scatter`, `.accordion-content` and more. The file is **1,421 lines**. | The real system is hidden under abandoned experiments. Anyone extending it copies what is nearest, which is usually a Tailwind default. |

### 1.3 Where it already gets things right (keep these)

- **The red rule**, enforced by `scripts/check-red-states.mjs`: red is never a state. This becomes the "flesh is for go" rule in §10.2.
- **No counters**, enforced by `__tests__/lib/no-counters.test.ts`, which parses every string a player can read.
- **Keepsakes** are planned as data (`lib/keepsake/plan.ts`) and contrast-tested on the surface beneath every glyph (`__tests__/lib/keepsake/contrast.test.ts`). This pattern becomes the model for testing tokens.
- **The pixel heritage:** the logo, the `MoodGlyph` ASCII-row SVGs (`components/home/MoodDoors.tsx`), the keepsakes' coarse 6-unit grid and The Shapeshifter's retro canvas. It is the most original visual idea on the site, and the new icon set is built from it.
- **Sub-token layers per game.** The Philosopher derives `--tp-*` tokens from site tokens (`app/games/thought-pockets/components/ThoughtPockets.tsx` lines 24–45). The Shapeshifter resolves site tokens for its canvas (`app/games/the-mutation/engine/palette.ts` and `components/useScreen.ts`). The new system generalises both.
- **Care mode** (`components/games/CareMode.tsx`, `CrossGameSuggestions.tsx`, `HelplineSentence.tsx`): the logic is right. Only its presentation changes.
- **Settings already exist:** theme, text size, three contrast levels, greyscale, reduce motion, mute, volume and presets (`components/accessibility/AccessibilityPanel.tsx`, `types/accessibility.ts`). They are re-housed and extended, not replaced.

### 1.4 Gaps the redesign must close

- `AmbientParticles` draws lines that follow the pointer on every page. It is an irrelevant, salient distractor, which is the thing ADHD and autism research flags [FORSTER14][ERASLAN19][RAYMAKER19].
- The homepage's staggered 0/150/300/450 ms entrance makes the visitor wait for content that is already loaded [MARX-DA].
- Lighthouse CI runs only on `pull_request` (`.github/workflows/lighthouse.yml`), so on this trunk-based repo **it never runs**. Visual baselines exist only as `*-chromium-darwin.png` snapshots, which can never match in Ubuntu CI.
- `.claude/CLAUDE.md`'s "Design System Quick Reference" still prescribes `#e63946`, "System fonts", "75ms transitions" and `.pixelated`. Agents follow it, so it must change with Phase 1 or the system will drift straight back.

---

## 2. Concept

### 2.1 Recommended: **Seedpress**

> A small two-ink print shop that prints seed packets for your mind.

**The big idea.** VeryGoodMelon.Fun becomes the counter of a tiny risograph print shop.
- **Packets:** every game is a seed packet, printed in two translucent inks on warm paper. You pick one up and open it, and the game grows inside.
- **The counter:** the chrome is plain paper and one dark ink. It is printed the same way on every page and is always where you left it.
- **The packets:** they carry the character. Each has its own spot ink, its own stamped picture and the slight, honest offset of two inks that never quite register [RISO-CCS][RISO-MONIKER].
- **Prints:** when a game ends, you get a print to keep. The keepsake stops being a "screenshot card" and becomes a literal print off the press.

**The melon is reinvented as a set of parts, not a mascot:**
- **Flesh** is the one ink that means *go*.
- **Rind** is structure: outlines, "this one is yours", the current page.
- **Seeds** are the punctuation: bullets, the loading mark and the "you are here" marker.
- **The slice** is the one signature shape: the go-button is a flesh pill with a rind edge along its bottom, so it reads as a melon slice seen side-on.
- **The logo** is a hand-cut two-ink slice stamp, printed with a 1 px offset.

**Why it suits ADHD and autistic visitors:**
- The riso constraint of two or three inks per surface acts as a **built-in clutter and saturation budget**. Saturation drives arousal [VM94][WO18], and clutter costs attention [FISHER14][ERASLAN19].
- Paper is calm, low-glare and **static**. All of its charm comes from texture and registration, not from motion [RAYMAKER19][HEAD15].
- Every packet shares one anatomy. The predictable container reduces uncertainty [BOULTER14][COGA], while the picture on it supplies the novelty ADHD visitors look for, confined to the content where it helps instead of the chrome where it distracts [FORSTER14].
- Printed objects have **honest affordances**: a stamp looks pressable, and a pull-tab looks pullable [COGA "clearly identify controls"][HO].

### 2.2 Alternatives considered

| Concept | One-line idea | Strength | Why not chosen |
|---|---|---|---|
| **Toybox** | Soft-brutalist toy hardware: chunky keycaps, knobs, rubber sliders, hard offset shadows. | Superb tactile affordances; fun to press. | Thick borders and hard shadows everywhere sit close to neobrutalism's overload risk [NNG-NEO][HO], and gadget chrome competes with the games. Its best idea, the press-down control, is borrowed into Seedpress (§7.1). |
| **Night Allotment** | Each game is a plot in a moonlit allotment, and the homepage is a garden you walk. | Very calm, and on-theme for the Slow down games. | Dark-first and illustration-heavy, which is costly to make. It tempts ambient motion (fireflies, wind). The metaphor strains for a deckbuilder and an arcade toy. |
| **Picnic Cloth** | Gingham, paper plates and objects laid on a cloth. | Warm and immediately "lighter than real life". | A gingham grid is a repeating high-frequency pattern, the kind autistic adults report as aversive [PARMAR21][RAYMAKER19]. It also offers too few interaction metaphors. |

**Recommendation: Seedpress.**
- It is the only concept whose aesthetic constraint (few inks, flat paper, static texture) is also the accessibility constraint.
- It reuses the site's existing pixel and keepsake DNA.
- It scales to all 14 games, since every game can be a packet.
- It costs the least to build: CSS, SVG and a few textures, with no new JavaScript.

---

## 3. Principles

Each principle is followed by the evidence that justifies it and by how it is enforced or observed.

1. **Predictable counter, playful packets.** The chrome (header, footer, settings, game strip, buttons) looks and behaves the same everywhere. Playfulness lives inside packets, games and prints.
   - *Evidence:* intolerance of uncertainty mediates anxiety in autistic young people [BOULTER14]. Consistent navigation, identification and help are standards [WCAG22 3.2.3/3.2.4/3.2.6][COGA]. "Highly consistent behaviour" was a co-designed requirement [RAYMAKER19].
   - *Enforced by:* one `GameStage` template and the shared chrome components (§7), with e2e checks of header and footer order on every route.
2. **Stimulation is opt-in and localised.** Nothing moves unless the visitor caused it or chose it. At most one region on screen is "lively" at any time.
   - *Evidence:* decorated environments raise off-task time from about 28% to about 39% [FISHER14]. Autistic users fixate more on irrelevant elements [ERASLAN19]. Salient irrelevant distractors capture adults with ADHD [FORSTER14]. Users should control motion [COGA personalisation][WCAG22 2.2.2, 2.3.3].
   - *Enforced by:* the stimulation budget (§4) and a CSS rule that chrome has no `animation` at all.
3. **One focal point, one go.** Each view has one primary action, printed in flesh. Everything else is quieter.
   - *Evidence:* "Help users focus" and short critical paths [COGA]. "Simple and consistent layouts" [HO]. Search success drops on complex pages [ERASLAN19].
   - *Enforced by:* a `expectOneGo()` e2e helper and `check:design` (§10.2).
4. **Spend saturation like money.** Surfaces are low chroma (OKLCH C ≤ 0.02 for paper). Only the flesh ink exceeds C 0.12, and it covers small areas. Quiet mode halves the chroma. Yellow is avoided as a surface.
   - *Evidence:* saturation and brightness drive physiological arousal [VM94][WO18]. "Don't use bright contrasting colours" [HO]. Yellow is the least pleasant hue [VM94]; autistic children's yellow avoidance is weak evidence [GM16].
   - *Enforced by:* the chroma ceiling is asserted in `tokens.test.ts` (§10.2).
5. **Moderate juice, never extreme, never looping in chrome.** Feedback is immediate and small. Big moments happen once, when earned. Nothing in the chrome loops, flashes or travels more than 24 px.
   - *Evidence:* both no juice and extreme juice reduce motivation and experience, while medium juice is best [KAO20]. Waiting is aversive in ADHD, so feedback must come now [MARX-DA]. A third of adults over 40 have vestibular dysfunction [AGRAWAL09]. No flashes [WCAG-231]. Large motion is unsafe [HEAD15].
   - *Enforced by:* motion tokens (§5.6) and a CSS lint rule that bans `infinite` outside `components/games/**` and `app/games/**`.
6. **Words first, read once.**
   - *The rules:*
     - Body text is 18 px Atkinson Hyperlegible Next with line height 1.6 and at most 66 characters per line.
     - Text is left-aligned.
     - There are no italics, no underlines except on links, and no capitals for emphasis.
     - A "Roomy text" setting adds extra spacing.
   - *Evidence:* [BDA][HO][WCAG22 1.4.8, 1.4.12]. Italics hurt dyslexic readers [RELLO13]. Spacing helps more than typeface [ZORZI12][DURANOVIC18]. Special dyslexia fonts do nothing [AZZARELLO26][KUSTER18][WERY17].
   - *Enforced by:* `check:design` bans `italic`, `uppercase` and `tracking-*` classes on text.
7. **Feedback now; no clocks, no tallies, no streaks.**
   - *The rules:* every press answers within 100 ms. Progress is shown as place ("the third packet of seven") only when the game needs it, and never as a score to chase.
   - *Evidence:* delay aversion [MARX-DA]. Broken streaks demotivate and self-blame worsens it [SB23]. Temporal dark patterns [DARKP24]. Gamification is unproven for ADHD [SCHULTZ25][JIANG22]. No essential timing [WCAG22 2.2.1, 2.2.3].
   - *Enforced by:* the existing `no-counters.test.ts` is kept and extended to `components/seedpress`.
8. **Honest, physical affordances.**
   - *The rules:*
     - Anything pressable looks pressable: a printed edge and a press-down on activation.
     - Every control has a visible text label, and icons are never alone except the gear and close buttons, which carry labels.
     - Targets are at least 44×44 px.
   - *Evidence:* "Clearly identify controls" and "Icons that help" [COGA]. "Make buttons descriptive" [HO]. "Label everything, even redundantly" [RAYMAKER19]. Enhanced target size [WCAG22 2.5.5].
   - *Enforced by:* the component specs (§7) and an axe `target-size` rule in e2e.
9. **The visitor holds the dial.** One clear sensory dial (Quiet, Gentle, Lively), plus fine-tuning. The site never assumes what a visitor is sensitive to.
   - *Evidence:* personalisation is a COGA objective [COGA]. A low-contrast palette plus dark and light themes is a co-designed requirement [RAYMAKER19][PAVLOV14][GAIA]. Sensory over-responsivity varies widely and tracks anxiety [BS19][WASHU26]. Precedent: Alto's Zen Mode removes scoring entirely [ALTO].
   - *Enforced by:* the `data-sense` attribute drives the tokens (§4.3), and e2e runs every route in Quiet.
10. **Care is quiet, warm and first.** Support screens use no motion, no spot inks and no packets above the helplines. They use the warmest paper and plain words, and never ask for anything, donations included.
    - *Evidence:* the site's own care contract (`CareMode.tsx`). "Help and support" and "Limit interruptions" [COGA]. Calm technology "informs without overburdening" [WEISER95].
    - *Enforced by:* the `CareBlock` spec (§7.21) and an e2e check that no `data-go`, `GiveBlock` or `animation` appears while care mode is on.

---

## 4. Stimulation budget

### 4.1 Four levels

| Level | Name | What is allowed | Example |
|---|---|---|---|
| **S0** | Still | No motion. State changes are instant or a ≤120 ms opacity cross-fade. | Header, footer, care screens, body text. |
| **S1** | Responsive | Motion only in direct response to the visitor's input, ≤160 ms and ≤4 px travel, ending at rest. | Press-down on a button; a packet rising 3 px on hover or focus; a switch tab sliding. |
| **S2** | Lively, local | A one-shot flourish ≤700 ms, confined to the element acted on, one at a time on screen. | A choice card being "stamped"; a packet's second ink settling into register when opened; seeds settling on a correct word. |
| **S3** | Showpiece | A one-shot sequence ≤1,600 ms, at most once per game session, only at an earned moment, always with a static equivalent. Never flashes, never more than one region. | The keepsake print feeding out of the press; The Shapeshifter's rule-change bloom; The Gardener's light shift. |

Loops are allowed **only** as a game's own content, such as the Harmonist's breathing shape, the Patient One's settling seeds or The Shapeshifter's field. They always have a visible pause control if they last more than 5 s [WCAG22 2.2.2].

### 4.2 Budget by zone

| Zone | Ceiling | What lives there | What never does |
|---|---|---|---|
| Header, footer, settings drawer, game strip | **S1** | Press-downs, focus, the drawer sliding in (≤280 ms, S1 under Lively). | Loops, ambient canvases, hover colour shifts on large areas. |
| Homepage rack | **S1**, with S2 on today's packet | Packets lift 3 px and their second ink re-registers by 1 px on hover or focus. Today's packet's illustration ink settles (S2) once on first focus or hover. | Page-load entrances, auto-rotating "featured" items, background drift. The constellation canvas is **removed**. |
| Mood stamps and filters | **S1** | The stamp presses down when chosen. | — |
| Inside a game (content) | The game's own design, up to **S3** once | Each game's one "stimulating moment" (§9). | Flashes; motion the visitor did not start (except functional loops with pause). |
| Inside a game (chrome) | **S1** | Buttons, choice cards (S2 stamp on choose), the sticky action tray. | — |
| Rewards and end screens | **S2**, plus one **S3** | The ending's words appear first, still. Then the print feeds out (S3). | Confetti bursts, counting-up numbers (`.animate-count-up` is deleted), sound without opt-in. |
| Keepsake prints | Static image; **S3** only as the "printing" reveal | Two-ink overprint and misregistration are *printed into the image*, so they are static. | Animated or GIF keepsakes. |
| Care and support screens | **S0** | Warm paper, helplines, plain words, then two gentle packets (static, S0 hover: underline only). | Any animation, spot inks, packet tilt, sound, donation asks, "Continue your journey". |
| 404, offline, errors | **S0–S1** | Calm packets; a single stamp illustration. | Shake (`.animate-shake` is deleted), red. |

### 4.3 The sensory dial

The current "Quick presets" list (Calm, Focus, Sensory-friendly) is replaced at the top of the settings drawer by **one three-stop dial**. It is a native `radiogroup` styled as a rotary dial (§7.13), and its labels are always visible:

| Stop | Wording in the drawer | Motion ceiling | Texture and ink | Sound |
|---|---|---|---|---|
| **Quiet** | "Quiet: nothing moves unless you move it. Softer colours." | S0 in chrome. S1 becomes instant state changes. Game showpieces become their static end state. Game loops start paused. | Grain off, misregistration 0, tilt 0. **Quiet inks** (chroma roughly halved, §5.1). | Off by default; the visitor can still switch it on. |
| **Gentle** (default) | "Gentle: small movements when you press things, and one moment of colour when you finish." | Per §4.2. | Grain at 4%, misregistration 1 px, packet tilt ±1.2°. | Off until chosen (unchanged). |
| **Lively** | "Lively: a bit more bounce and a few soft sounds, if you like that." | S2 allowed on hover in the rack; S3 everywhere it is planned. | Grain at 6%, misregistration 2 px on hover, tilt ±2°. | UI sounds (§5.7) are offered; still off until the visitor switches sound on. |

**How the dial maps onto reduced motion:**
- `prefers-reduced-motion: reduce` **or** the existing "Reduce motion" switch caps motion at Quiet's level *whatever the dial says*.
- The dial's colour and texture still apply. So "Lively plus reduced motion" gives richer ink but nothing moves.
- Under reduced motion, motion is **replaced, not deleted** [HEAD20]:
  - Press-down becomes a 120 ms darkening of the edge.
  - The print feed becomes a 160 ms cross-fade to the finished print.
- The global `*{transition-duration:.01ms}` safety net in `globals.css` stays as a backstop.

**Fine-tune (below the dial, unchanged in function):**
- Theme
- Text size
- **Spacing**, a new setting: Standard or Roomy, below
- Contrast (Standard, High, Highest)
- Greyscale
- Reduce motion
- Mute all sound
- Volume
- Keys reference
- Reset all settings

Moving a fine-tune control away from the dial's defaults shows the dial as "Your own mix" (a fourth, non-selectable label) and announces it in the drawer's existing status line.

**Roomy spacing:** `letter-spacing: 0.05em; word-spacing: 0.12em; line-height: 1.8; paragraph gap 2em`. It is inside the 1.4.12 envelope [WCAG22] and is offered, not imposed [ZORZI12][DURANOVIC18].

**Implementation:**
- `lib/accessibility/boot-script.ts` gains `data-sense` and `data-spacing` on `<html>` before first paint, as it already does for `data-theme` and `data-contrast`.
- Stored preset choices migrate as follows:
  - `sensory-friendly` → Quiet + Greyscale
  - `calm` → Quiet
  - `focus` → Gentle + High contrast + Mute
- `AccessibilitySettings` gains `sense: 'quiet' | 'gentle' | 'lively'` and `spacing: 'standard' | 'roomy'`.

---

## 5. Tokens

All values live in one source, `lib/design/tokens.ts` (§10.1). The CSS custom properties and the Tailwind `@theme` mapping are generated from it.

### 5.1 Colour

**Roles (the same names in every palette):**

| Token | Role | Rule |
|---|---|---|
| `--paper` | Page background | Warm; never pure white in Standard [BDA]. Grain applies only here. |
| `--sheet` | Raised surfaces: packets, panels, game stage, inputs | Body text sits on sheet or paper only. |
| `--well` | Sunken surfaces: wells, text inputs, the sensory dial's track | |
| `--ink` | Body text, primary icons, focus ring | |
| `--ink-soft` | Secondary text (hooks, helper text, meta) | Never below 16 px. |
| `--rule` | Decorative hairlines between sections | Not for control boundaries (no 3:1 promise). |
| `--rule-strong` | Boundaries of controls: inputs, switches, stamp buttons | ≥3:1 on every surface. |
| `--rind` | Structure: chosen, current page, link underlines, the go-button's rind edge, care accent | Text-capable (≥4.5:1). |
| `--rind-wash` | Fill of a chosen item | Generated: 14% rind over sheet. |
| `--flesh` | **Go**: the one primary action's fill | ≥3:1 against every surface. Never text, never state. |
| `--flesh-press` | Go, hover and pressed | |
| `--on-flesh` | Text on flesh | ≥4.5:1 on flesh and flesh-press. |
| `--flesh-wash` | The ending's print tray background, only behind ink text | Generated: 12% flesh over sheet. |
| `--seed` | "Have a look" notes (gentle errors, warnings), seed glyphs | Text-capable; always paired with a glyph and words. |
| `--moss`, `--dusk`, `--clay` | Spot inks for the three shelves: Slow down, Reflect, Play. Also packet illustrations and game art. | Text-capable on every surface, but used as labels only next to a glyph and the shelf name (never colour alone). |
| `--focus` | Focus ring | Equals `--ink`. Always drawn with a 3 px paper gap, so its neighbour is paper (≥3:1). |

**Palettes (exact hex):**

| Token | Light | Dark | Light Quiet | Dark Quiet | Light High | Dark High |
|---|---|---|---|---|---|---|
| paper | `#F5EFE4` | `#151D18` | `#F2EEE8` | `#1A1D1C` | `#FFFFFF` | `#000000` |
| sheet | `#FFFAF2` | `#1D2822` | `#FAF8F4` | `#222625` | `#FFFFFF` | `#0D0D0D` |
| well | `#EAE1D1` | `#0F1511` | `#E7E2DA` | `#141716` | `#F2F2F2` | `#000000` |
| ink | `#1D2721` | `#F0E9DD` | `#24292A` | `#E6E2DB` | `#000000` | `#FFFFFF` |
| ink-soft | `#4A574F` | `#B9B3A7` | `#4F5655` | `#ADA9A2` | `#2B2B2B` | `#DADADA` |
| rule | `#D5CBB8` | `#33413A` | `#D3CEC6` | `#373C3A` | `#4A4A4A` | `#BDBDBD` |
| rule-strong | `#6F7A6F` | `#7E8C83` | `#727977` | `#7E8582` | `#000000` | `#FFFFFF` |
| rind | `#1E5A3A` | `#86CFA4` | `#3A5A4A` | `#9DBDAC` | `#0A3A20` | `#A9EEC6` |
| rind-wash | `#DFE4D8` | `#2C3F34` | `#DFE2DC` | `#333B38` | `#DDE3E0` | `#232D27` |
| flesh | `#C23A4E` | `#F48A99` | `#8E4F58` | `#D9A3AA` | `#9E1730` | `#FFB3BE` |
| flesh-press | `#A52F42` | `#F9A7B3` | `#784249` | `#E5BAC0` | `#7E1024` | `#FFD0D7` |
| on-flesh | `#FFFAF2` | `#22100F` | `#FAF8F4` | `#1E1415` | `#FFFFFF` | `#000000` |
| flesh-wash | `#F8E3DE` | `#373430` | `#EDE4E1` | `#383535` | `#F3E3E6` | `#2A2122` |
| seed | `#5E3B4C` | `#DDB0C4` | `#5C4A52` | `#CDB7C0` | `#4A1F33` | `#F0CFDD` |
| moss | `#2C6656` | `#7CC6B3` | `#45625B` | `#9EBDB5` | `#0F4A3C` | `#A6EBDA` |
| dusk | `#4A4785` | `#B1AEF2` | `#55546F` | `#B4B3CF` | `#2E2B6B` | `#D2D0FF` |
| clay | `#9A4A26` | `#EEA27F` | `#7A5444` | `#D3B1A2` | `#6E2E10` | `#FFC6AA` |
| focus | = ink | = ink | = ink | = ink | = ink | = ink |

**How the palettes combine with the settings:**
- **Highest contrast** uses the High palette and also sets every `--rule` to `--rule-strong`, makes all control borders 3 px, underlines all links, sets body weight to 500 (as today) and turns grain and misregistration off.
- **Greyscale** keeps its current root `filter: grayscale(100%)`. Every state already carries a glyph and words, so nothing depends on hue.

**Contrast, computed (WCAG 2.x).** The worst case of each requirement is shown per palette; every listed pair passes. Text needs 4.5:1 and UI needs 3:1. "Any surface" means the minimum across paper, sheet and well.

| Pair | Min | Light | Dark | L-Quiet | D-Quiet | L-High | D-High |
|---|---|---|---|---|---|---|---|
| ink on any surface | 4.5 | 11.87 | 12.62 | 11.43 | 11.86 | 18.76 | 19.44 |
| ink-soft on any surface | 4.5 | 5.85 | 7.30 | 5.83 | 6.54 | 12.65 | 13.90 |
| rind (as text) on any surface | 4.5 | 6.28 | 8.32 | 5.94 | 7.51 | 11.45 | 14.56 |
| seed on any surface | 4.5 | 7.34 | 8.04 | 6.37 | 8.11 | 12.22 | 13.58 |
| moss on any surface | 4.5 | 5.15 | 7.68 | 5.17 | 7.58 | 9.08 | 14.36 |
| dusk on any surface | 4.5 | 6.40 | 7.40 | 5.65 | 7.50 | 11.21 | 13.15 |
| clay on any surface | 4.5 | 4.79 | 7.33 | 5.12 | 7.71 | 9.10 | 12.87 |
| on-flesh on flesh | 4.5 | 5.04 | 7.78 | 5.81 | 8.38 | 8.02 | 12.44 |
| on-flesh on flesh-press | 4.5 | 6.55 | 9.75 | 7.40 | 10.39 | 10.57 | 15.26 |
| ink on rind-wash (chosen) | 4.5 | 11.89 | 9.32 | 11.26 | 8.92 | 16.14 | 14.23 |
| ink-soft on rind-wash | 4.5 | 5.86 | 5.39 | 5.74 | 4.92 | 10.88 | 10.18 |
| ink on flesh-wash | 4.5 | 12.48 | 10.26 | 11.77 | 9.41 | 16.94 | 15.68 |
| seed on flesh-wash | 4.5 | 7.72 | 6.53 | 6.57 | 6.44 | 11.04 | 10.96 |
| rule-strong (control edge) on any surface | 3.0 | 3.45 | 4.33 | 3.45 | 4.06 | 18.76 | 19.44 |
| flesh (go fill) on any surface | 3.0 | 4.04 | 6.49 | 4.78 | 7.12 | 7.16 | 11.52 |
| rind (chosen edge) on rind-wash | 3.0 | 6.29 | 6.14 | 5.85 | 5.65 | 9.85 | 10.66 |
| focus (= ink) on any surface | 3.0 | 11.87 | 12.62 | 11.43 | 11.86 | 18.76 | 19.44 |

**Saturation, computed (OKLCH chroma C):**
- **Light:** paper 0.016, rind 0.082, moss 0.067, dusk 0.100, clay 0.118, flesh **0.172** (the only token over 0.12, by design).
- **Light Quiet:** flesh 0.085, others ≤0.057.
- **For comparison:** today's Tailwind-derived `pink-500` is about 0.241 and `blue-500` about 0.214.
- **Yellow:** none as a surface or ink [VM94][GM16]. The Alchemist's "gold" becomes a brass derived from clay (§9).

**Current tokens, for the record:**
- `--card-border` on `--background` is 1.17:1, and 1.68:1 in dark.
- `--success #74c69d` on white is 2.04:1 wherever it is used as a meaningful fill edge.
- The red link `#d32f3f` on `#fafafa` is 4.74:1: it passes, but it is red text for links, which the red rule's spirit forbids.

The script that produced these figures moves into the repo as `__tests__/lib/design/tokens.test.ts` (§10.2).

### 5.2 Type

**Fonts.** Two families, self-hosted with `next/font/local` from `app/fonts/` [NEXTFONT]. `next/font/google` is removed.

| Role | Family | Why | Licence | File (Latin WOFF2) |
|---|---|---|---|---|
| Body, UI, labels, keepsake words | **Atkinson Hyperlegible Next**, variable weight 200–800, roman only | Built so similar letters can be told apart (I l 1, O 0, b d p q) [AHLN]. Sans-serif and roman, as the evidence favours [RELLO13]. One file covers every weight. No italic file is shipped, because italics hurt [RELLO13][BDA]. | SIL OFL 1.1 [AHLN] | **33,996 B** measured [SIZES] |
| Display only: h1, h2, packet titles, prints' titles (≤8 words, ≥24 px) | **Bricolage Grotesque**, weight axis 600–800 | It has ink-trap, hand-printed character that echoes riso type, which gives the site an identity body text never could. Restricted to short, large text, where letter confusions don't matter. | SIL OFL 1.1 [BRICOLAGE] | **41,344 B** (weight-only) measured [SIZES]; target **≤30 KB** after instancing (below) |

**Honesty about evidence:**
- No typeface has strong evidence of improving reading for dyslexic or ADHD readers [AZZARELLO26][KUSTER18][WERY17].
- Lexend's claims are weak [LEXEND-G][LEXEND-TD], so it was not chosen.
- Atkinson was chosen for distinguishable letters, a free licence and a small size.
- Readability comes mainly from size, spacing, line length and user control (§5.2 rules and §4.3 Roomy) [ZORZI12][BDA][WCAG22].

**Loading:**
- `preload: true` for Atkinson. `preload: true` for Bricolage only because the home h1 uses it; it is the LCP text, so a fallback with matched metrics matters.
- `adjustFontFallback: 'Arial'` and `display: 'swap'` for both.
- Bricolage is pre-instanced with fontTools `varLib.instancer` at `opsz=36 wdth=100 wght=600:800` and subset to Basic Latin, Latin-1 punctuation and `’ “ ” – — …`. The command and its output size are recorded in `app/fonts/README` during Phase 1.
- The `OFL.txt` files ship beside each font.
- Canvas keepsakes use the same faces through `document.fonts.load()`, which removes the device-dependent `"Segoe Print", "Comic Sans MS"` "hand" stack in `lib/keepsake/render.ts`.

**Scale** (rem, so the existing text-size setting scales it; the root is 16 px):

| Token | Size | Family and weight | Line height | Use |
|---|---|---|---|---|
| `--t-meta` | 0.875rem (14) | Atkinson 500 | 1.45 | Dates and small print only; never a paragraph |
| `--t-small` | 1rem (16) | Atkinson 400/600 | 1.55 | Hooks, helper text, footer |
| `--t-body` | 1.125rem (18) | Atkinson 400; bold 700 | 1.6 | All reading text [BDA][WCAG22 1.4.8] |
| `--t-lead` | 1.375rem (22) | Atkinson 400 | 1.5 | A game's one-line "what you do" |
| `--t-h3` | 1.5rem (24) | Atkinson 700 | 1.3 | Section heads inside games |
| `--t-h2` | clamp(1.75rem, 1.45rem + 1vw, 2.25rem) | Bricolage 700 | 1.15 | Shelf names, end-screen titles |
| `--t-h1` | clamp(2.25rem, 1.75rem + 2vw, 3.5rem) | Bricolage 800 | 1.1 | Game titles, page titles |
| `--t-hero` | clamp(2.5rem, 1.6rem + 3.4vw, 4.5rem) | Bricolage 800 | 1.05 | Home only |

**Type rules:**
- The measure is `max-width: 66ch` for every prose block [BDA 60–70][WCAG22 1.4.8 ≤80].
- Text is left-aligned. Centring is allowed only for ≤2-line titles on end screens.
- There is no `font-light` (weights <400 are banned).
- Emphasis is weight 700 only. There is no italic, no uppercase and no letter-spacing utility on text [BDA][HO][RELLO13]. The game names stay as written ("The Sage"); the CAPITALISED Shapeshifter rule titles inside its canvas are in-game art and keep their retro style there only.
- Links are underlined, because an underline means a link and nothing else.
- Display clamps grow at most 1.6× from min to max, so the 200% zoom and text-size settings are never fought by `vw`.

### 5.3 Space and size

- **Base unit 4 px.** The scale (`--s-*`) is `1:4, 2:8, 3:12, 4:16, 5:24, 6:32, 7:48, 8:64, 9:96` px.
- **Rhythm:**
  - 8 inside controls
  - 16 between related items
  - 24 between groups
  - 48 between sections
  - 96 above the footer
- **Targets:**
  - Every interactive target is at least **44×44** [WCAG22 2.5.5].
  - The go-button is 52 px tall.
  - Inline links in prose are exempt by the standard but get `padding-block: 2px` for comfort.
- **Page widths** (one set, replacing today's 2xl/3xl/4xl/6xl/7xl/640 px mix):
  - `--w-prose` 40rem (prose, settings drawer content)
  - `--w-stage` 60rem (game stage)
  - `--w-shop` 90rem (header, footer and rack share this edge on every page, so the counter never jumps)
- **Gutters:** 16 px at 390, 24 px from 640, 48 px from 1024.

### 5.4 Shape, borders and texture

Three shapes only:

| Shape | Geometry | Used for |
|---|---|---|
| **Sheet** | A rectangle with a `--r-sheet: 14px` radius | Panels, game stage, inputs, dialogs |
| **Stamp** | A rectangle with a `--r-stamp: 10px` radius, a 2 px `--rule-strong` border and a 3 px printed bottom edge (`box-shadow: 0 3px 0 var(--rule-strong)`) | Secondary buttons, choice cards, mood stamps, keycaps |
| **Slice** | A full pill (`--r-slice: 999px`) in flesh, with a 4 px rind bottom edge (`box-shadow: inset 0 -4px 0 var(--rind)` plus `0 3px 0 var(--rind)`) | **Only** the go-button |

**Packets** are sheets with two marks:
- A **notched top**: a CSS `mask` of a shallow 6-scallop edge, like a torn seed-packet top.
- A **flap line** 24 px from the top, in `--rule`.

**Borders:** 1 px `--rule` is decorative. 2 px `--rule-strong` bounds a control. 3 px `--rind` shows chosen or current.

**Texture assets** (static, CSS-only, no JavaScript):
- `public/press/grain.png`: a 128×128 monochrome noise tile, 2–3 KB. It is used as `background-image` on `body` only, at opacity 4% (Gentle), 6% (Lively) or 0 (Quiet, Highest contrast). It is **never on sheets that carry body text**: reading surfaces stay flat, since "Don't let the background obscure foreground content" [COGA] and "avoid textured backgrounds" [RAYMAKER19].
- `public/press/halftone.svg`: a 6 px dot screen used inside packet illustrations and prints as a mid-tone, so there are no gradients.
- **Misregistration:** illustrations are two SVG layers (`.ink-a` and `.ink-b`). `.ink-b` is translated by `var(--misreg)`, where Quiet is 0, Gentle is 1 px and Lively is 1 px, or 2 px on hover. Overlaps use `mix-blend-mode: multiply` in light themes and `screen` in dark, as real translucent inks overprint [RISO-MONIKER].
- **Tilt:** each packet has a fixed angle from its `order` (`[-1.2, 0.8, -0.4, 1.1, -0.9, 0.5]°` cycling). It is deterministic, so a returning visitor sees the same shelf. It is 0 in Quiet.

**Elevation.** There are no blurred shadows anywhere. Height is shown as a printed paper edge:
- Rest: `0 3px 0` in `--rule-strong`.
- Lifted (hover or focus on a packet): `0 6px 0`.

The existing `.soft-shadow*` classes, `shadow-lg` and `shadow-2xl` are removed.

**Z-layers** (`--z-*`):

| Layer | Value |
|---|---|
| base | 0 |
| raised | 1 |
| sticky tray | 20 |
| header | 30 |
| disclosure | 40 |
| scrim | 50 |
| dialog and drawer | 60 |
| skip link | 80 |

This replaces today's ad-hoc `z-50`, `z-[60]`, `z-[70]` and `z-[100]`.

### 5.5 Focus

One focus style everywhere:

```css
:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
```

- The 3 px offset leaves a gap in which the surface beneath, paper or sheet, shows through. That gap is what the 3:1 check is measured against.
- It is an outline, so `box-shadow` button edges never hide it. This fixes the current approach, which uses `box-shadow` for focus and so collides with printed edges.
- Its contrast is ≥11.4:1 against the paper gap in every palette (§5.1), which exceeds 2.4.13 [WCAG22].
- The `[tabindex="-1"]` "place, not control" exception in `globals.css` stays, restyled as a 2 px rind outline at 40% opacity.
- `scroll-margin` on focusable elements makes sure the sticky tray never covers them [WCAG22 2.4.11].

### 5.6 Motion

| Token | Value | Use |
|---|---|---|
| `--d-instant` | 0 ms | Quiet, and reduced-motion state changes |
| `--d-tap` | 90 ms | Press-down and release |
| `--d-quick` | 160 ms | Hover lift, switch, colour or state change, reduced-motion cross-fades |
| `--d-settle` | 280 ms | Drawer, disclosure, dialog enter (leaving is 160 ms) |
| `--d-flourish` | 700 ms | S2 one-shots |
| `--d-print` | 1,600 ms | S3 print feed |
| `--e-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Settle and enter |
| `--e-in` | `cubic-bezier(0.4, 0, 1, 1)` | Leave |
| `--e-stamp` | `cubic-bezier(0.3, 1.35, 0.5, 1)` | Stamp press only (≤4% overshoot; becomes `--e-out` in Quiet) |

**Choreography rules:**
1. Only transform and opacity are animated: no layout properties and no `filter` (unlike today's `.card-hover-organic`).
2. One moving region at a time. A flourish waits until the previous one ends.
3. Travel is ≤4 px in chrome and ≤24 px in game content, except inside a game's own canvas. There is no zoom, parallax, spin or scroll-linked motion [HEAD15].
4. Nothing enters on page load. Content is simply there. The homepage `fadeIn` stagger and the 40 uses of `animate-fade` are removed.
5. Leaving is faster than arriving.
6. Every S2 or S3 effect has a reduced-motion equivalent: a ≤160 ms opacity cross-fade to its end state [HEAD20].
7. There is no flashing. Luminance changes over 10% happen at most once per second per region, which is well under three per second [WCAG-231].

**Implementation.** `[data-sense]` and `@media (prefers-reduced-motion)` set `--motion: 0 | 1`. Durations are written as `calc(var(--d-quick) * var(--motion))`, and JavaScript-driven game motion reads `useSense()` (§10.1).

### 5.7 Sound

All sound is opt-in, as today, through the drawer's "Mute all sound" and Volume controls and each game's own sound switch. UI sounds exist only in Lively and still only after sound is on.

| Token | Sound | Length | Level | When |
|---|---|---|---|---|
| `snd-press` | A soft paper tap, low-passed at 2 kHz | 40 ms | −30 dBFS peak | Go and stamp buttons, on activation (never on hover or focus) |
| `snd-stamp` | A rubber-stamp thunk | 90 ms | −28 dBFS | A choice is chosen |
| `snd-feed` | Paper feeding through rollers | 900 ms | −30 dBFS | The keepsake print feed (S3) |
| `snd-ring` | One sine-and-triangle bell, 523 Hz with a fifth | 1,200 ms decay | −26 dBFS | The end of a game, at most once per session |

- Sounds are generated with WebAudio from short parameter sets in `lib/audio/ui-sounds.ts`, so no audio files are downloaded.
- Each sound is scaled by the existing `data-volume`.
- No sound ever plays from an event the visitor did not cause.
- Game soundscapes (`AmbientSoundscape`) are unchanged in behaviour.

---

## 6. Iconography and illustration

### 6.1 Seed stamps: the hand-made icon set

**How it is drawn:**
- Each icon is authored by hand as ASCII rows on a **12×12 grid**, extending the existing `MoodGlyph` pattern in `components/home/MoodDoors.tsx`.
- It is compiled at module load into one SVG `path` with `shapeRendering="crispEdges"` and `fill="currentColor"`.
- There are no strokes: lines are 1 cell thick, or 2 cells for the 36 px size variant.

**Sizes:** integer multiples only, so pixels stay crisp:
- 24 px (2×): UI default
- 36 px (3×): mood stamps and shelf glyphs
- 48 px (4×): empty, 404 and offline illustrations

**Character:** one deliberately imperfect cell per icon (a nicked corner), like a rubber stamp.

**Accessibility:** always `aria-hidden` next to visible text. In the two icon-only buttons, gear and close, the button carries the `aria-label`.

**Format:** `components/seedpress/icons/glyphs.ts` exports `Record<IconName, readonly string[]>`. `Icon.tsx` renders it. A unit test checks that each glyph is 12 rows of 12 characters, contains only `.` and `X`, and is used somewhere.

**The set replaces `lucide-react` entirely.** That is 70 imports in 31 files; the dependency is removed in Phase 3. The needed icons were consolidated from the audit:

| Group | Stamps (count) | Replaces (lucide) |
|---|---|---|
| Chrome | `settings` (a dial, not a gear), `close`, `back`, `next`, `home`, `external` (6) | Settings, X, ArrowLeft, ArrowRight, ChevronRight, Home, ExternalLink |
| Actions | `play`, `pause`, `stop`, `again`, `undo`, `shuffle`, `send`, `share`, `save`, `copy`, `clear`, `add`, `more`, `write`, `search` (15) | Play, Pause, Square, RotateCcw, RefreshCw, Undo2, Shuffle, Send, Share, Share2, Download, Copy, Trash2, Plus, MoreHorizontal, PenLine, Search |
| States | `done`, `note` (gentle info), `look` (gentle warning), `help`, `loading-seed` (4 frames), `disclose` (6) | Check, CheckCircle(2), Info, AlertCircle, AlertTriangle, XCircle, HelpCircle, Loader2, ChevronDown |
| Media and senses | `sound-on`, `sound-off`, `mic`, `mic-off`, `image`, `image-off`, `keys` (7) | Volume2, VolumeX, Mic, MicOff, Image, ImageOff, Keyboard |
| Theme | `sun`, `moon`, `match-device`, `dusk-sky` (4) | Sun, Moon, SunMoon, Sunset |
| People and places | `minds`, `mind`, `talk`, `book`, `library`, `phone`, `calendar`, `globe`, `keep` (bookmark add), `kept` (bookmarked), `care` (a cupped-hands seed, not a heart) (11) | Users, UserRound, MessagesSquare, Book, Library, Phone, Calendar, Globe2, BookmarkPlus, BookmarkCheck, Heart, Hand |
| Game-specific | `flask` (Alchemist). The Shapeshifter set: `bloom`, `gem`, `ghost`, `magnet`, `pointer`, `move`, `music`, `spark`, `star`, `tide`, `wind` (12) | FlaskConical, Flower2, Gem, Ghost, Magnet, MousePointer2, Move, Music2, Sparkles, Star, Waves, Wind |
| Wayfinding | `restless`, `heavy`, `playful` (existing mood glyphs, redrawn to 12×12), `slow`, `reflect`, `play-shelf` (6) | (new) |

**Total: 67 stamps.** Phase 1 needs 14 of them: settings, close, back, next, external, play, done, note, sound-on, sound-off, the three moods and the three shelves.

### 6.2 Illustration language: two-ink packet prints

- **Construction:** every packet illustration is an SVG of **two layers**.
  - **Ink A** is always the game's spot ink.
  - **Ink B** is rind, flesh or seed.
  - Mid-tones come from `halftone.svg` only. Line work is printed over solid fills, which survive misregistration [RISO-CCS].
- **Canvas:** 3:4 at 240×320 viewBox units, centred motif, and **no words in the art**. The title is real text beneath it, fixing today's 6 px baked-in titles.
- **Colour:** the inks are CSS variables (`fill="var(--ink-a)"`), so every packet follows theme, Quiet, High contrast and greyscale with no extra files.
- **Size:** each illustration is ≤4 KB gzipped, inline SVG, with no raster images on the rack.
- **Motifs:** one per game (§9). The motif is a single object, not a scene, so the "one focal point" rule holds at thumbnail size.

### 6.3 Harmonising game art

No full redraws are needed. Each game's art moves onto the system in three steps:

1. **Inks.** Canvas and SVG art reads colours from `getInks(theme, sense, contrast)` in `lib/design/inks.ts`, a generalisation of `app/games/the-mutation/engine/palette.ts`, instead of raw hex.
   - The worst current offenders are `components/games/calm-garden/draw.ts` (43 hex values), `TimelessMinds.tsx` (27), `the-mutation/engine/palette.ts` (16) and `BreathingPatterns.tsx` (10).
   - Each game gets a **game ink map**: 3–6 named inks derived from the system's spot inks. Examples: the Gardener's `petal`, `leaf` and `dusk-light`; the Philosopher's existing `--tp-evidence` and `--tp-logic` re-pointed to moss and clay.
2. **Paper.** Game surfaces sit on `--sheet` with the stage frame (§8.2). Full-bleed scenes, such as the Final Word's dusk and the Awakening's dawn, are framed by a 2 px rind-edged sheet so the counter stays visible around them.
3. **Print finish (optional per game, Gentle and Lively only).** Large flat fills in canvas art can take a 4% grain overlay and a 1 px second-ink offset. This is a small helper in `lib/design/print.ts` that draws the existing frame twice; it is skipped in Quiet.

**Thinker portraits (The Sage, The Arena):**
- They become **duotone riso portraits**: ink plus spot ink on paper.
- They are pre-processed offline by `scripts/duotone-avatars.mjs` (sharp, which is already transitively available through Next; confirm in Phase 4) into WebP, one set per theme.
- Live CSS filters are avoided for performance.

---

## 7. Component inventory

**Audit summary:**
- 15 of 23 `components/ui/*` files are unused by any page and are **deleted** in Phase 0 (§1.2).
- What is actually in use is a mix of patterns repeated inline in game files:
  - `buttonClassName` (8 files) and `<Button>` (21 files)
  - inline confirms (6 files)
  - native `<dialog>` (2 files)
  - `role="dialog"` divs (11 files)
  - `role="status"` lines (25 files)
  - `<details>` disclosures (8 files)
  - radio and choice patterns (21 places)
  - `aria-pressed` toggles (10)
  - inputs and textareas (43)

The new system lives in `components/seedpress/` (§10.1). Every component below lists its anatomy, its states (rest, hover, focus, active, disabled, loading), accessibility notes and motion. All of them use the focus style in §5.5, and no state relies on colour alone.

### 7.1 Buttons

| Variant | Anatomy | Rest | Hover | Focus | Active (pressed) | Disabled | Loading |
|---|---|---|---|---|---|---|---|
| **Go** (`<Go>`), one per view | A slice pill in flesh with a rind bottom edge; label in Atkinson 700, 18 px, `--on-flesh`; optional trailing `next` stamp. Height 52, padding-inline 28. | flesh | flesh-press; edge 4→5 px (S1) | §5.5 ring | Moves down 3 px; the rind edge compresses to 1 px (90 ms, `--e-stamp`) | `--well` fill, `--ink-soft` label, dashed 2 px `--rule-strong` border, no edge; `aria-disabled` plus a reason line beside it where there is one | The label stays, and a `loading-seed` stamp replaces the trailing icon; `aria-busy="true"`; still focusable; a second press is ignored |
| **Stamp** (`<Stamp>`) | A sheet stamp with a 2 px `--rule-strong` border and a 3 px printed edge; ink label, 16–18 px, weight 600. Height 48. | sheet | `--rind-wash` fill | ring | Press-down 3 px, edge to 0 | Same as Go disabled | Same as Go |
| **Quiet** (`<QuietButton>`) | Text with a 1.5 px rind underline offset 4 px; minimum 44×44 hit area | ink | Underline 3 px | ring | Underline colour → ink | `--ink-soft`, no underline | — |
| **Careful** (`<Careful>`), destructive | A stamp shape with a `seed` label and the `clear` stamp; **always** opens an inline confirm (§7.12) | sheet | `--flesh-wash` fill (not flesh) | ring | Press-down | as Stamp | — |
| **Icon** (`<IconStamp>`), gear and close only | A 44×44 stamp, 24 px glyph, `aria-label` | transparent | `--rind-wash` | ring | Press-down | — | — |

**Accessibility:**
- Always a native `<button>`, or an `<a>` carrying `buttonClass()` for navigation.
- The label always describes the result ("Seal the jar", "Breathe again"), never "Click here" [HO].
- Go sets `data-go` for the one-go check.

**Motion:**
- Press-down happens under every sense setting except reduced motion, which uses a 120 ms edge darkening instead.
- No ripple, glow, squeeze or rotate. `.button-squeeze`, `.ripple-effect` and `.animate-glow` are deleted.

### 7.2 Links

**Inline link:**
- `--ink` text with a 1.5 px `--rind` underline and `text-underline-offset: 3px`.
- Hover: underline 3 px. Focus: ring. Visited: unchanged, since predictability beats history here.

**External link:** appends the `external` stamp and `<span class="sr-only"> (opens in a new tab)</span>` (as today).

**Navigation link (header):**
- Rest: ink.
- Current: a 3 px rind underline plus `aria-current="page"`.
- Hover: rind underline 1.5 px.

Links are **never flesh**. Today's `text-accent` links in About and Legal are changed.

### 7.3 Text fields and textareas: the "writing slip"

**Anatomy:**
- A label **above**, always visible, in Atkinson 600 at 16 px. There are no placeholder labels.
- An optional hint line in `--ink-soft`.
- The field: a `--well` fill with a 2 px `--rule-strong` border and the sheet radius; text at 18 px.
- An optional length note below. It is worded as now, and kept on the no-counters allow-list as a length limit, not progress.

**States:**

| State | Look |
|---|---|
| Hover | Border becomes `--ink-soft` |
| Focus | Ring, with the border becoming `--ink` |
| Filled | No change (no green "valid" ticks while typing) |
| Error | A "have a look" note below, in seed ink with the `look` stamp and words saying how to fix it. The border becomes 3 px seed. `aria-invalid` and `aria-describedby`. Never red, never a shake. |
| Disabled | Dashed border, `--ink-soft` text |

**Accessibility:** one `useId` per field.

**Writing games** (Final Word, Awakening, Keeper, Plain Speaker, Sage) use `<WritingSlip>`, a taller textarea with a 2 px ruled-line background (CSS `repeating-linear-gradient` in `--rule` at line-height intervals). It is off in Quiet and Highest contrast.

### 7.4 Choice cards ("stamp cards"), for The Dilemma's choices, the Arena pairings and the Sage chooser

**Anatomy:** a stamp-shaped card with an optional 36 px glyph, a title (Atkinson 700) and an optional line. The whole card is the control: a radio `<label>` with the `<input>` visually hidden, or `aria-pressed` for toggles.

| State | Look |
|---|---|
| Rest | Sheet with a 2 px rule-strong border and a 3 px edge |
| Hover | Rind-wash fill |
| Focus | Ring (`:has(:focus-visible)`) |
| Chosen | Rind-wash fill, a 3 px rind border, a `done` stamp at top right, and the visible word "Chosen" for screen magnifier users. Motion: an S2 "stamp" press of 3 px down, 90 ms then 160 ms back, with `snd-stamp` in Lively. |
| Disabled | Dashed border |

**Rules:**
- Never flesh, which keeps the red rule.
- A group has a visible `legend`.
- Arrow-key behaviour is the native radio behaviour.

### 7.5 Toggles

**Switch ("pull tab"):**
- A 56×32 slot in `--well` with a 2 px rule-strong border.
- A tab carries the visible word **On** or **Off** inside it, so meaning never depends on colour or position alone.
- On: the tab slides right (160 ms, S1) and the slot fills rind with `--on-flesh`-equivalent text (`--sheet`).
- `role="switch"` and `aria-checked`, as now.

**Segmented choice ("stamp row"):**
- Used for Theme, Text size, Spacing and Contrast.
- A row of stamps in a `fieldset`. The chosen one is rind-wash with a rind border and a `done` stamp.
- Replaces the current `has-[:checked]` grey pills.

**Toggle buttons in games** (`aria-pressed`, 10 places): these are stamps, with the pressed state shown as chosen.

### 7.6 Slider (Volume)

- A native `input[type=range]`.
- Track: `--well` with a 2 px rule-strong border. Filled part: rind.
- Thumb: a 28 px seed-shaped stamp in ink, with a 3 px paper ring.
- The value is spoken through `aria-valuetext` and shown as a word ("Soft", "Medium", "Full") next to the percent.

### 7.7 Settings drawer (`AccessibilityPanel`, restyled and reordered)

**Anatomy:**
- On phones: a full-height bottom sheet.
- From `sm`: a 26rem right-side sheet.
- A sticky title row: "Settings" (h2) and a close icon stamp.

**Sections, in order:**
1. **How it feels** (the sensory dial).
2. **Seeing** (theme, text size, spacing, contrast, greyscale).
3. **Motion** (reduce motion).
4. **Sound** (this game's soundscape, mute, volume).
5. **Keys**.
6. **Start over** (the reset with its inline confirm).

**Accessibility:** keeps `useModalDialog`, `role="dialog"`, `aria-modal`, the existing focus return and the status line. Test-relied names stay ("Accessibility settings", "Open accessibility settings", the switch names); the visible heading can read "Settings" while `aria-labelledby` points to a visually hidden "Accessibility settings" span.

**Motion:** slides in 280 ms in Gentle and Lively, and appears instantly in Quiet. The scrim fades 160 ms.

### 7.8 Sheet (panel)

- A sheet surface with a 1 px rule border and a 14 px radius; padding 24, or 16 on phones.
- An optional `title` slot (h2 or h3, configurable).
- No hover state unless it is a link.
- It replaces `Card` and the many inline `rounded-xl border bg-card-bg p-*` blocks.

### 7.9 Packet (game card)

**Anatomy, top to bottom:**
1. A **notched top** with a **shelf tab**: the shelf glyph and shelf name ("Slow down") in 14 px Atkinson 600, in the shelf's spot ink.
2. The **illustration window**, 3:4, two-ink (§6.2).
3. The **flap line**.
4. The **title** in Bricolage 700, 22–24 px.
5. The **hook** in 16 px `--ink-soft`, at most 2 lines with clamp fallback to wrapping (never truncated for screen readers).

The whole packet is one `<a>`. Its accessible name is the title, and `aria-describedby` points to the hook. This replaces today's long `aria-label`, which hid the visible text from voice-control users.

**States:**

| State | Look |
|---|---|
| Rest | Tilted (§5.4), with a 3 px edge |
| Hover or focus | Tilt goes to 0, it lifts 3 px with a 6 px edge, and ink B re-registers by 1 px (S1, 160 ms). Focus also shows the ring. |
| Active | Press-down |
| Visited | None, since that would be a quiet tally |

**Sizes:** `rack` (165 px wide at 390), `counter` (today's pick, §7.10) and `small` (suggestions and care).

**Quiet:** no tilt, no lift, no re-registration. Focus and hover show a 3 px rind border only.

### 7.10 Today's packet (the counter)

- A `counter` packet beside a sheet with three elements:
  - "Today's packet", 16 px Atkinson 600 in rind, sentence case.
  - The game title as h2.
  - The reason line.
- **One Go:** "Open today's packet", which is the home page's only flesh.
- In care mode it is replaced by the Care block (§7.21), as today.

### 7.11 Mood stamps (filters)

- Three stamps with 36 px mood glyphs and words: Restless, Heavy, Playful.
- Under them, "Start from how you feel" in 16 px.
- They are links to `/games?mood=…`, as today; on `/games` the current one shows chosen.
- A row of three at every width, each at least 104×88.

### 7.12 Dialogs and confirms

**Dialog ("note card"):**
- Every modal standardises on the native `<dialog>` with `showModal()`, as `CarryScreen.tsx` and `ThoughtPockets.tsx` already do, wrapped as `<NoteDialog>`. It uses `useModalDialog` for focus return. This migrates the 11 `role="dialog"` div implementations: FeedbackDialog, RequestThinkerModal, ThinkerPhoneBook, TimelessMinds, TimelessMindsKeptLines, IdeaLab, HardTalk and the Shapeshifter title and finale.
- **Anatomy:** a sheet with a 2 px rule-strong border and the dialog z-layer; an h2 title; body; an actions row with the Go (if any) last on the right, or full width on phones; a close icon stamp.
- **Scrim:** `--ink` at 40%, or 60% in dark, with no blur.
- **Motion:** enters with opacity plus 8 px rise in 280 ms, and leaves in 160 ms. Quiet uses opacity only.

**Inline confirm (preferred over modal for destructive actions):**
- The Careful button is replaced in place by a sheet that asks the question in words ("Clear the whole garden?").
- It offers two stamps: the safe choice first and focused ("Keep it"), then the destructive choice ("Yes, clear it") in the Careful style.
- This generalises the existing pattern in `CalmGarden.tsx`, `HardTalk.tsx` and `AccessibilityPanel.tsx`.
- Focus moves to the safe choice and returns to the trigger afterwards. Undo is offered where possible [COGA "avoid mistakes"].

### 7.13 Sensory dial

**Anatomy:**
- A 3-stop `radiogroup`. Visually it is a 96 px round "knob" stamp with a seed pointer at Quiet, Gentle or Lively.
- Three labelled stamps beneath it, which are the real radios.
- A one-line description of the current stop.

**Accessibility:** native radios, so arrow keys work and the screen reader says "How it feels, Gentle, 2 of 3".

**Motion:** the knob turns 160 ms (S1), or snaps in Quiet.

**Chrome entry point:** the header's `settings` stamp shows a tiny seed pointer at the current dial position. It is passive status, not a counter.

### 7.14 Header ("the counter top")

**Anatomy, inside the `--w-shop` width:**
- **Left:** the logo stamp, an inline SVG of a 24×16 two-ink slice that replaces the 212 KB PNG. Then the wordmark "VeryGoodMelon.Fun" in Bricolage 700, 20 or 24 px.
- **Right:** a "Games" nav link, then the settings icon stamp ("Open accessibility settings").
- Height 64 px, with a 1 px rule bottom border. The background is paper; there is no blur.

**Behaviour:** the header **scrolls away** rather than staying sticky. This gives phones and games more room and removes the `backdrop-blur` stacking workaround in `AccessibilityControls.tsx`. It stays in the same place on every page [WCAG22 3.2.3].

**Motion:** S1 only. The logo does not grow on hover (today's `group-hover:scale-110` is removed).

### 7.15 Footer ("the back of the packet")

**Anatomy, inside `--w-shop`, left-aligned in three short columns from 1024 and stacked below:**
1. **Talk to someone:** the "Need to talk?" link, largest in the footer (18 px, rind underline).
2. **Give** (§7.22): the donation slot, empty until the owner turns it on.
3. **The shop:** About, Thoughts, Privacy, Terms, Feedback, GitHub.

Then a printer's line: "Printed by ShakTech Labs · © 2026", in 14 px `--ink-soft`.

**Order is fixed:** talk, give, shop. Help is always first and in the same place [WCAG22 3.2.6].

### 7.16 Status and live regions (replacing toasts)

- `Toast.tsx`, `useToast` and the mounted `ToastContainer` are deleted, since nothing uses them.
- **`<StatusLine>`:** one `role="status"` (polite) per region. It is a 16 px `--ink-soft` line with an optional `done` or `note` stamp, kept at `min-height` so layout never jumps. It replaces the 25 ad-hoc implementations.
- Assertive (`role="alert"`) is reserved for failed sends that lose work.
- Messages stay until replaced. Nothing auto-dismisses on a timer [WCAG22 2.2.1].

### 7.17 Notices: gentle errors and empty states

**Note (`<Note tone="look" | "info">`):**
- A sheet with a 3 px seed (look) or rind (info) left edge, a stamp glyph and plain words: what happened, then the one thing to do.
- Example: "That didn't send. Your words are still here. Try again."
- It never blames, never uses red, never shakes, and never says "error", "AI" or "model".
- The AI-invisible rule extends to failures: "The thinker is quiet right now", never "the model failed".

**Empty state:** a 48 px stamp illustration, one h3 line, one line of body and at most one Stamp action.

**Error boundary** (`components/ErrorBoundary.tsx`, `app/global-error.tsx`):
- The same Note at page scale.
- The `again` and `home` stamps.
- Error details stay inside a `<details>` disclosure.

### 7.18 Loading ("seeds settling")

**Visual:** three 6 px pixel seeds in a row. They drop into place one after another, each 160 ms apart, repeating while loading. This is the one sanctioned chrome loop, because it reports a live process. It has `role="status"`, and its words are the label: "Getting it ready…".

**Wording over time:**
- At ≥8 s a second line appears: "Still working on it. Nothing is lost."
- There is no percentage and no timer.

**Quiet and reduced motion:** the three seeds show still, and the words carry the meaning.

**Usage:**
- For AI waits it sits **inside** the element that will be filled, so the layout does not move.
- `Loader2` spinners (3 files) and `LoadingSpinner` are removed.

### 7.19 Keepsake frame ("the print")

**On screen:** the canvas sits in a **print tray**:
- A `--flesh-wash` sheet with a deckled bottom edge (CSS mask), 22rem wide.
- The print itself has a 3 px paper edge.

**The actions:** a row of stamps (Save image, Share, Copy as text) with the `save`, `share` and `copy` stamps, plus the existing status line. The behaviour in `components/games/Keepsake.tsx` is unchanged.

**Reveal (S3):**
- The print slides down out of a slot line at the top of the tray, 1,600 ms, `--e-out`, with `snd-feed` in Lively.
- Then ink B settles into register (S2).
- Under reduced motion or Quiet: a 160 ms fade to the finished print.

**The image itself** (`lib/keepsake/*`):
- `PALETTES` in `lib/keepsake/render.ts` is replaced by `getInks()`.
- Keepsakes print on the new paper.
- Two-ink overprint is drawn by rendering ink-B shapes with `globalCompositeOperation = 'multiply'` (light) or `'screen'` (dark), offset by 1 art pixel.
- Grain comes from a seeded noise pass on the art grid only, never under words.
- Words use Atkinson and Bricolage.
- The coarse 6-unit `PIXEL` grid stays. It is the site's heritage, and printed pixels read as riso halftone.

**Testing:** `__tests__/lib/keepsake/contrast.test.ts` is extended to all six palettes and keeps its "every glyph over what lies beneath" method.

### 7.20 "Something gentle" suggestions and "Continue your journey"

**Gentle row (`GentleGames`):**
- Heading "Something gentle, if it helps", in h2 Atkinson 700 at 22 px, sentence case, not uppercase.
- Two `small` packets in the moss spot ink only.
- No tilt in care mode.

**Continue row:**
- Renamed "Another packet you might like".
- One `small` packet, shown under a rule at the foot of the game stage.
- Shown only outside care mode and after judgement has finished (logic unchanged).

### 7.21 Care block ("the lamp")

**Purpose:** what a visitor sees when words suggest danger, and on `/support`.

**Anatomy, in order (helplines first):**
1. A `--sheet` surface warmed to "lamplight": `--care-paper = color-mix(in oklab, var(--clay) 6%, var(--sheet))`. It passes with ink at ≥11:1 in the Light palette (verified in `tokens.test.ts`). The sheet has a 4 px rind left edge.
2. One lead sentence in 20 px Atkinson 400, for example "You don't have to hold this alone."
3. **The helplines as three large rows**, each a full-width ≥56 px target:
   - **Call or text 988** (US)
   - **Call 116 123** (UK and Ireland)
   - **Find a line near you**: findahelpline.com, an external link

   Each row has the `phone` or `globe` stamp and the number in Atkinson 700 at 22 px. The number is real text, so it is copyable. These reuse `HelplineSentence`'s data, moved into `lib/care/helplines.ts` so the sentence and the rows never disagree.
4. "You can stop whenever you like. They listen." in `--ink-soft`.
5. Only after that, the Gentle row (§7.20).

**Never in the care block:**
- Motion
- Spot-ink illustration
- Tilt
- Sound
- Flesh
- Any donation slot
- Counters
- The words "crisis" or "emergency" in headings

**Accessibility:**
- `<aside aria-label="Support">` (as `TimelessMindsCarePanel` does now).
- Focus is *not* moved there automatically. Moving focus there is jarring; the block is placed before the game's next content in reading order instead.

**Rule kept:** words are never celebrated before they are judged safe. `awaitingJudgement` suppresses every S2 and S3 effect, every print reveal and the Continue row. `useCareMode()` exposes the existing state, and the effect components read it.

### 7.22 Give block (future Palestine donations)

The give block is specified now and stays hidden until the owner supplies its content.

**Placement:**
- The footer's middle column (§7.15).
- One section at the end of `/about`, and an optional dedicated `/give` page.
- **Never** inside a game, an ending, a keepsake, a care block or care mode. While `care` is true, the footer column collapses to just "Talk to someone".

**Anatomy:**
- Heading: "Give, if you can", h2 or h3.
- One or two plain sentences naming the organisation(s) and what they do, chosen by the owner.
- One **Stamp** link per organisation, an external link with sr-only "(opens in a new tab)". It is not a Go, because giving is never pushed as "the" action.
- Optionally, one small two-ink stamp of an olive branch, decorative and `aria-hidden`.

**Rules:**
- No totals, progress bars, goals or "people gave today". These are counters, already banned.
- No urgency or guilt copy, no countdowns and no images of suffering.
- No pop-ups, and no repeat asks per visit.
- It is one quiet block in one place.

**Data:** `lib/give/config.ts` holds `{ enabled: false, organisations: [] }`. The component renders nothing while `enabled` is false.

### 7.23 KeyHints ("Keys" disclosure) and keycaps

- `<details>` with a summary stamp showing `keys` and "Keys". It is shown on fine-pointer devices or after a key press, as today (the logic in `KeyHints.tsx` is kept).
- Inside, each control is a line: `<kbd>` keycaps followed by plain words ("Space: place a seed").
- `<Keycap>`: a stamp-shaped 28 px-tall cap with a 2 px edge, Atkinson 600 at 14 px. The same component is used in the settings drawer's Keys section.
- Opens instantly (S0); the disclosure never animates height.

### 7.24 Sticky action tray (`StickyActionBar`)

Keeps its behaviour. Its look becomes a paper strip with a 1 px top rule, the tray z-layer and a 12 px top fade of paper (not blur). It holds at most the view's Go plus one Stamp.

### 7.25 Game strip and stage

Specified with the template in §8.2.

### 7.26 404 and offline

**404:**
- A 48 px stamp of an empty, opened packet.
- h1 "This packet is empty", then "Nothing grew here, and that's okay. Pick somewhere to go."
- A Go ("Back to the shop"), a Stamp ("All games") and the three Slow down `small` packets.
- `CareHelpline` behaviour is unchanged.

**Offline** (`app/offline/page.tsx`, served by `public/sw.js`):
- The 🍉 emoji, which renders differently on every OS, is replaced by the inline logo stamp.
- "The shop's lights are off", then "You're offline. Games you've opened before may still work here. The rest will be back when you reconnect."
- This page must not depend on fonts or CSS that the service worker has not cached, so it uses system fallback metrics and inline critical CSS. Verify `sw.js` precache in Phase 6.

---

## 8. Page templates

### 8.1 Homepage: "the seed rack"

This replaces the marketing-hero layout.

**At 390 px, top to bottom:**
1. Header.
2. **The shop sign:** the hero h1 "Small, quiet games for a busy mind" in Bricolage, left-aligned. Beneath it, the motto "Think deeply, feel lighter." in 18 px `--ink-soft`. No animation.
3. **Today's packet** (§7.10): a counter packet at 140 px wide beside its text. The Go is full width under it.
4. **Mood stamps** (§7.11).
5. **The rack: three shelves**, in fixed order Slow down, Reflect, Play. Each shelf has:
   - an h2 with the shelf glyph and shelf name, and a one-line description in `--ink-soft`;
   - a rule styled as a wooden shelf edge, a 6 px `--rule-strong` bar with a 2 px printed edge;
   - packets in a **two-column grid** (each about 165 px), so the 14 packets read as 3 + 7 + 4 on shelves instead of one 14-item list.
6. Footer.

**As built after the Phase 1 review (supersedes the column and rail layouts below):** the shelves are stacked full-width rows of at most 5 packets each (5 + 5 + 4, following the games' config categories). Packets are size containers whose titles clamp between 18 and 24 px, hooks wrap in full, and `--w-shop` is 100rem. On a phone with larger text there is one packet per row. The counter rail was dropped: the sign and today's packet always share one top-aligned band.

**At 1024–1599 px (original plan):**
- The sign and today's packet sit side by side in one band.
- The mood stamps sit right-aligned in that band.
- The rack becomes **three shelf columns** of 1, 2 and 2 packet widths, mirroring the shelves' sizes. Each shelf's packets flow within its own column, so a visitor scans by shelf, then by packet.

**At ≥1600 px (ultrawide):**
- The layout widens to `--w-shop` (1440 px) and no further.
- A left **counter rail** (360 px) holds the sign, today's packet and the mood stamps, `position: sticky` within the rack's height.
- The three shelves sit to its right.
- Beyond 1440, the paper (with grain) fills the edges, with nothing else there. Peripheral decoration at ultrawide edges is exactly the kind of irrelevant salience to avoid [FORSTER14][FISHER14].

**Why this is unique but scannable:**
- The grouping is visible as physical shelves, not just headings.
- Each packet is distinct through its ink and motif, but every packet has the same anatomy, so scanning is predictable [COGA][BOULTER14].
- The deterministic tilts make the rack look hand-stocked without randomness.

**Semantics:**
- `<section aria-labelledby>` per shelf, each with an `<ul>` of packets.
- The order matches the visual order at every width; the column layout uses CSS grid with no `order` tricks.
- The e2e region "Every game" becomes "The rack"; rename the test in the same commit.

**In care mode:** today's packet is replaced by the Care block, and the heavy games step aside (logic unchanged).

### 8.2 Game page: "the opened packet"

A single `<GameStage>` component replaces the 10 duplicated headers.

```
[Header]
[Game strip]   ← back: "The shop" · title (h1) · lead line · [Keys] [Sound] stamps (right; wrap under on phones)
[Stage]        ← sheet, max --w-stage (or full --w-shop for canvas games via `wide`), 2px rind edge, the game
[Tray]         ← optional sticky action tray (Go + one Stamp)
[After]        ← print tray (keepsake) · Care block if care · "Another packet you might like"
[Footer]
```

**The game strip:**
- Title in Bricolage h1.
- One lead line (≤2 sentences, the CLAUDE.md rule) in 22 px.
- The game's spot ink shows only as a 6 px band on the strip's left edge plus the shelf glyph. The chrome stays ink-only.

**Props:**
```ts
gameId
title
lead
wide?
keys?: ReactNode
sound?: boolean
```

`GamePageWrapper`'s current job (visit tracker, soundscape, suggestions) moves inside `GameStage`.

**Layout:**
- **On phones:** the stage is full-bleed (no side gutter) for canvas games, keeping the header and strip padded.
- **At 1440:** the stage is centred at 60rem, or wide at 90rem for The Gardener, The Shapeshifter and The Philosopher.
- **On ultrawide:** nothing grows past `--w-shop`. Canvas games letterbox on paper.

### 8.3 Content pages (About, Privacy, Terms, Support, Thoughts)

**A single `<Prose>` template replaces `LegalPage` and the inline variants:**
- h1, then an optional lead.
- Body at `--w-prose` (40rem, about 66ch at 18 px), left-aligned.
- h2 sections separated by 48 px with a `--rule` hairline.
- Links in the §7.2 style.

**Per page:**
- **About:** its "Give" section sits at the end (§7.22).
- **Support:** the Care block at page scale, then one Stamp link, "Or breathe slowly for a minute" (as today).
- **Thoughts:** the list of thoughts is a list of slips: sheets with a flap line, title, date in `--t-meta` and a one-line excerpt. The submit form uses the writing slip.
- **Privacy:** `SiteNumbers.tsx` keeps its published totals. They are allowed by the no-counters allow-list as transparency, and are styled as a plain table with no big numbers.

**Ultrawide:** prose never widens. The page shows paper beyond `--w-shop`, with the header and footer aligned to the shop edge.

---

## 9. Per-game application notes

For each game: its packet motif and inks, its chrome, and **its stimulating moment** (the one S2 or S3).

**Slow down (moss)**

1. **The Patient One** (`TheUnrusher.tsx`)
   - *Packet:* three seeds at rest in a cupped leaf; moss and seed inks.
   - *Chrome:* the stage is the plainest sheet on the site. The "minute for one small thing" uses a Stamp Go only at the start.
   - *Moment (S3):* when you stay still long enough, the seeds settle *into register* (ink B slides the last 1 px home) and a single `snd-ring` plays (Lively). Quiet: the seeds are simply settled. The `.animate-pulse-slow` and `.animate-float-seed` loops are kept as game content with the existing pause.
   - *As built (4a):* the moment cards are stamp cards that start a moment when pressed, so the menu has no Go; the Go is the writing moments' "Done" and the reward's "Continue slowing down". The seeds' ink B is a seed-ink edge printed one misregistration off until all eight rest, then it slides home once over 700 ms (Quiet already has no misregistration). No `snd-ring` yet, because the UI sound system of §5.7 is not built. The two loops moved into `TheUnrusher.module.css` and stay off in Quiet and under reduced motion.
2. **The Harmonist** (`BreathingPatterns.tsx`)
   - *Packet:* a melon slice with a breath-shape traced around it; moss and dusk.
   - *Chrome:* the pattern choice becomes a stamp row, "Begin" is the Go, and Pause, Mark and End are Stamps or Quiet in the tray.
   - *Art:* the breathing shape and melon keep their motion (functional loop with pause), re-inked through `getInks()` (10 hex values removed).
   - *Moment (S2 per breath, S3 at the end):* each finished breath stamps one seed into the slice. The final pattern prints as the keepsake.
   - *As built (4a):* game ink map: moss for the breath in, clay for the hold, dusk for the breath out, plus the melon's rind, a pale rind band, flesh and a dark seed picked per palette. The pattern choice is stamp cards (a stamp row on a phone, with the description under it) and the length a stamp row. The seed presses in over 700 ms. Quiet and reduced motion show the still guide, which changes once per phase. The opening of the kept melon uses the keepsake's own per-theme colours so it lands exactly on the picture.
3. **The Gardener** (`CalmGarden.tsx`, `calm-garden/draw.ts`)
   - *Packet:* a single poppy on a seed packet; moss and clay.
   - *Chrome:* `wide` stage. The plant palette is a stamp row of plant glyphs with names; Undo and Clear use Quiet and Careful plus the inline confirm.
   - *Art:* `draw.ts`'s 43 hex values become a 6-ink game map (leaf, petal-warm, petal-cool, earth, sky-day, sky-dusk) derived from moss, clay and dusk. The pixel look stays.
   - *Moment (S3):* "Sit with it", when the light shifts (`Sunset`). The light change is a cross-fade of the sky ink over 1,600 ms, never a flash; Quiet steps it instantly.
   - *As built (4a):* the six inks are `leaf` (moss), `petal-warm` (clay), `petal-cool` (dusk), `earth` (clay, darkened), `sky-day` (dusk into moss) and `sky-dusk` (dusk into clay); shades come from `shade` and `blend` in `components/games/calm-garden/inks.ts`. Sitting cross-fades the sky, ground and light inks over 1,600 ms, then the sun keeps sinking slowly over the 45 s sit as before; Quiet and reduced motion step to the finished light at once. In a dark theme the day is dimmed. The postcard keepsake still uses its own petal colours (Phase 5).

**Reflect (dusk)**

4. **The Sage** (`TimelessMinds.tsx` and family)
   - *Packet:* an open book with one leaf pressed in it; dusk and seed.
   - *Conceit (keep it):* the game is a **modern video call with someone from history**. The owner calls this one of its beauties, and commit 3cb01b7's "sitting room" restyle that dropped it was reverted. Phase 4c re-inks the call; it never replaces it with a room, a page or a plain chat. The call keeps:
     - **Tiles.** The thinker's large video tile with a **name label** (name and era) in its corner and a soft status pill ("Here with you", "Speaking", "Listening"). The visitor's own small **"You" tile** is a placeholder, never a camera. A speaking thinker gets a steady active-speaker ring, never a pulse.
     - **Control bar.** A row of round, labelled call controls under the tiles: Speak (mic), Voice (sound, off until chosen), Portrait (the video toggle), Menu (directory, kept lines, request, say goodbye), and a clearly labelled **Leave** pill that opens the goodbye dialog.
     - **Meeting chat.** An "In-call messages" side panel (below the tile on a phone) with sender names above each message, the imagined-conversation notice pinned at the top like a meeting's system note, and the message box at its foot.
     - **Connecting.** A brief "Calling {name}…" moment on the tile as each call opens. It is decorative, `aria-hidden` and never blocks typing; Quiet shows it as a still frame.
     - **House rules inside the conceit.** No call-duration clock, participant count or recording dot; no typing dots or "generating" text; no flashing; sound only when the visitor chooses it.
   - *Chrome:* the call stage is a deep dusk sheet in both themes. Tiles are `--well` frames and the control bar's buttons are icon stamps with labels, all in Seedpress ink. Leave is the one clay pill, never flesh. The chat panel is `--sheet` with meeting-chat bubbles. The visitor's bubbles are on the right, rind-wash with an ink "You" label; the thinker's are on the left, sheet with the name. The thinker chooser is a pre-call list of stamp cards. The care panel is the Care block inside the chat panel.
   - *Art:* duotone portraits (§6.3). The 27 hex values are removed.
   - *Moment (S2):* the first reply arrives with the portrait's second ink settling into register. Never a typing indicator (the "AI is generating" rule): `.typing-dot` is deleted, and replies use the Loading seeds inside the bubble.
   - *As built (4c):* the call is `TimelessMinds.module.css`, with the stage mixed from dusk and black (a deeper mix in the dark theme; black with white words in high and highest contrast), tiles as `--well` frames with a steady 4 px speaker ring drawn over the portrait, round icon stamps with a 3 px printed edge, and Leave as the one clay pill. The chat panel is `--sheet`; the message box is a one-line writing slip and Send is the view's one Go. The thinker chooser is a list of stamp cards with the thinker's duotone portrait. The care panel is the Care block inside the chat panel, kept to 26% of the height (at least 7rem) on a short screen and scrolling within itself. While a reply is on its way the Loading seeds sit in a thinker bubble, with no typing dots. The static portrait no longer breathes in a loop.
   - *Portraits (4c):* all 44 portraits are local PNGs in `public/games/timeless-minds/avatars`, so nothing is fetched. `scripts/duotone-avatars.mjs` writes two WebP plates per portrait and theme to `public/games/timeless-minds/portraits/{light,dark}`: the ink plate (ink on paper in light; the light ink on the dark paper in dark, so a face stays the light thing) and a dusk spot plate laid over its mid-tones. The spot plate sits 4 px off register until the first reply, then slides home over 700 ms (never off in Quiet, where `--misreg` is 0). Re-run the script after a palette change. The directory and the chooser use the same ink plates; the Simli and TalkingHead providers are re-inked (their LIVE badges and spinners are gone, since a recording dot is against the house rules).
5. **The Dilemma** (`HardChoices.tsx`)
   - *Packet:* a forked path stamped as two arrows; dusk and clay.
   - *Chrome:* the 12 choices are stamp cards (chosen = rind, never flesh). "Change my answer" and "Skip" are Quiet.
   - *Progress:* a row of 12 seed marks. Done ones are filled, the current one is ringed, and they carry no numbers or "of" wording. Seeds are place, not score. The row must pass `no-counters.test.ts`: it is `aria-hidden`, and the screen-reader text names the question, not its index.
   - *Moment (S3):* the closing "reading of what they protect" prints as the keepsake (three chosen values as stamps).
   - *As built (4c):* the two answers are stamp cards in a list (the card is the `li`, and the pick is the button inside it), chosen with a 3 px rind edge, a tick and the words "Your choice". The perspectives are plain words, no longer italic. The progress is twelve seed marks, aria-hidden, above the place in words ("Near the start"). The ending prints the reading line, then up to three values (`keptValues`) as stamps one after the other at 400 ms each, then the sky keepsake. "Previous" is a Stamp and "Change my answer", "Let this one pass" and "Revisit" are Quiet. "Look back from the start" is a Stamp, and the ending has no Go.
6. **The Final Word** (`LastWords.tsx`, `final-word-dusk` and `final-word-wax`)
   - *Packet:* a candle with a pixel flame; dusk and clay.
   - *Chrome:* the writing slip, with "Send" as the Go. `final-word-wax` moves into a game ink map (wax = clay-light).
   - *Moment (S2):* when the words are judged safe, the candle's flame is "printed" (not animated flicker; a single 700 ms settle). Before judgement nothing celebrates. If care triggers, the Care block replaces the moment.
   - *As built (4b):* the game ink map is in `LastWords.module.css`: wax is clay lifted toward the sheet, and the flame is clay with a clay-light core as its second ink. The candle is a 32 by 48 pixel print. The flame is lit and still while writing, and never flickers; once the words are judged safe, its core settles into register in one 700 ms press, and before that nothing marks the moment. In care there is no candle at all. "Blow out the candle" is the Go once the words are safe: the dusk fades in over 1,600 ms (a wash of the dusk ink on the light sheet, the deepest well on the dark one), the smoke rises over the same time, then the closing line and the keepsake arrive at 1,600 ms and 2,300 ms. Quiet and reduced motion show that end state at once. The old `final-word-dusk` and `final-word-wax` classes are gone from `globals.css`.
7. **The Awakening** (`FirstWords.tsx`)
   - *Packet:* a sun half-risen over a line; clay and dusk.
   - *Chrome:* the writing slip and Go. The steps are a stamp row of places ("Imagine", "Say", "Wake").
   - *Moment (S3):* the dawn, which already waits for safe words (commit `e3543df`). It becomes a 1,600 ms sky cross-fade from dusk to clay with no brightness pulse. Quiet goes straight to dawn.
   - *As built (4b):* the places row is "Imagine" until the words are spoken, "Say" while they are heard and the plan is written, and "Wake" once awake. The sky is three layers over a night layer that is always opaque: the dawn (dusk into clay) fades in over it when the words are judged safe, in 1,600 ms, and the morning (pale clay) fades in over that on waking, in 700 ms. Layers only ever fade in, so no cross-fade dips toward the page and nothing pulses; the old `sunrise-glow` is gone. The kitchen table and the note are game ink, wood and paper mixed from clay with black and white, with a printed-edge shadow instead of a blurred one. In care and for unjudged words there is still no sky.
8. **The Arena** (`MindDebate.tsx`, `ArenaPairingDeck.tsx`)
   - *Packet:* two facing profiles with overprinted colours where they overlap; dusk and clay.
   - *Chrome:* pairing uses stamp cards; the two voices use `voiceA` (dusk) and `voiceB` (clay). Each voice is always labelled by name, not just colour.
   - *Moment (S2):* "what each got right". The two summaries stamp in, one after the other (not simultaneously, per choreography rule 2).
   - *As built (4c):* `voiceA` and `voiceB` are dusk and clay, set once on the Arena's root (`Arena.module.css`) and also read by the keepsake through `ARENA_VOICE_COLOURS`, which now comes from the palettes. Each voice keeps its side, its written name and its round or diamond mark. Pairings are stamp cards with the `done` stamp and the word "Chosen" top right; a pairing written by hand gets the melon printed in the speaker's own ink. The first summary stamps in over 280 ms and the second waits 700 ms. The six-mark progress row is seed marks. The tray is one Go (Next turn, Continue, the way on, or New debate at the end) with at most one Stamp (Stop, or Surprise me), and New debate is Quiet otherwise. The care phase is the Care block.
9. **The Plain Speaker** (`HardTalk.tsx`, `hard-talk/*`)
   - *Packet:* a doorway with a single line of light; moss and ink.
   - *Chrome:* the steps (settle, find words, walk in) are stamps. The "Carry on where I was" and "Start fresh" pair is Go plus Stamp. `ThresholdArt` is re-inked.
   - *Moment (S2):* the carried line is printed onto a small card in the Carry screen dialog.
   - *As built (4b):* the three stages keep their words ("Settling in", "Finding your words", "Nearly there") as a row of places; Next is the Go and Skip a Stamp, with Back and Start over Quiet in the tray. Choices are stamp cards, chosen with a tick and a rind edge. `ThresholdArt` is a moss door in an ink frame with clay light, and the envoy keeps its melon. The Carry screen is a `NoteDialog` ("Your line to carry in") with Done as a Stamp, and its line rises onto a small printed card in 700 ms (still in Quiet); the wake lock is kept.
10. **The Keeper** (`WorryCapsule.tsx`, `Keeper.module.css`, 374 lines)
    - *Packet:* a sealed jar with a paper label; clay and rind.
    - *Chrome:* the writing slip plus "Seal the jar" Go. Its CSS module moves its colours onto system tokens and keeps its layout.
    - *Moment (S3):* the seal. The lid presses down as an S2 stamp, then a paper label prints with the date. When opening later, "see how it turned out", the label simply reads; no reveal theatrics on worries.
    - *As built (4b):* sealing is one 1,600 ms beat: the lid presses down (600 ms), a paper label prints with the day it was sealed (700 ms, from 600 ms), and the words settle in from 1,300 ms; Quiet and reduced motion show the sealed jar at once. The wax seal is gone, so the label is the only mark on the jar, and sealed jars on the shelf show their dates as words beneath, as before. Opening only shows the opened jar and the worry, with no unfolding; answering prints the new jar's label in 700 ms on a shelf where it already stands. The fold, drop and travel of the old scenes are removed, and so is the three-frame still. The care Support block is the Care block, and sealing in care is a Stamp or Quiet, never a Go.

**Play (clay)**

11. **The Optimist** (`HopeDaily.tsx`)
    - *Packet:* a folded newspaper with one blank word; clay and rind.
    - *Chrome:* the word input is a writing slip of one line, with "Try this word" as the Go. Wrong guesses get a "look" note ("Not this one. Here's a hint…"), never red or shake.
    - *Moment (S2):* the missing word drops into the sentence with a 700 ms press, then seeds settle beside it. No "solved in N tries" (already banned).
    - *As built (4d):* the slip is one line with its hint above it and the Go beside it, now named "Try this word" (it was "Try it"; the e2e and the live-region line follow). A guess that is not the word, a short guess and a failed send are look notes in the live region; "The story unfolds a little more" and the like stay plain rind notes. "Tell me the word" is Quiet and asks through the inline confirm, with "Keep playing" first. The letters still drop into the heading slots in turn (60 ms apart, as before); once the last one has landed the missing word presses into its sentence over 700 ms, then three rind seeds settle beside it one after another. The part arrivals and the ending's parts are a 350 ms fade through `--motion`, so Quiet and reduced motion show everything at once.
12. **The Alchemist** (`IdeaLab.tsx`, `idea-lab/*`)
    - *Packet:* a flask with a single bubble; clay and seed.
    - *Chrome:* the ingredient cabinet uses stamp cards, and "Mix" is the Go.
    - *Art:* the "gold" ink `#c98a1b` (`lib/keepsake/render.ts`) becomes **brass**, a darker, lower-chroma ochre derived from clay, avoiding yellow [VM94][GM16].
    - *Moment (S3):* the letter at the end prints as the keepsake.
    - *As built (4d):* **The second tap still combines at once; there is no Mix button and the lab view has no Go.** The flow is the original one (pick two concepts and the pair is mixed), so the plan's "Mix is the Go" is deliberately not built: it would have added a tap to every mix. The only Go on the page is the intro's "Begin Exploring". Concepts are stamp cards (a chosen one has a rind edge thickened inwards and a tick badge, so choosing never moves it; a gold has a brass edge and the word "gold"). Brass is a new role in `lib/design/tokens.ts` (clay turned to a low-chroma ochre, 4.5:1 on every surface in all six palettes, within the chroma cap, and under 0.6 of its Gentle chroma in Quiet). The keepsake `gold` stays one colour on both papers, so it blends the light and dark brass (65% light) to hold about 4:1 on either paper. The letter's lines print in 140 ms apart (the whole sheet over about 1.9 s) and appear at once in Quiet; "Begin the Second Work", "Keep wandering" and the shelf's letter buttons are Stamps.
13. **The Philosopher** (`app/games/thought-pockets/**`)
    - *Packet:* a playing card with a thought bubble; dusk and flesh as art (4d: redrawn as one card, a diamond on its face and a thought bubble rising from it, the bubble's thought in flesh).
    - *Chrome:* `wide` stage. The `--tp-*` layer stays as the game's ink map, re-pointed:
      - `--tp-paper` → sheet
      - `--tp-accent` → flesh (only "Play card")
      - `--tp-warn` → seed (not red)
      - `--tp-evidence` → moss, `--tp-logic` → clay, `--tp-rhetoric` → dusk, `--tp-guard` → rind
    - *Card types:* card type is always shown by glyph and name too (the existing `TYPE_COLORS` left border gets a type glyph).
    - *Combat numbers:* they stay, as allow-listed rules.
    - *Moment (S2):* a played card stamps onto the table. A defeated bias's card fades and its ink separates, as two inks drifting 4 px apart (S2, once).
    - *As built (4d):* `--tp-*` points at roles as listed, plus `--tp-mark` (rind), which carries every "chosen", "current" or "you are here" mark that used to be the accent, and `--tp-on-mark`. Flesh (`--tp-accent`) is only the view's Go: End turn in a fight, and the one next step on each other screen (Continue, Leave the shop, Rest, Begin, the end screen's best next move). The Guard type edge is brass (rind is the mark for "chosen" and "current", so no type edge can read as a selection). Everything else that was `primaryButton` (relic Take and Buy, the boss pair "Face ...") is a Stamp, and End turn becomes a seed-edged Stamp when it would be a certain loss. The enemy's Resolve bar is seed, the player's is moss, and the bias emblems' red, yellow and blue are clay, brass and dusk. Every step in the argument, the walk's list, the replay and the deck carries its type's glyph and, to a screen reader, its name beside the edge colour (`TypeMark`). A played card's step stamps in over 700 ms (`tp-stamp`, which also replaced the old deal and arrive); a defeated bias fades to 60% with a 4 px clay and dusk drop-shadow pair drifting apart over 1,600 ms, once. Quiet stops the older motion (recoil, shake lines, bursts, rings) the same way reduced motion does, and `tp-hurt` washes seed, not clay. Uppercase and tracking labels are plain words; italic flavour is upright.
14. **The Shapeshifter** (`app/games/the-mutation/**`)
    - *Packet:* an orb trailing a line; every spot ink. *(4d: the orb is clay-and-dusk print with a rind core, trailing a dotted line of separate moss, dusk, clay and rind marks.)* It is the site's **Lively showcase**, but still within chroma limits.
    - *Chrome:* the title and finale screens become `NoteDialog`s; the mechanic icons become the 11 Shapeshifter stamps.
    - *Art:* `palette.ts` reads `getInks()` instead of raw tokens, and `--melon-yellow` and `--melon-orange` become clay and brass.
    - *The arcade screen (its signature, keep it):* play happens on a deep dark CRT field in every theme, framed like a screen in a bezel (`app/games/the-mutation/screen.css`). The stage redefines the colour tokens as neon inks (each ≥7:1 on the field), so the canvas and the title, pause and rule cards drawn over it share them. The orb, clues, shadows, stars and gems carry a soft neon glow from cached halo sprites (only the orb gets a live `shadowBlur`), and still scanlines with a vignette lie over the glass as a CSS overlay. The Phase 4 restyle sets this screen **inside a Seedpress bezel**: the bezel becomes a sheet-and-rule frame in the counter's inks, the glass stays dark, and the neon inks become `getInks()`'s spot inks lifted for a dark field. Quiet (and reduced motion) halves the glow through `--game-screen-neon`; high contrast lifts words to white and takes the scanlines off. **Never** bring back what `cb6473a` removed on purpose: screen shake, glitch jitter, countdowns or timers, multipliers or other visible numbers, and any flicker (nothing brightens faster than a slow fade or pulses above 3 Hz; the scanlines never move).
    - *Moment (S3, once per new rule):* the rule-change "bloom". It is capped to one region, has no flashing (luminance change ≤10% per frame and well under three changes per second), and is replaced by a still rule card in Quiet.
    - *As built (4d):*
      - **Inks.** `engine/palette.ts` builds the glass from `getInks('dark', sense, contrast)`: the field is the dark `well`, text is the dark `ink`, and each spot ink is lifted toward that ink until it holds 7:1 on the field (a unit test holds every ink to it in Gentle, Quiet and High). Orb and gem edge are rind, gems moss, shadows dusk, stars and lights brass with clay edges, tides clay, the ring and the bloom seed. `useScreen` reads the dark palette for the current sense and contrast and the stage sets the same inks as `--game-screen-*`, so the canvas and the cards cannot drift apart; `withAlpha` is `color-mix`. The raw hex that screen.css held is gone.
      - **Bezel.** The glass sits inside `.shapeshifter-bezel`, a sheet-and-rule frame with a printed edge; the finished game is printed on the site's paper inside its own sheet frame, as before. Focus on the glass is the brass-lifted star ink.
      - **Chrome decision.** The title, pause, rule and finale screens are **not** NoteDialogs: Phase 3 kept them as part of the arcade conceit and they stay so, in the pixel face, with capitals and letter-spacing only there. BEGIN, RESUME and PLAY AGAIN keep their words; on the glass the Go is the dark palette's flesh with its own words, and on the finale paper it is the ordinary `sp-go`. Italics are gone from the rule and finale cards.
      - **Bloom.** The rule card's wash is one radial wash of the orb ink behind the card, fading in over 1,600 ms (one change, never a pulse) and staying; it is keyed to the rule, so it plays once per new rule, follows the glow's strength, and is hidden in Quiet and under reduced motion, leaving the still rule card. The card and the screens arrive in a 400 ms fade through `--motion`.
      - **Kept.** The cached halo sprites and the live blur on the orb alone, the still scanlines and vignette (taken off in high contrast), the self-hosted pixel face, `window.__cascadeState`, and the ban on shake, jitter, timers, visible numbers and flicker.

---

## 10. Architecture

### 10.1 Where things live

```
lib/design/
  tokens.ts          ← single source: palettes (6), type, space, radii, motion, z, sound params
  inks.ts            ← getInks(theme, sense, contrast) for canvas and SVG; useInks() hook (generalises the-mutation useScreen)
  sense.ts           ← useSense(): { sense, reducedMotion, motionScale } from <html> data attributes
  print.ts           ← canvas helpers: two-ink overprint, misregistration, grain
lib/care/helplines.ts
lib/give/config.ts
scripts/
  build-tokens.mjs   ← writes app/styles/tokens.css from tokens.ts (committed output)
  check-design.mjs   ← replaces check-red-states.mjs (check:red stays as an alias)
app/
  fonts/             ← AtkinsonHyperlegibleNext-wght.woff2, BricolageGrotesque-display.woff2, OFL.txt ×2, README
  styles/tokens.css  ← generated custom properties per [data-theme][data-contrast][data-sense]
  styles/base.css    ← element defaults, focus, prose, reduced-motion net
  styles/motion.css  ← keyframes (≤8), [data-sense] → --motion, --misreg, --grain, --tilt
  globals.css        ← @import "tailwindcss"; @import the three; @theme mapping (below). Target ≤250 lines total (today 1,421)
  press/page.tsx     ← specimen page (Phase 1 preview), noindex
components/seedpress/
  Go.tsx Stamp.tsx QuietButton.tsx Careful.tsx IconStamp.tsx buttonClass.ts
  Link.tsx Field.tsx WritingSlip.tsx ChoiceCard.tsx Switch.tsx StampRow.tsx Slider.tsx SenseDial.tsx
  Sheet.tsx Packet.tsx CounterPacket.tsx MoodStamps.tsx Rack.tsx
  NoteDialog.tsx InlineConfirm.tsx StatusLine.tsx Note.tsx EmptyState.tsx Loading.tsx
  Keycap.tsx KeyHints.tsx StickyTray.tsx GameStage.tsx Prose.tsx
  CareBlock.tsx GentleRow.tsx GiveBlock.tsx PrintTray.tsx
  icons/glyphs.ts icons/Icon.tsx
  packets/<game-id>.tsx   ← 14 two-ink illustrations
```

**The Tailwind v4 mapping.** Tailwind remains the utility engine, with its defaults switched off so only system values exist [TW-THEME]:

```css
@import "tailwindcss";
@import "./styles/tokens.css";

@theme {
  --color-*: initial; --shadow-*: initial; --radius-*: initial; --font-*: initial;
  --ease-*: initial; --animate-*: initial; --text-*: initial; --drop-shadow-*: initial; --blur-*: initial;

  --color-paper: var(--paper); --color-sheet: var(--sheet); --color-well: var(--well);
  --color-ink: var(--ink); --color-ink-soft: var(--ink-soft);
  --color-rule: var(--rule); --color-rule-strong: var(--rule-strong);
  --color-rind: var(--rind); --color-rind-wash: var(--rind-wash);
  --color-flesh: var(--flesh); --color-flesh-press: var(--flesh-press); --color-on-flesh: var(--on-flesh); --color-flesh-wash: var(--flesh-wash);
  --color-seed: var(--seed); --color-moss: var(--moss); --color-dusk: var(--dusk); --color-clay: var(--clay);
  --font-body: var(--font-atkinson), system-ui, sans-serif;
  --font-display: var(--font-bricolage), var(--font-atkinson), system-ui, sans-serif;
  --radius-sheet: 14px; --radius-stamp: 10px; --radius-slice: 999px;
  --text-meta: .875rem; --text-small: 1rem; --text-body: 1.125rem; --text-lead: 1.375rem; --text-h3: 1.5rem;
  --ease-out: cubic-bezier(.22,1,.36,1); --ease-stamp: cubic-bezier(.3,1.35,.5,1);
}
```

Spacing keeps Tailwind's 4 px `--spacing` base, which already matches §5.3.

**Transition aliases (Phase 2 to Phase 7 only).** Old names map onto new values so untouched game code re-inks immediately and safely:

| Old | New |
|---|---|
| `--background` | `--paper` |
| `--foreground` | `--ink` |
| `--card-bg` | `--sheet` |
| `--card-border` | `--rule-strong` (fixes 1.17:1) |
| `--hover-bg` | `--rind-wash` |
| `--primary`, `--primary-light` | `--ink`, `--ink-soft` |
| `--accent`, `--accent-hover`, `--danger`, `--melon-red` | `--flesh`, `--flesh-press`, `--seed`, `--flesh` |
| `--melon-green`, `--success`, `--chosen`, `--chosen-line`, `--focus-ring` | `--rind`, `--rind`, `--rind-wash`, `--rind`, `--focus` |
| `--melon-purple`, `--melon-indigo` | `--dusk` |
| `--melon-teal`, `--melon-emerald`, `--melon-blue` | `--moss` |
| `--melon-orange`, `--melon-yellow`, `--warm` | `--clay` |
| `--melon-pink` | `--flesh` |

They lived in `styles/legacy-aliases.css`, which Phase 7 deleted.

### 10.2 Enforcement

| Guard | What it checks | Where |
|---|---|---|
| **Tailwind defaults reset** | Default colours, shadows, radii, fonts, eases and animations do not exist, so `bg-gray-100`, `shadow-lg` and `rounded-lg` generate nothing [TW-THEME]. | `app/globals.css` `@theme` (Phase 7; partial from Phase 2) |
| **`check:design`** (`scripts/check-design.mjs`, run by `qa` and CI; replaces `check:red`, which is kept as an alias) | See the full rule list below. | `components/`, `app/`, `lib/` |
| **ESLint** `no-restricted-imports` | `lucide-react`, `next/font/google`, `@radix-ui/*`, `@headlessui/*`, `@mui/*`, `@chakra-ui/*`, `daisyui`, `class-variance-authority`, `shadcn*`, `framer-motion`/`motion`. The rule's message points to `components/seedpress`. | `eslint.config.mjs` |
| **`tokens.test.ts`** | Every role pair in §5.1 meets its minimum in all six palettes, plus `--care-paper`. Paper OKLCH C ≤ 0.02. Only flesh exceeds C 0.12. Quiet chroma ≤ 0.6× Gentle's. | `__tests__/lib/design/` |
| **`tokens-css.test.ts`** | `app/styles/tokens.css` equals `build-tokens.mjs` output, so there is no hand-editing drift. | `__tests__/lib/design/` |
| **`glyphs.test.ts`** | Every icon is 12×12 and uses only `.` and `X`; every icon name is used. | `__tests__/components/seedpress/` |
| **Keepsake contrast** (extended) | Every glyph meets 4.5:1 over what lies beneath it, in all six palettes. | `__tests__/lib/keepsake/contrast.test.ts` |
| **`no-counters.test.ts`** (extended) | Scans `components/seedpress` too. | existing |
| **e2e `expectOneGo(page)`** | At most one visible `[data-go]` per `main` and per open `dialog`, at each tested state. | `__tests__/e2e/helpers/design.ts`, called in site-shell and every game spec |
| **e2e `expectStillCare(page)`** | With care mode on: no running CSS animations (`document.getAnimations().length === 0` in the Care block), no `[data-go]` inside it, no `GiveBlock`. | site-shell and the writing games' specs |
| **e2e axe** | Existing axe runs gain `target-size` and run under `[data-sense=quiet]` and dark too. | existing helpers |

**The `check:design` rules:**
1. Raw colour in TSX or TS outside `lib/design/**`: `#rgb`/`#rrggbb`, `rgb(`, `rgba(`, `hsl(`, `oklch(`.
2. Arbitrary colour utilities: `-[#…]`, `-[rgb…]`, and `-[var(--x)]` where `x` is not a system or game-ink token.
3. Tailwind palette class names: `gray|slate|…|rose-\d+`.
4. Banned utilities: `italic`, `uppercase`, `tracking-*`, `font-light`/`font-thin`/`font-extralight`, `shadow-*` (except `shadow-none`), `blur-*`, `backdrop-blur*`, `animate-*` not defined in `motion.css`, `infinite` outside game folders.
5. **The flesh rules:** the existing red-state rules re-targeted at `flesh|flesh-press|flesh-wash` plus the legacy names, `text-flesh` anywhere, and `<Go` inside a file that also renders `role="radio|checkbox|switch|tab"` on the same element.

**The debt file.** `scripts/design-debt.json` lists current violations by file and count. The checker fails if any count *rises* or a new file appears, and it reports shrinkage. Phase 7 requires the file to be empty.

**The flesh rule (replacing "red is reserved for primary actions"):**
- Flesh fills the single go-action of a view.
- It never marks state, never colours text or links, and never signals an error.
- Errors and warnings use seed ink with a glyph and words.
- Game art and keepsakes may use flesh as the colour of melon flesh. That art layer is outside `components/seedpress` and is excluded by path, as today.

### 10.3 Stopping drift back to defaults

1. **The defaults are deleted, not discouraged.** The Tailwind namespace reset and the ESLint import bans make the generic path fail to build or render.
2. **The agent instructions are rewritten in Phase 1.** `.claude/CLAUDE.md` "Design System Quick Reference" is replaced by a 20-line Seedpress summary pointing at this plan and `components/seedpress`. That covers tokens, the flesh rule, no italics or caps, the stimulation levels, "never raw hex" and "use GameStage". `docs/DESIGN_PHILOSOPHY.md` "Visual Design" gets the same pointer. Agents write most code in this repo, and they follow these files.
3. **The specimen page `/press` stays forever.** It renders every component in every state, palette and sense, and visual snapshots of it are the regression net. Comparing a new component against it is the review step.
4. **The debt ratchet** (§10.2) means the system can only gain ground.
5. **Every new game must ship** a packet illustration, a game ink map and its stimulating moment written into §9 before its first commit. This becomes a line in `.claude/CLAUDE.md`'s "Before Building a Game".

---

## 11. Migration plan

**Ground rules:**
- Trunk-based: each commit goes straight to `main`.
- Each phase is a short series of commits. Every commit passes `npm run qa` and the existing CI (about 25 min).
- Accessible names used by e2e tests do not change unless the copy change is intended. Where one does, the test changes in the same commit.
- The rollback for any phase is `git revert` of its commits. No database or data migrations are involved; the settings migration reads old keys and writes new ones without deleting old ones until Phase 7.

**No global feature flag.** Phase 1 proves the concept on a separate route (`/press`) on production, so the owner judges real pixels without risking the live site. From Phase 2, surfaces switch whole. The alias layer means unconverted games re-ink safely rather than looking broken.

**Visual-check strategy:**
- Generate **Linux** baselines in CI with `--update-snapshots` as an artifact, then commit them. The darwin-only snapshots are deleted.
- Run `__tests__/visual` as a **separate workflow** on push (not inside the 25-minute QA job). It is non-blocking until Phase 7, then blocking.
- Snapshot set per phase:
  - `/press`
  - `/`, `/games`
  - one game per converted batch
- Snapshot matrix: 390, 1440 and 2560 widths × Light, Dark and Light-Quiet, with reduced motion forced so frames are stable.
- **Lighthouse:** add `push: branches: [main]` and a nightly `schedule` to `.github/workflows/lighthouse.yml`. Add `/press` and one game per shelf to `lighthouserc.json`, and raise performance to `error` at 0.90 from Phase 2.

### Phase 0: Groundwork (S)

No visual change.

**Changes:**
- Add `lib/design/tokens.ts`, `scripts/build-tokens.mjs`, `tokens.test.ts` and `tokens-css.test.ts`.
- Add `scripts/check-design.mjs` in ratchet mode with `design-debt.json`; `check:red` becomes an alias.
- Add the ESLint import bans as warnings.
- Fix the Lighthouse triggers; replace the darwin snapshots with Linux baselines.
- **Delete dead code:**
  - `components/ui/{Card,Modal,Input,Badge,Toast,EmptyState,ErrorState,LoadingSpinner,WatermelonLoader,Watermelon,PageTransition,PointsDisplay,CharityTracker,OrganicBlob,Divider}.tsx`
  - `lib/hooks/useToast.ts`
  - the `ToastContainer` mount
  - their tests in `__tests__/components/ui/*` and `__tests__/accessibility/components.a11y.test.tsx` (rewritten against the remaining components)
  - about 15 unused global classes
  - the `class-variance-authority` dependency

**Files:** `lib/design/*`, `scripts/*`, `eslint.config.mjs`, `package.json`, `.github/workflows/*.yml`, `lighthouserc.json`, `components/ui/*`, `app/layout.tsx`, `app/globals.css`, `__tests__/**`.

**Risk:** low. Deleted components are proven unused by the import audit; re-run `grep` and `tsc` before deleting.

### Phase 1: Proof slice at `/press` (M). **The owner judges here before anything else proceeds.**

**What ships:**
- `app/press/page.tsx` (noindex, linked nowhere). It contains:
  - The specimen: palettes with live contrast labels, type scale, every button state, links, a field, a switch, a stamp row and the sense dial.
  - **The full new homepage rendered at `/press/home`**, with header, sign, today's packet, mood stamps, three-shelf rack using real packet illustrations for at least 6 games (placeholders as one-ink silhouettes for the rest) and the footer.
  - A sense-dial switcher that sets `data-sense` for the session.
- **Fonts:** `app/fonts/*` plus `next/font/local`, applied only within `/press` via a wrapper class.
- **Tokens CSS:** scoped under `.press` for this phase only.
- **Components:** the first 14 glyphs, `Go`, `Stamp`, `QuietButton`, `Link`, `Packet`, `CounterPacket`, `MoodStamps`, `Rack`, `SenseDial` (UI only), and `Header`/`Footer` variants in `components/seedpress`.
- **Agent instructions:** `.claude/CLAUDE.md` and `docs/DESIGN_PHILOSOPHY.md` pointers (§10.3).

**Files:** `app/press/**`, `app/fonts/**`, `app/styles/tokens.css`, `components/seedpress/**` (above), `public/press/grain.png`, `public/press/halftone.svg`, `.claude/CLAUDE.md`, `docs/DESIGN_PHILOSOPHY.md`, `__tests__/e2e/press.e2e.test.ts` (axe at 390, 1440 and 2560, dark and quiet, plus `expectOneGo`).

**Owner sign-off checklist:** see §12.3. The questions in §13 are answered here.

**Risk:** low, as it is isolated. Font licence files must ship. Check LCP on `/press/home` against `/`.

### Phase 2: Flip the shell (M)

**What ships:**
- Tokens go global, with the legacy aliases.
- Fonts go global; Quicksand and `next/font/google` are removed.
- New `Header`, `Footer`, `/` (the rack), and `/games` (the rack with mood filter).
- The settings drawer is restyled, with the sense dial, Spacing setting, `data-sense` and `data-spacing` in the boot script, and the preset migration.
- `AmbientParticles` and the homepage stagger are deleted.
- The logo PNG is replaced in the header (it is kept for OG images and the manifest).
- Tailwind reset of `--shadow-*`, `--radius-*` and `--font-*` only.

**Files:**
- `app/layout.tsx`, `app/globals.css`, `app/styles/*`, `app/page.tsx`, `app/games/page.tsx`
- `components/home/*` (folded into seedpress), `components/games/GameDirectory.tsx`, `GameCardShowcase.tsx` (becomes Packet)
- `components/ui/{Header,Footer,AmbientParticles}.tsx`
- `components/accessibility/AccessibilityPanel.tsx`
- `lib/accessibility/boot-script.ts`, `types/accessibility.ts`, `lib/hooks/useAccessibility*`
- `__tests__/e2e/site-shell.e2e.test.ts`, `__tests__/accessibility/*`, `__tests__/visual/*`

**Risk: the highest of all phases.** It is global and every page re-inks.
- *Mitigations:* the aliases; all 17 e2e specs plus axe colour-contrast run on it; one-commit revert.
- Watch for game surfaces that hard-code `text-white` on `bg-accent`. The dark `!important` overrides in `globals.css` lines 70–184 are kept until Phase 4 for that reason.

### Phase 3: Shared game chrome (M)

**What ships:**
- `GameStage` on all 14 game pages, replacing `GamePageWrapper` and the 10 pasted headers.
- `KeyHints` and `Keycap`; `StickyTray`; `StatusLine` (replacing the 25 ad-hoc implementations); `Note`; `Loading`.
- `NoteDialog` (migrating the 11 `role="dialog"` divs) and `InlineConfirm`.
- `CareBlock` and `GentleRow` (`CrossGameSuggestions`, `CareHelpline`, `TimelessMindsCarePanel` and `HelplineSentence` all use `lib/care/helplines.ts`).
- `PrintTray`, framing the existing canvas.
- The full icon set; `lucide-react` is removed, and its ESLint ban becomes an error.
- `expectOneGo` and `expectStillCare` are added to every game spec.

**Files:**
- `app/games/*/page.tsx` (14), `components/games/{GamePageWrapper,CrossGameSuggestions,CareHelpline,HelplineSentence,TimelessMindsCarePanel,Keepsake,FeedbackDialog,RequestThinkerModal,ThinkerPhoneBook,TimelessMindsKeptLines}.tsx`
- `components/FeedbackDialog.tsx`, `components/ErrorBoundary.tsx`, `app/global-error.tsx`
- `components/ui/{KeyHints,StickyActionBar}.tsx`
- every file importing lucide (31)
- `__tests__/e2e/*.e2e.test.ts`

**Risk:** medium. Dialog migration changes focus behaviour, so each dialog's e2e must cover open, Esc and focus return. The care paths are the highest-stakes part; their existing e2e coverage (`final-breath`, `first-breath`, `ancient-voices`, `the-arena`, `the-threshold`, `the-slow-post`) must stay green unchanged.

**As built (3a to 3c):**
- `GameStage` is on all 14 games with `KeyHints`/`Keycap`, `StickyTray`, `StatusLine`, `Note` and `Loading`; the game pages' own headers and `GamePageWrapper` are gone.
- The modal dialogs run on one native `NoteDialog`, with `InlineConfirm` for the small yes-or-no asks. Deviation: the Shapeshifter keeps its own pause and rule cards, because they are part of its arcade screen (Phase 4 re-inks them inside the bezel).
- `CareBlock` and `GentleRow` read one source, `lib/care/helplines.ts`. Deviation: a game that renders its own support after it triggers care (the Worry Capsule, Mind Debate, the Plain Speaker, the Sage's parting words) says so through `OwnSupportProvider`, and the page then does not add a second shared `CareBlock`. The helplines show exactly once per page.
- `PrintTray` frames the keepsake canvas. Errors are a gentle `Note`, never a red alert.
- Icons: 34 new seed stamps (pause, stop, hand, mic, camera, hang-up, people, library, dice, reset, undo, trash and the Shapeshifter's eleven rule marks among them) joined the original set, so `lucide-react` is uninstalled and its ESLint ban is an error. The mic and camera "off" stamps are the same drawing with a slash. Send reuses `next`, and `Icon` takes only whole multiples of the 12-cell grid (12, 24, 36, 48): 12 beside small text and in small badges, 24 for buttons and menu rows. The Mind Debate's two spinning loaders were dropped: the words beside them already say what is happening.
- `data-go` marks every go-action, not only `<Go>`: the legacy `Button variant="primary"` renders it, and the hand-rolled flesh buttons in games carry it, so `expectOneGo` can fail on a second flesh button. Any it found were demoted to secondary.
- `expectOneGo` runs at the first screen and at least one later state in every game spec. `expectStillCare` (in `helpers/design.ts`) runs wherever a spec reaches care: site-shell, the writing games, the Sage, the Arena, the Plain Speaker.

### Phase 4: Games, in four batches (L overall; each batch M)

Each batch converts the buttons and choice cards to seedpress, moves art onto `getInks()` and game ink maps, adds the packet illustration and builds the §9 stimulating moment with its Quiet and reduced-motion equivalents. Each batch removes its files from `design-debt.json`.

| Batch | Games | Main files |
|---|---|---|
| **4a** | Patient One, Harmonist, Gardener | `TheUnrusher.tsx`, `BreathingPatterns.tsx`, `CalmGarden.tsx`, `calm-garden/draw.ts` |
| **4b** | Final Word, Awakening, Keeper, Plain Speaker | `LastWords.tsx`, `FirstWords.tsx`, `community-words/*`, `WorryCapsule.tsx`, `worry-capsule/*` incl. `Keeper.module.css`, `HardTalk.tsx`, `hard-talk/*` |
| **4c** | Sage, Arena, Dilemma | `TimelessMinds*.tsx`, `ThinkerPhoneBook.tsx`, `avatars/*`, `MindDebate.tsx`, `ArenaPairingDeck.tsx`, `lib/games/arena-pairings.ts`, `HardChoices.tsx`, `scripts/duotone-avatars.mjs` |
| **4d** | Optimist, Alchemist, Philosopher, Shapeshifter | `HopeDaily.tsx`, `IdeaLab.tsx`, `idea-lab/*`, `app/games/thought-pockets/**`, `app/games/the-mutation/**` |

**After batch 4d:** remove the dark `!important` overrides in `globals.css`. *(Done in 4d. Also: the game strip's Sound and Keys stamps are icon-only below 640 px, their words kept for screen readers, so long titles like "The Philosopher" keep their width.)*

**Risks:**
- Canvas re-inking can break the keepsake contrast tests, which is good: that is what they are for.
- The 4b writing games carry the care paths, so they are converted with their e2e specs open and nothing about judgement timing changes.
- Rollback is per batch.

### Phase 5: Prints (M)

**What ships:**
- `lib/keepsake/render.ts` uses `getInks()`, two-ink overprint and grain, and the new fonts.
- `plan.ts`'s `hand` font is retired (mapped to display).
- The OG images in `app/games/[slug]/opengraph-image.tsx` and `the-still-point/opengraph-image.tsx` get the new paper and fonts.
- Contrast tests cover six palettes.

**Files:** `lib/keepsake/*` (13), `__tests__/lib/keepsake/*` (13), `app/games/**/opengraph-image.tsx`.

**Risk:** medium. Canvas font loading timing; keep the existing `document.fonts.ready` redraw.

**As built (Phase 5):**
- `getInks()` is reached through `lookFor(theme, sense, contrast)` in `render.ts`. Named inks are the colour roles, and `glass-<role>` takes the dark palette on either paper (as the arcade screen does) for scenes that stay lit the same: Awakening, Dilemma, Gardener, Shapeshifter, the Patient One's sky. `mix(a, weight, b)` and `ramp()` build tints and sky bands; no raw hex remains.
- Overprint: shapes flagged `b` are the second ink, drawn `multiply` (light) or `screen` (dark) one art pixel out. Quiet and high contrast print flat (no offset, no grain). Grain is a seeded ±7 levels on the art grid, skipped under each line of words. Glass scenes carry no `b` shapes, since multiply on a dark ground would vanish.
- `hand` and `serif` are retired; `Font` is `sans` (Atkinson) or `display` (Bricolage, short titles only). Italics, capitals and the old caps titles are gone; the Optimist's story shows today's word as written, and only the letter tiles stay capitals.
- Shapeshifter rule colours moved to glass inks; the colour words in its alt text changed (violet to coral, orange to cream) and Quiet colours sit closer, so the dash and shape tell rules apart.
- `contrast.test.ts` runs all six palettes. `ARENA_VOICE_COLOURS` and `petalColour` were removed (dusk and clay, and tokens, are used directly).
- OG images: `ImageResponse` reads ttf, not woff2, so static ttf instances live in `app/fonts/og` (recipe in `app/fonts/README`). Both routes share `lib/og/game-card.tsx`, which draws the game's packet print as an SVG image (no blend mode: ink B is just offset 1 unit).

### Phase 6: Content pages, 404, offline, give slot (S)

**What ships:**
- `Prose` for About, Privacy, Terms, Support and Thoughts.
- 404 and offline per §7.26.
- `GiveBlock` with `enabled: false`.
- `sw.js` precache check for the offline page's assets.

**Files:** `app/{about,privacy,terms,support,thoughts}/**`, `app/not-found.tsx`, `app/offline/page.tsx`, `public/sw.js`, `components/ui/LegalPage.tsx` (deleted), `lib/give/config.ts`.

**Risk:** low.

**As built (Phase 6):**
- `components/seedpress/Prose.tsx` exports `Prose`, `ProseSection`, `ProseList`, `Term` and `ProseSign`; `LegalPage` is deleted. Prose sits at the left of `--w-shop`, so on wide screens the paper is empty to its right. Page copy and headings are unchanged. The About, Privacy and Terms sign-off lines lost their italics and are plain `--ink-soft` lines; Privacy and Terms show "Last updated" as small print under the title.
- Support uses the Care block at page scale (its lead is "You do not need to be in crisis to reach out. These lines are free and open at any hour.") and keeps the "Or breathe slowly for a minute" Stamp. The old paragraph "The people on these lines are kind, they listen, and you can stop whenever you like." is now the Care block's own closing line.
- Thoughts: slips are `.sp-flap` (a flap line with theme and date, then title and a one-line excerpt cut by CSS). The list no longer fades in or staggers. The submit form uses two `WritingSlip`s and stamp-choice radios for the theme; the submit Go shows its reason beside it while it cannot be pressed, instead of being disabled. Theme labels moved to `THEME_LABELS` in `lib/thoughts/thoughts-data.ts`. The placeholders became hints.
- Privacy's published totals are two plain tables (`.sp-table`), with no big numbers.
- 404: the `packet` seed stamp (48 px, torn-open top) above "This packet is empty", Go "Back to the shop", Stamp "All games", then three Slow down packets (the first three Calm games; the shelf has five). The "Or slow down for a minute" region and its care behaviour are unchanged.
- Offline: the inline logo, system fonts and its own `<style>`; every colour falls back to a system colour. `sw.js` is `vgm-v4`: on install it reads the cached `/offline` HTML for `/_next/static/` URLs, caches those, and caches the fonts its stylesheets name, so the page has its chrome offline too.
- Give: `lib/give/config.ts` (`enabled: false`, no organisations) and `GiveBlock` (client, reads care mode). The footer now sits inside `CareModeProvider` so it can hide the column; the give column is the footer's middle column and the grid becomes three columns only when it shows. About ends with it.
- The skip link's resting `top` is `-10rem`, because at Larger text it peeked into the header.

### Phase 7: Harden (S)

**What ships:**
- The full Tailwind namespace reset.
- `legacy-aliases.css` is deleted.
- `design-debt.json` must be empty, and `check:design` runs in strict mode.
- Visual tests become blocking.
- Old settings keys are removed.
- Lighthouse runs on all 18 URLs (one-off) and on the 6 configured URLs on every push.
- The owner's final sign-off.
- The optional user sessions (§12.4).

**Files:** `app/globals.css`, `app/styles/legacy-aliases.css`, `scripts/*`, `.github/workflows/*`, `lighthouserc.json`.

**As built (Phase 7):**
- `design-debt.json` is deleted and `check:design` is strict: every rule fails on any match (the ratchet and `--write-debt` are gone; `check:red` stays an alias). The five debt files were fixed, not recorded: `typography.ts`, `constants.ts` and their test were dead and deleted; the email templates take their colours from `PALETTES.light` in `lib/design/tokens.ts` (rind for the heading and link, the one flesh fill on the "Back to The Sage" button, so the old red text is gone); `ErrorBoundary` lost the word "infinite" from a comment; the `banned-utility` rule no longer reads a `/tracking-…` URL as a utility.
- The full namespace reset is in `app/globals.css` (`--color-*`, `--text-*`, `--shadow-*`, `--radius-*`, `--font-*`, `--ease-*`, `--animate-*`, `--drop-shadow-*`, `--blur-*`). It maps only the system values, plus `--text-h2` and `--text-h1` from existing tokens, because the old `text-3xl`…`text-5xl` headings needed a size. `legacy-aliases.css` and every transition alias are gone; `globals.css` plus `styles/` is 572 lines and 14 KB source.
- Classes converted so nothing silently vanished: `text-xs`/`text-sm` to `text-meta`, `text-base` `text-small`, `text-lg` `text-body`, `text-xl` `text-lead`, `text-2xl` `text-h3`, `text-3xl`/`text-4xl` `text-h2`, `text-5xl` `text-h1`; `rounded`/`-sm`/`-md` to `rounded-stamp`, `rounded-lg`/`-xl` `rounded-sheet`; `text-foreground`, `bg-background`, `bg-card-bg`, `border-card-border`, `hover:bg-hover-bg` to `text-ink`, `bg-paper`, `bg-sheet`, `border-rule-strong`, `hover:bg-rind-wash`; `font-serif` (The Philosopher) to `font-body`, or `font-display` for titles of 24 px and up. Dead classes (`focus-visible:ring-focus-ring`, `outline-focus-ring!`) were deleted; the one stock ease in a class became `ease-out`.
- `scripts/check-classes.mjs` (`npm run check:classes`, run after the build in `qa` and CI) lists every utility-looking word in `app/` and `components/` that the build has no rule for. Words that only look like utilities are named in its `NOT_CLASSES` set.
- Old settings: `migrateSettings` is now `parseSettings`, which reads only the current shape. On load, `shakfun:accessibility:settings`, the `verygoodmelon:press:sense` session key, and any field in the saved object that is no longer a setting (`pauseAnimations`, `colorblindMode`, `animationSpeed` and so on) are removed once.
- `lighthouserc.json` runs `/`, `/games`, The Patient One, The Sage, The Optimist and `/support`, with performance at `error` 0.90 and accessibility, best practices and SEO at `error` 0.95. `/press/home` is out.
- `__tests__/visual` is one file: `/press`, `/`, `/games` and one game per batch (The Patient One, The Final Word, The Sage, The Shapeshifter) at 390, 1440 and 2560 in Light, Dark and Light-Quiet, reduced motion forced. No baselines are committed; the Visual workflow writes the Linux ones when none exist. It stays `continue-on-error` until they are committed.
- The Optimist's loading state holds 90svh so the "Continue your journey" block no longer jumps when today's story arrives (CLS 0.394 to 0.003).
- Test edits: the First Breath care spec probes the red with `bg-flesh` instead of `bg-accent` (same colour, the old name no longer generates a rule); `round-feel.test.ts` expects the new size names.

**Risk:** low. Anything the reset breaks shows as a visual diff.

**Phase summary:**

| Phase | Size | Visible change | Blocking gate |
|---|---|---|---|
| 0 Groundwork | S | none | tokens and contrast tests green |
| 1 Proof at `/press` | M | new route only | **owner sign-off** |
| 2 Flip the shell | M | header, footer, home, games, settings | all e2e, axe, Lighthouse ≥90 |
| 3 Shared game chrome | M | every game's frame, dialogs, care | care e2e unchanged and green |
| 4a–d Games | L (4×M) | each game | per-batch e2e and keepsake contrast |
| 5 Prints | M | keepsakes, OG images | keepsake contrast in 6 palettes |
| 6 Content pages | S | about, legal, 404, offline | axe |
| 7 Harden | S | none intended | debt empty, visuals blocking |

---

## 12. Success criteria

### 12.1 Accessibility gates (blocking from the phase that touches each surface)

- axe reports zero violations, including `color-contrast` and `target-size`, on every route at 390 and 1440, across Light, Dark, Light-Quiet and High. **Met and enforced:** `accessibility-gates.e2e.test.ts` runs axe (WCAG 2.2 AA tags, and fails if either rule never ran) on all 8 content pages and all 14 games in each look at both widths, driven from `lib/games/config.ts`. Lighthouse accessibility is 100 on all 18 URLs.
- Every role pair passes in all six palettes (`tokens.test.ts`), and every keepsake glyph is at 4.5:1 or more (`contrast.test.ts`).
- Keyboard-only completion of every game. The existing e2e specs already drive the games by keyboard; any that use a mouse get a keyboard twin.
- Reduced motion produces no transform animations: `getAnimations()` shows only opacity transitions of 160 ms or less. **Met and enforced** on every route, whether asked for by the device or by the setting (`accessibility-gates.e2e.test.ts`); the site's own clamp of every duration to 0.01 ms counts as no motion, and the attribute is checked at first paint from the server HTML and boot script alone. This gate covers CSS and Web Animations only. Motion drawn on a canvas or by `requestAnimationFrame` is invisible to `getAnimations()`, and is covered per game by its own specs: `the-mutation.e2e.test.ts` (reduced motion on a phone, and the bloom and glow in reduced motion and Quiet), `quiet-grove.e2e.test.ts` (the garden planted, kept and sat with under reduced motion), `the-still-point.e2e.test.ts` (breathing patterns on a phone under reduced motion).
- Quiet mode leaves no running animations outside game content. **Met and enforced** for CSS and Web Animations on every route, with the game stage (`.sp-stage`) as the only exemption (`accessibility-gates.e2e.test.ts`; `/press/home` is also held to zero in `press.e2e.test.ts`). Canvas and `requestAnimationFrame` motion inside the stage is the game's own content, checked by the specs above.
- `expectOneGo` and `expectStillCare` pass on every spec. **Met:** `expectOneGo` runs in the route checks and in every game spec; `expectStillCare` runs on every game page in care mode (`site-shell.e2e.test.ts`) and in the specs of the games that can enter care themselves.
- `no-counters` passes. No "AI" wording appears; the player-text scan for `/\bAI\b|artificial intelligence|model|generat/i` runs on every route's visible text, accessible names and metadata, with an allow-list of ordinary phrases ("role model", "generation(s)", "regenerative", "generate electricity") that is stripped from each line before the rest is tested. `/privacy` and `/terms` are excluded because they must name the AI services plainly; every story in The Optimist's word list is scanned by `__tests__/lib/flash-detector.test.ts`, so the result does not depend on the day. **Met and enforced** (`accessibility-gates.e2e.test.ts`). It reads each route as first opened, so a deeper screen's copy is covered by the review of the copy, not by this scan.

### 12.2 Performance

- Lighthouse mobile ≥90 for performance and ≥95 for accessibility, best practices and SEO, on `/`, `/games`, one game per shelf and `/support`. It runs on push, not only on PRs. **Met** on the six configured URLs (local production build, mobile profile): performance 100, 100, 100, 100, 100, 100; accessibility 100; best practices 96; SEO 100. Later perf work (the server-drawn first screens, through `eeafc7f`) took the four games outside the CI set, The Keeper, The Plain Speaker, The Shapeshifter and The Philosopher, to performance 100 on the same local mobile production build. **Met** on all of them.
- Fonts transfer ≤75 KB in total, and ≤64 KB if Bricolage instancing hits its target. **Met:** 58 KB on most pages, 70 KB on The Alchemist and The Shapeshifter (the ≤64 KB target is not met there).
- The homepage LCP element is the h1, under 2.5 s on Lighthouse's mobile profile. **Met:** `h1.sp-sign__title`, 0.91 s.
- CLS is under 0.05; font fallback metrics are adjusted. **Met:** 0.000 on `/`, `/games`, `/support`, The Patient One and The Sage, 0.003 on The Optimist, and 0.000 on The Keeper, The Plain Speaker, The Shapeshifter and The Philosopher (their server-drawn first screens now hold the stage's final shape before hydration; local mobile production build).
- No JavaScript for decoration: AmbientParticles is gone, and all chrome motion is CSS. Client JavaScript on `/` does not grow against the pre-Phase-2 build (`next build` route sizes are recorded in the Phase 2 commit message).
- `globals.css` plus the styles total under 30 KB minified, down from today's 1,421-line file. **Met:** 572 lines, 14 KB unminified (`globals.css`, `base.css`, `tokens.css`).

### 12.3 Owner sign-off checklist (Phase 1 at `/press`, Phase 7 site-wide)

- [ ] At 390 px, the homepage feels like *a shop of little things*, not a product page.
- [ ] You can name the three shelves and find a specific game in under 5 seconds without reading every title.
- [ ] Nothing moves until you touch it.
- [ ] Each game's packet looks like *its* game.
- [ ] Quiet mode feels noticeably softer, not broken.
- [ ] Dark mode feels like night printing, not "grey mode".
- [ ] The go-button reads as a melon slice, and you would press it.
- [ ] The Care block feels warm. You would be comfortable seeing it on a bad night.
- [ ] Body text reads easily at default size and at "Larger". Roomy spacing helps rather than looks broken.
- [ ] There is nothing you would apologise for when showing it to someone (the CLAUDE.md quality bar).
- [ ] It does not look like any component library you recognise.

### 12.4 Optional testing with neurodivergent visitors (recommended before Phase 7)

**Format:**
- 6–8 adults who self-identify as ADHD, autistic or both.
- 30-minute remote sessions, done by the owner.
- Paid or thanked; no recording without consent.

**Tasks:**
- Find a calming game.
- Change how the site feels.
- Finish one Slow down game.
- Find support.

**Measures:**
- A single-item "How calm do you feel?" rating (0–10) before and after, as a direct proxy for the site's #1 metric. Self-report only, no analytics, no storage beyond the owner's notes.
- One question: "Was anything too much?"
- Where people looked first on the home and game pages (think-aloud).

**Success:**
- The median calm rating rises.
- No participant reports overload on Gentle.
- Every participant finds the dial and support unaided.
- Findings feed a Phase 7 tuning commit, adjusting the §4 budget, not adding features.
- Co-design was what made AASPIRE's guidelines credible [RAYMAKER19][MYADHD22].

---

## 13. Open questions for the owner

**Decided (2026-11-24, the owner delegated these calls):**
1. **Bricolage Grotesque for titles only**, with Atkinson Hyperlegible Next for everything else. The brief asks for something extremely unique, and the 30–40 KB cost is worth it.
2. **Build Seedpress.** Phase 1 is judged against the §12.3 checklist by an independent review before Phase 2 starts.
3. **Gentle** is the default sense. Quiet motion still follows the device's reduced-motion setting.
4. **The header scrolls away.**
5. **The give block** stays built but hidden until the owner names the organisation(s) and wording. No organisation is chosen on the owner's behalf.

The original questions, for the record:

1. **Display font:** approve **Bricolage Grotesque** for titles only, or keep a single family (Atkinson Hyperlegible Next everywhere), trading some personality for about 30–40 KB and one less moving part?
2. **Concept:** after seeing `/press/home`, is Seedpress (print shop and seed packets) right, or should Phase 1 be redone in one of the alternatives (Toybox, Night Allotment)?
3. **Default sense:** should new visitors start on **Gentle** (recommended) or **Quiet**? Visitors whose device asks for reduced motion get Quiet motion either way.
4. **Header:** is a header that **scrolls away** (recommended: more room, fewer persistent stimuli) acceptable, or should it stay sticky as now?
5. **Give block:** which organisation(s), what one or two sentences, and should there be a dedicated `/give` page or only the footer slot and the About section? It is always hidden in care mode.
