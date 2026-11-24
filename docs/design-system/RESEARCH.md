# Seedpress design system: research appendix

Each source has a key that PLAN.md cites in square brackets, a link and a one-line takeaway. It also has an evidence tag:

- **Strong:** a formal standard, or replicated or large-sample empirical work.
- **Moderate:** empirical work, but small, single-study or not comparative.
- **Weak:** expert guidance, a conceptual piece or a single small study.
- **Contested:** studies disagree.

A note on verification:

- **(loaded):** the page was opened and read while researching (November 2026).
- **(search):** the URL came from search results and was not opened. Its takeaway comes from the abstract or summary shown in search.

Re-check any (search) link before quoting it outside this plan.

## Standards and formal guidance

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| HO | [Karwai Pun, "Dos and don'ts on designing for accessibility", GOV.UK Accessibility blog, 2016](https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/) (loaded) | Autism: simple colours, simple consistent layouts, descriptive buttons, and no "bright contrasting colours" or clutter. Dyslexia: left-aligned text, no underline, italics or capitals, and don't make people remember things. | Weak (practitioner) |
| HO-REPO | [UKHomeOffice/posters repository](https://github.com/UKHomeOffice/posters/tree/master/accessibility/dos-donts) (loaded) | The source SVGs for the posters, in 23 languages (`autistic-spectrum.svg`, `dyslexia.svg`). | Weak |
| COGA | [W3C, Making Content Usable for People with Cognitive and Learning Disabilities, 2021](https://www.w3.org/TR/coga-usable/) (loaded) | Eight objectives: clear purpose, findability, clear content, avoiding mistakes, helping focus, no reliance on memory, help, and personalisation. In particular: controls don't move unexpectedly, interruptions are limited, and users choose when content moves. | Strong (consensus; not normative) |
| WCAG22 | [W3C, WCAG 2.2, 2024 edition](https://www.w3.org/TR/WCAG22/) (loaded) | The criteria this plan relies on:<br>2.2.1/2.2.3: no essential timing.<br>2.2.2: pause any auto-motion over 5 s.<br>2.3.3: interaction motion can be turned off.<br>2.4.7/2.4.11/2.4.13: focus is visible, not obscured, and contrasts 3:1.<br>2.5.8/2.5.5: targets are 24 px, or 44 px enhanced.<br>3.2.3/3.2.4/3.2.6: navigation, identification and help stay consistent.<br>1.4.8: under 80 characters per line, line height at least 1.5, no justification.<br>1.4.12: text survives 0.12em letter spacing, 0.16em word spacing, 1.5 line height and 2× paragraph spacing. | Strong |
| WCAG-231 | [Understanding 2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html) (loaded) | No more than 3 flashes in any second; a flash is a luminance change of at least 10%; the safe area is about 341×256 CSS px. | Strong |
| WEBDEV-PRM | [Thomas Steiner, "prefers-reduced-motion", web.dev](https://web.dev/articles/prefers-reduced-motion) (search) | Supported in every engine; can change live, so JavaScript must listen as well as CSS. | Strong (platform docs) |
| BDA | [British Dyslexia Association, Dyslexia Style Guide (2018 text, as published by Wigan Council)](https://www.wigan.gov.uk/Docs/PDF/Business/Professionals/SEN/HEFA/Dyslexia-Style-Guide.pdf) (loaded) | Sans-serif at 12–14 pt; dark text on a light, not white, background; no italics, underline or block capitals (bold for emphasis); left-aligned; 60–70 characters per line; line spacing 1.5; no moving text; let readers choose colours. | Weak (guidance, partly evidence-based) |

## Autism: sensory processing, clutter, predictability

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| BS09 | [Ben-Sasson et al. 2009, meta-analysis of sensory modulation in ASD](https://pubmed.ncbi.nlm.nih.gov/18512135/) (search) | Across 14 studies, autistic people differ most in under-responsivity, then over-responsivity, then seeking; the gap is largest at ages 6–9. | Strong |
| BS19 | [Ben-Sasson et al. 2019, update: a new decade](https://cris.haifa.ac.il/en/publications/update-of-a-meta-analysis-of-sensory-symptoms-in-asd-a-new-decade/) (search) | 55 studies, n=4,606. Over-responsivity is large compared with typical controls and also higher than in other developmental conditions. | Strong |
| WASHU26 | [Washington University, "Sensory overload in kids has distinct neurobiological roots", 2026 (JAACAP study)](https://source.washu.edu/2026/08/sensory-overload-in-kids-has-distinct-neurobiological-roots/) (loaded; press release only) | n=15,728. Sensory over-responsivity tracks autistic traits and anxiety, not ADHD, once overlap is adjusted for; it affects about 15–20% of all children. | Moderate–Strong |
| PARMAR21 | [Parmar et al. 2021, autistic adults on sensory experience, Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.633037/text) (search) | Focus groups (n=18) report sensitivity to light, motion, patterns and particular colours. | Weak (qualitative) |
| GM16 | [Grandgeorge & Masataka 2016, Atypical colour preference in children with ASD](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01976/full) (loaded) | Autistic boys (n=29) liked yellow less and green more than controls. Boys only; lightness confound. | Weak |
| FISHER14 | [Fisher, Godwin & Seltman 2014, Visual environment, attention allocation and learning (summary)](https://fordhaminstitute.org/ohio/commentary/visual-environment-attention-allocation-and-learning) (search) | Children in a decorated room were off-task about 39% of the time against about 28% in a sparse room, and learned less. | Moderate |
| ERASLAN19 | [Eraslan, Yaneva, Yesilada & Harper 2019, Web users with autism: eye-tracking evidence](https://ideas.repec.org/a/taf/tbitxx/v38y2019i7p678-700.html) (search) | Autistic adults (n=18 vs 18) looked at more elements, made more transitions, fixated more on irrelevant ones, and searched less successfully on complex pages. | Moderate |
| RAYMAKER19 | [Raymaker et al. 2019, AASPIRE web accessibility guidelines for autistic adults](https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264) (loaded) | Built with autistic co-designers (beta n=170): a low-contrast neutral option, light and dark themes, no moving images, no textured backgrounds or decoration, highly consistent behaviour, label everything, show options openly, literal language. | Moderate |
| PAVLOV14 | [Pavlov 2014, User interface for people with autism spectrum disorders](https://file.scirp.org/Html/7-9301792_43152.htm) (search) | Requirements built around personalisation: users tune presentation to themselves. | Weak |
| GAIA | [Britto & Pizzolato, GAIA guidelines (2016)](https://sol.sbc.org.br/index.php/sbie/article/view/41739) and [2018 journal version](https://journals-sol.sbc.org.br/index.php/rbie/article/download/6909/3609/33754) (search) | 28 guidelines in 10 categories from a literature synthesis: predictability, customisation, minimal visual load. Mostly about children. | Weak |
| BOULTER14 | [Boulter, Freeston, South & Rodgers 2014, Intolerance of uncertainty in ASD](https://eprints.ncl.ac.uk/193900) (search) | Intolerance of uncertainty is raised in autistic young people and mediates the link from diagnosis to anxiety. | Moderate–Strong |

## ADHD: attention, reward, time

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| FORSTER14 | [Forster, Robertson, Jennings, Asherson & Lavie 2014, Neuropsychology](https://pmc.ncbi.nlm.nih.gov/articles/PMC3906797) (search) | Adults with ADHD are more disrupted by salient irrelevant distractors; an engaging, higher-load task reduces this as much as in controls. | Moderate |
| FL16 | [Forster & Lavie 2016, attention-distractibility trait](https://sro.sussex.ac.uk/id/eprint/59000/) (search), with a [2021 replication raising concerns](https://link.springer.com/article/10.3758/s13421-021-01162-5) (search) | A trait-distractibility account, disputed on method. | Contested |
| MARX-DA | [Marx et al., meta-analysis of delay aversion in ADHD](https://eprints.soton.ac.uk/420008) (search) | 37 comparisons, about 3,763 people. Stronger aversion to waiting in ADHD, and stronger still with real rewards. | Strong |
| MARX-TIME | [Marx et al. 2021, timing meta-analysis](https://eprints.soton.ac.uk/456003) (search) | Broad but task-dependent timing differences; "time blindness" is a lay simplification. | Moderate |
| TIMEREV | [Review of time perception in adult ADHD](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9962130/) (search) | Findings are mixed across tasks. | Moderate |
| JIANG22 | [Jiang et al. 2022, scoping review of ADHD mobile games](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2022.792402/pdf) (search) | 19 studies; evidence of benefit is scarce and mixed. | Moderate |
| SCHULTZ25 | [Schultz et al. 2025, game elements in ADHD interventions](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1605744/full) (search) | 37 studies of 22 games. No game element showed a consistent advantage; gamification for ADHD is unproven. | Moderate |
| MYADHD22 | [MyADHD usability study 2022, JMIR Formative Research](https://formative.jmir.org/2022/10/e37137/) (search) | n=5; iterating with users improved usability. | Weak |
| RA18 | [Ra et al. 2018, JAMA: digital media use and ADHD symptoms](https://pubmed.ncbi.nlm.nih.gov/30027248/) (search) | High-frequency media use shows a modest association with later ADHD symptoms (OR 1.11 per activity); not shown to be causal. | Moderate |

## Dyslexia and typography

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| RELLO13 | [Rello & Baeza-Yates 2013, Good fonts for dyslexia (ASSETS)](https://dblp.dagstuhl.de/rec/bibtex/conf/assets/RelloB13) (search) | Eye tracking with 48 dyslexic readers: sans-serif, roman and monospaced faces read better, and italics read worse. | Moderate |
| RELLO17 | [Rello & Baeza-Yates 2017, How to present more readable text for people with dyslexia (UAIS)](https://link.springer.com/article/10.1007%2Fs10209-015-0438-8) (search) | Larger text and wider spacing help; values not checked here. | Moderate (unverified detail) |
| ZORZI12 | [Zorzi et al. 2012, Extra-large letter spacing improves reading in dyslexia (PNAS)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3396504) (search) | 74 children: extra letter spacing improved accuracy and speed (over 20% faster); critics question whether this is dyslexia-specific. | Moderate |
| DURANOVIC18 | [Duranovic et al. 2018, letter spacing and reading](https://pubmed.ncbi.nlm.nih.gov/30094714/) (search) | Extra spacing improved accuracy but not speed. | Moderate |
| WERY17 | [Wery & Diliberto 2017, OpenDyslexic (Annals of Dyslexia)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5629233) (search) | No gain in reading rate or accuracy, and no student preferred it. | Moderate |
| KUSTER18 | [Kuster et al. 2018, Dyslexie font does not benefit reading](https://pmc.ncbi.nlm.nih.gov/articles/PMC5934461) (search) | Large samples (n=170, then 102+45): no benefit, and most children preferred Arial. | Strong |
| AZZARELLO26 | [Azzarello et al. 2026, meta-analysis: does font improve reading in dyslexic children?](https://strathprints.strath.ac.uk/97732/1/Azzarello-etal-AD-2026-Does-font-improve-reading-in-dyslexic-children-meta-analysis.pdf) (loaded) | 15 studies, 81 effects: overall g = −0.04 (not significant). "Dyslexia fonts" do not help. | Strong |

## Fonts: licences and evidence

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| AHLN | [Atkinson Hyperlegible Next in google/fonts (OFL)](https://github.com/google/fonts/tree/main/ofl/atkinsonhyperlegiblenext) (loaded), and [launch coverage (Applied Design / Braille Institute, 2025)](https://lbbonline.com/news/applied-design-launches-atkinson-hyperlegible-next-typeface) (search) | SIL OFL 1.1, a variable weight axis (200–800), 150+ languages; letterforms are built to be told apart (I/l/1, O/0, b/d/p/q). Tested with low-vision readers during design; no peer-reviewed outcome data. | Weak (design claims) |
| AHL | [Original Atkinson Hyperlegible (2019) in google/fonts](https://api.github.com/repos/google/fonts/contents/ofl/atkinsonhyperlegible) (loaded) | The four-style predecessor; Next replaces it. | Weak |
| LEXEND-G | [Google Design, "Lexend: a typeface for readability"](https://design.google/library/lexend-readability) (loaded) | Its readability claims rest on the designer's own dissertation and anecdote; no sample or effect sizes are published. | Weak |
| LEXEND-TD | [Typedrawers discussion of Lexend's evidence (2019)](https://typedrawers.com/discussion/comment/43203) (loaded) | Type designers point out the claim rests on one study of 20 children that did not control for apparent size. | Weak (critique) |
| BRICOLAGE | [Bricolage Grotesque by Mathieu Triay (OFL)](https://github.com/ateliertriay/bricolage), packaged as `@fontsource-variable/bricolage-grotesque` 5.3.0 | SIL OFL 1.1; variable in weight, width and optical size. Display use only; no readability research exists. | None (aesthetic choice) |
| SIZES | Measured for this plan from the `@fontsource-variable/*` 5.3.0 npm tarballs (Latin subset WOFF2) | Atkinson Next roman 33,996 B; italic 37,644 B (not used); Bricolage weight-only 41,344 B; Bricolage with all axes 131,548 B; Lexend 39,680 B; Fredoka 29,732 B. | Measured |
| NEXTFONT | `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` (Next 16.3.5, in repo) | `next/font/local` takes `src`, `variable`, `preload`, `adjustFontFallback` and `declarations`; it self-hosts with no runtime request to Google. | Platform docs |

## Motion and the vestibular system

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| HEAD15 | [Val Head 2015, Designing safer web animation for motion sensitivity (A List Apart)](https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity) (search) | Large-scale motion, parallax, zoom and spinning trigger dizziness and nausea in vestibular disorders; small, user-initiated motion is safer. | Weak (expert) |
| HEAD20 | [Val Head 2020, Designing with reduced motion for motion sensitivities (Smashing)](https://www.smashingmagazine.com/2020/09/design-reduced-motion-sensitivities) (search) | Reduced motion means replacing motion (for example with a cross-fade), not deleting the feedback. | Weak (expert) |
| AGRAWAL09 | [Agrawal et al. 2009, vestibular dysfunction prevalence (NHANES)](https://pubmed.ncbi.nlm.nih.gov/19468085) (search) | 35.4% of US adults aged 40 and over show vestibular dysfunction. | Strong |

## Play, juice, calm and cosiness

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| KAO20 | [Kao 2020, The effects of juiciness in an action RPG (Entertainment Computing)](https://www.x-mol.com/paper/1307980428882448384) (search) | n=3,018. Both no juice and extreme juice reduced play time, experience, motivation and performance; medium or high juice was best. | Strong (one large study) |
| JP12 | [Jonasson & Purho, "Juice it or lose it" (2012 talk), summarised](https://roblog.co.uk/2024/03/juicy-games/) (search) | Small, layered feedback (squash, ease, particles, sound) makes simple interactions feel alive. | Weak |
| SWINK08 | [Game feel (Swink 2008), overview](https://en.wikipedia.org/wiki/Game_feel) (search) | Game feel is real-time control plus simulated space plus polish; responsiveness matters more than spectacle. | Weak |
| WEISER95 | [Weiser & Brown 1995, Designing Calm Technology](https://calmtech.com/papers/designing-calm-technology) (search) | Calm technology moves between the edge and the centre of attention, and informs without overburdening. | Weak (conceptual) |
| HORSESHOE17 | [Project Horseshoe 2017, coziness in games (80.lv summary)](https://80.lv/articles/using-coziness-in-game-design) (search) | Cosiness rests on safety, abundance and softness, with no threat of loss. | Weak |
| WB20 | [Waszkiewicz & Bakun 2020, cited in Replay journal](https://czasopisma.uni.lodz.pl/Replay/article/download/23171/23250/54615) (search; venue unverified) | Cosiness can be coherent with play, dissonant with it, or situational. | Weak |
| RUSS09 | [Russoniello, O'Brien & Parks 2009, casual games and stress (RCT)](https://pubmed.ncbi.nlm.nih.gov/19592761/) (search) | n=143. Casual games improved mood and lowered stress against browsing (measured by HRV and EEG). Industry-funded. | Moderate |
| PALLAV21 | [Pallavicini, Pepe & Mantovani 2021, commercial games for stress and anxiety (JMIR Mental Health)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8406113/) (search) | 28 studies: even single short sessions can reduce stress and anxiety; effects depend on the game. | Moderate |
| TOWNSCAPER | [PC Gamer on Townscaper's "toy" design](https://pcgamer.com/townscapers-developer-on-how-its-radically-casual-design-is-inspiring-a-new-wave-of-low-stress-builders-to-adapt-the-blueprint) (search) | A goal-free toy that cannot be lost; reference for The Shapeshifter and The Gardener. | Inspiration |
| ALTO | [Alto's Odyssey press kit](https://altosodyssey.com/press) and [CBC interview](https://amp.cbc.ca/lite/story/1.4559145) (search) | Zen Mode strips scores, coins and failure resets; the team describes it as therapeutic. Precedent for the Quiet setting. | Inspiration |
| NNG-NEO | [Nielsen Norman Group, Neobrutalism](https://www.nngroup.com/articles/neobrutalism/) (search) | Thick borders, hard shadows and bold colour make strong affordances but risk visual overload; it needs softening for this audience. | Weak |
| NEAL | [Neal Agarwal interview, Working Theorys](https://www.workingtheorys.com/p/the-craft-neal-agarwal) (search) | A site that is "just the toys": almost no chrome; the content is the identity. | Inspiration |
| RISO-CCS | [College for Creative Studies, "Registration & Trapping"](https://campus.collegeforcreativestudies.edu/imaging-center/2021/06/22/registration-trapping/) (search) | Riso layers never register perfectly; designers print line work over solid fills and use trapping so the offset reads as character, not error. | Practitioner |
| RISO-MONIKER | [Moniker Press, Risograph print guide](https://monikerpress.ca/printing) (search) | 0–3 mm of shift between ink passes is expected; translucent inks overprint into a third colour. | Practitioner |

## Colour and arousal

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| VM94 | [Valdez & Mehrabian 1994, Effects of color on emotions (J Exp Psych: General)](https://pubmed.ncbi.nlm.nih.gov/7996122/) (search) | Arousal rises with saturation (≈0.60×S) and falls with brightness; pleasure rises with brightness. Green-yellow and yellow were the least pleasant hues. | Strong |
| WO18 | [Wilms & Oberfeld 2018, Color and emotion: hue, saturation, brightness (Psychological Research)](https://www.staff.uni-mainz.de/oberfeld/downloads/Wilms-Oberfeld2018_Article_ColorAndEmotionEffectsOfHueSat.pdf) (search) | n=62, measured physiologically: higher chroma and brightness mean more arousal, and red arouses more than blue or green. | Strong |

## Streaks, compulsion, dark patterns

| Key | Source | Takeaway | Evidence |
|---|---|---|---|
| SB23 | [Silverman & Barasch 2023, broken streaks (J Consumer Research)](https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions) (search) | Across 7 studies, a broken streak lowered later engagement whatever the real past behaviour, and hurt most when people blamed themselves. | Strong |
| DUO | [Duolingo, How the streak builds habit](https://blog.duolingo.com/how-duolingo-streak-builds-habit) (search) | Industry account that openly uses loss aversion; the mechanic this site refuses. | Weak (industry) |
| DARKP24 | [Dark patterns in mobile games, 2024](https://arxiv.org/pdf/2412.05039) (search) | Groups dark patterns as temporal, monetary and social: countdowns, daily obligations, social pressure. | Moderate |
| SPICER21 | [Spicer et al. 2021, loot boxes and problem gambling](https://www.open-access.bcu.ac.uk/14466/1/Spicer_Loot_Boxes_Problem_Gambling_2021.pdf) (search) | Loot boxes are consistently associated with problem gambling (direction of cause unclear): no variable-ratio rewards here. | Strong (association) |

## Tooling

| Key | Source | Takeaway |
|---|---|---|
| TW-THEME | [Tailwind CSS docs, Theme variables](https://tailwindcss.com/docs/theme) (search) | Setting a namespace to `initial` inside `@theme` (for example `--color-*: initial;`) removes the default values and the utilities they generate. This is the main guard against drifting back to the defaults. |

## Where the evidence is strong, weak or contested

- **Strong, and designed around:**
  - Consistency and predictability: COGA, WCAG 3.2.x, BOULTER14.
  - No timers, streaks or loss mechanics: WCAG 2.2.x, SB23.
  - Visitor control of motion, and no flashing: WCAG 2.2.2, 2.3.1, 2.3.3, AGRAWAL09.
  - Saturation drives arousal: VM94, WO18.
  - Moderate rather than extreme feedback: KAO20.
  - Immediate feedback over waiting: MARX-DA.
  - Decoration costs attention: FISHER14, ERASLAN19, FORSTER14.
  - Special "dyslexia fonts" do nothing: AZZARELLO26, KUSTER18.
- **Weak, so treated as a sensible default the visitor can change, never as a fact about them:**
  - Cream backgrounds (BDA).
  - Exact point sizes (BDA).
  - Autistic colour preferences: yellow avoidance (GM16).
  - Atkinson's legibility claims (AHLN).
  - Lexend's readability claims (LEXEND-G).
  - Cosiness theory (HORSESHOE17, WB20).
- **Contested:** a stable "distractibility trait" in ADHD (FL16). The plan relies only on the better-supported finding that salient irrelevant things capture attention (FORSTER14).
- **Not found:** any study tying streaks directly to anxiety, or any study of risograph and paper aesthetics with neurodivergent users. The aesthetic is a design bet that the plan tests in Phase 1 with the owner and optionally with users (PLAN.md §12).
