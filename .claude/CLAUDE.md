# VeryGoodMelon.Fun - Project Memory for Claude Code

**⚡ Quick Start:** Read `CONTEXT_QUICK.md` first (token-optimized)
**📚 Full Context:** See `/docs` directory if needed

---

## Project Overview

**VeryGoodMelon.Fun** = unique, accessible, AI-powered games that reduce anxiety (NOT a neal.fun clone)

**Origin**: The name is a pun on VeryGoodPizza (the creator's gaming channel), keeping the watermelon theme.

## Critical Context

### Design Excellence Required
This project demands **exceptionally high standards** in:
- ✨ **Creativity**: Every game must be unique or have a unique twist
- 🎨 **UX Design**: Beautiful, intuitive, delightful interactions
- ♿ **Accessibility**: WCAG 2.1 AA+ with neurodivergent-friendly design
- 🧘 **Simplicity**: Minimal UI, maximal impact
- 🎯 **Purpose**: Every element has meaning

### Key Philosophy
> "Think deeply, feel lighter."

- **Philosophical depth, not escapism** - help users get comfortable with tough topics (mortality, ethics, meaning)
- **Calm container** - present deep thinking in a relaxing, low-stress way
- **Subtle yet interesting** - the whole site should be fun to play with, not just the games
- **Interactive delight** - constellation backgrounds, floating cards, cursor interactions
- More personal, more experimental, more unique

### What We're NOT
- Not shallow puzzles or time-fillers (removed: Tangled Wisdom, Drifting Dreams, etc.)
- Not clones of existing games
- Not purely addictive with no value

### Core Success Metric
**Users should feel LESS ANXIOUS when leaving than when they arrived.**

This is the #1 metric. Everything else serves this goal.

### Quality Bar (Non-Negotiable)
- **Emotional Impact**: Users feel better after (smile, relax, motivated)
- **Natural Return**: Come back for value, not addiction
- **Originality**: Not a clone (Flappy Bird with watermelons = NO)
- **Accessibility**: Keyboard-only, screen reader, sensory controls
- **Performance**: 90+ Lighthouse scores
- **Polish**: Would you show this to anyone without caveats?

---

## Before Building Anything

**ALWAYS** read `DESIGN_PHILOSOPHY.md` first.

It contains:
- Core principles
- UX guidelines
- Game design criteria
- Neurodivergent-friendly considerations
- Quality checklists

---

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router + Turbopack)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with custom CSS variables
- **AI**: Google Gemini 2.0 Flash (primary), OpenAI (fallback)
- **Database**: Supabase (PostgreSQL) - for future game data
- **Deployment**: Vercel (auto-deploy from `main` branch)
- **Analytics**: Vercel Speed Insights

---

## Design System Quick Reference

### Colors (Watermelon Theme)
```css
--background: #fafafa        /* Light grey */
--foreground: #1a1a1a        /* Dark grey */
--accent: #e63946            /* Coral red (watermelon) */
--success: #74c69d           /* Light green (rind) */
--melon-green: #1a4d2e       /* Dark green */
```

### Visual Language
- **Pixelated aesthetic**: Use `.pixelated` class for crisp rendering
- **Minimal UI**: Every element serves a purpose
- **Fast transitions**: 75ms for snappy feel
- **Generous spacing**: Never cramped
- **System fonts**: Performance over custom fonts

---

## Accessibility Standards

### Must-Haves (Non-Negotiable)
- ✅ Keyboard-only navigation (no mouse required)
- ✅ Screen reader support (semantic HTML + ARIA)
- ✅ `prefers-reduced-motion` support
- ✅ High contrast text (4.5:1 minimum)
- ✅ Focus indicators on all interactive elements
- ✅ Skip to content link
- ✅ Color-blind safe (never rely on color alone)

### Neurodivergent-Friendly
- ✅ Clear, predictable patterns
- ✅ Optional animation/sound controls
- ✅ No time pressure (unless optional)
- ✅ Undo/reset always available
- ✅ Simple, direct instructions
- ✅ Calm sensory experience

### Testing Required
Before shipping any feature:
1. Test keyboard-only navigation
2. Test with screen reader (VoiceOver on Mac)
3. Test with reduced motion enabled
4. Test on mobile (iOS Safari + Android Chrome)
5. Run Lighthouse accessibility audit (90+ score)

---

## AI Integration Guidelines

### Invisible AI Philosophy

**CRITICAL**: AI must be **completely invisible** to users.

- ❌ Never show "AI" labels or "Powered by..." text
- ❌ Never say "AI is generating..." in UI
- ✅ Create "How did it know that?" moments
- ✅ Make experiences feel impossibly clever
- ✅ Users should think it's magic, not machine learning

### When to Use AI (Invisibly)
- Interactive storytelling (without revealing it's AI)
- Procedural generation that feels smart
- Personalized experiences that adapt
- Creative simulations with emergent behavior
- Dynamic responses to user input

### When NOT to Use AI
- Static content that doesn't need it
- Simple interactions
- Performance-critical paths
- Where deterministic behavior is clearer

### AI Best Practices
- **Google Gemini 2.0 Flash**: Primary (fast, creative, invisible)
- **OpenAI**: Fallback/alternative
- Always have deterministic fallback (seamlessly)
- Cache responses when possible
- Stream long responses (but hide "typing" indicators)
- Error states that don't reveal AI failure

---

## Game Development Guidelines

### Before Building a Game

**CRITICAL**: Ask these questions FIRST:

#### 1. Emotional Impact (Most Important)
- ❓ Will users feel **less anxious after** than before?
- ❓ Will they **smile, relax, or think "that was worth it"**?
- ❓ Does it add **genuine value** (relaxation, growth, motivation)?
- ❓ Will they **return naturally**, not compulsively?

#### 2. Originality & Value
- ❓ More than a clone with different graphics?
- ❓ What's the **unique twist**?
- ❓ What **value does it add to the world**?
- ❓ **Not just Flappy Bird with watermelons**, right?

#### 3. Accessibility (Non-Negotiable)
- ❓ **Keyboard-only** playable?
- ❓ **Screen reader** compatible?
- ❓ **Sensory controls** included?
- ❓ No **timing requirements**?

#### 4. Tone & Seriousness
- ❓ **Lighter than real world**?
- ❓ Not **too serious or heavy**?
- ❓ **Doesn't increase stress**?

**If ANY answer is "no" or "maybe"** → Don't build it or fix it first.

### Game Requirements

**Must Have:**
- Keyboard-accessible controls
- Mobile-responsive layout
- Clear instructions (< 2 sentences)
- Completable in < 10 minutes
- Fits watermelon color palette
- Reduced motion support

**Should Have:**
- Unique concept or twist
- Replayability through variation
- Surprising moment
- Thoughtful or meditative quality

**Avoid (Dealbreakers):**
- ❌ **Direct clones** - "Flappy Bird but watermelons" is NOT OK
- ❌ **Increases anxiety** - Should reduce stress, not add to it
- ❌ **Purely addictive** - No value beyond "one more click"
- ❌ **No added value** - Already done better elsewhere
- ❌ **Too serious** - Should be lighter than real world
- ❌ **Precise timing requirements** (accessibility issue)
- ❌ **Loud sounds without warning**
- ❌ **Flashing effects**
- ❌ **Competitive pressure** (leaderboards, rankings)

---

## Code Standards

### Component Structure
```typescript
// ✅ Good: Accessible, semantic, typed
interface GameProps {
  onComplete?: () => void
}

export function Game({ onComplete }: GameProps) {
  return (
    <div role="application" aria-label="Game name">
      <h2 id="game-title">Game Name</h2>
      {/* Game content */}
    </div>
  )
}
```

### Styling Patterns
```typescript
// ✅ Use utility classes + custom CSS variables
<button className="
  px-4 py-2
  bg-accent text-white
  rounded
  transition-transform hover:scale-105
  focus:outline-none focus:ring-2 focus:ring-accent
">
  Play
</button>
```

### Accessibility Patterns
```typescript
// ✅ Always include ARIA when needed
<button
  onClick={handleClick}
  aria-label="Close game"
  aria-pressed={isActive}
>
  <Icon aria-hidden="true" />
</button>
```

---

## Development Workflow

### Before Committing
1. Run TypeScript check: `npm run type-check` (if available)
2. Run build: `npm run build`
3. Test accessibility:
   - Keyboard navigation
   - Screen reader
   - Reduced motion
4. Test on mobile device
5. Check Lighthouse score

### Git Workflow
- Branch: `main` (not master)
- Commits: Clear, descriptive messages
- Push to `main`: Auto-deploys to Vercel

### Deployment
- **Auto-deploy**: Push to `main` → Vercel deploys
- **URL**: https://verygoodmelon.fun
- **Environment variables**: Set in Vercel dashboard

---

## Common Patterns

### Loading States
```typescript
if (loading) {
  return <LoadingSpinner aria-label="Loading game" />
}
```

### Error States
```typescript
if (error) {
  return (
    <EmptyState
      icon={<AlertIcon />}
      title="Oops, something went wrong"
      description="Please try refreshing the page."
    />
  )
}
```

### Game Layout
```typescript
<div className="container mx-auto px-6 py-12 max-w-4xl">
  <div className="animate-fade">
    <h1 className="text-4xl font-semibold mb-6">Game Title</h1>
    {/* Game content */}
  </div>
</div>
```

---

## When in Doubt

1. **Read DESIGN_PHILOSOPHY.md** for guidance
2. **Ask yourself**: "Is this accessible?" "Is this unique?" "Is this simple?"
3. **Test with real users** when possible
4. **Prioritize quality over speed**
5. **When stuck, look at neal.fun for inspiration** (but don't copy!)

---

## Success Metrics

### What Good Looks Like
- Users describe games as "thoughtful" or "unique"
- Neurodivergent users praise accessibility
- Games are shared for being interesting, not viral
- You're proud to show anyone
- Lighthouse scores 90+

### What Bad Looks Like
- Accessibility complaints
- "This is just like X"
- Feels rushed or incomplete
- You wouldn't play it yourself

---

## References

- **Design Philosophy**: `DESIGN_PHILOSOPHY.md` (comprehensive guide)
- **README**: `README.md` (technical overview)
- **Neal.fun**: https://neal.fun (inspiration, not template)
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/ (accessibility standard)

---

## Remember

> "Every pixel has meaning."

This isn't just another game site. It's an experiment in thoughtful design, radical accessibility, and creative web experiences.

**Quality over quantity. Always.**
