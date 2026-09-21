# AI Context - Quick Reference

> One-page context for AI assistants working on VeryGoodMelon.Fun

## Project Overview

**VeryGoodMelon.Fun** is a thoughtful game portal inspired by neal.fun but with its own identity. It creates unique, accessible, AI-powered web experiences that reduce anxiety and add genuine value.

**Core Success Metric:** Users feel LESS ANXIOUS when leaving than when they arrived.

---

## Critical Principles (Never Violate)

### 1. Emotional Impact (Top Priority)
- ✅ Reduce anxiety, don't increase it
- ✅ Users smile, relax, or feel "that was worth it"
- ✅ Add genuine value (relaxation, growth, motivation)
- ✅ Natural return, not addictive compulsion

### 2. Invisible AI (Always)
- ❌ NEVER show "AI", "Powered by...", "AI is generating..." in UI
- ✅ Create "How did it know that?" moments
- ✅ Make experiences feel impossibly clever
- ✅ Users think it's magic, not machine learning

### 3. Accessibility (Non-Negotiable)
- ✅ Keyboard-only navigation works perfectly
- ✅ Screen reader compatible
- ✅ Sensory controls (reduce motion, mute, contrast, colorblind modes)
- ✅ No timing requirements that exclude users
- ✅ WCAG 2.1 AA minimum, AAA preferred

### 4. Originality & Value
- ❌ No clones ("Flappy Bird with watermelons" = NO)
- ✅ Unique twist or innovation required
- ✅ Must add value to the world
- ✅ Inspiration OK, copying NOT OK

### 5. Tone
- ✅ Lighter than the real world
- ✅ Never too serious or heavy
- ❌ Doesn't increase stress
- ✅ Playful, thoughtful, or calming

---

## Tech Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **AI:** Google Gemini 2.0 Flash (invisible to users)
- **Database:** Supabase PostgreSQL
- **Deployment:** Vercel (auto-deploy on push to main)
- **Testing:** Vitest (real API tests, NO MOCKS)

---

## Quality Checklist

Before building ANYTHING, answer these:

1. ❓ Will users feel **less anxious after** than before?
2. ❓ Is it **unique** (not a clone)?
3. ❓ Is it **fully accessible** (keyboard, screen reader, sensory controls)?
4. ❓ Is it **polished** (would you show anyone without caveats)?
5. ❓ Is it **lighter than real world** (doesn't increase stress)?

**If ANY answer is "no" or "maybe"** → Don't build it or fix it first.

---

## Code Patterns

### AI Integration (Invisible)
```typescript
import { generateGameContent } from '@/lib/ai/gemini'

// ✅ GOOD: AI is invisible
const description = await generateGameContent('description', context, {
  style: 'calming',
  length: 'short'
})

// ❌ BAD: Exposes AI to user
<p>AI is generating your story...</p>
```

### Accessibility Controls
```typescript
import { useAccessibility } from '@/lib/hooks/useAccessibility'

function MyGame() {
  const { settings } = useAccessibility()

  // Respect user preferences
  const shouldAnimate = !settings.reduceMotion
  const volume = settings.muted ? 0 : settings.volume / 100
}
```

### Component Structure
```typescript
// ✅ Accessible component pattern
export function MyComponent() {
  return (
    <div role="application" aria-label="Component name">
      <h2 id="title">Title</h2>
      <button
        onClick={handleClick}
        aria-label="Clear action description"
        className="focus:ring-2 focus:ring-accent"
      >
        Action
      </button>
    </div>
  )
}
```

---

## File Structure

```
verygoodmelon.fun/
├── docs/                       # All documentation (you are here)
│   ├── README.md              # Index
│   ├── AI_CONTEXT.md          # This file
│   ├── DESIGN_PHILOSOPHY.md   # Full philosophy
│   ├── ACCESSIBILITY_CONTROLS.md
│   ├── GAME_IDEAS.md
│   └── AI_INTEGRATION.md
├── .claude/                   # Claude Code memory
│   └── CLAUDE.md              # Loaded every session
├── app/                       # Next.js app
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Homepage
├── components/
│   ├── accessibility/         # Accessibility controls
│   ├── games/                 # Game components
│   └── ui/                    # Reusable UI
├── lib/
│   ├── ai/                    # AI integration
│   │   └── gemini.ts          # Gemini wrapper
│   └── hooks/                 # React hooks
│       └── useAccessibility.ts
├── types/                     # TypeScript types
├── tests/
│   └── integration/           # Real API tests
└── public/                    # Static assets
```

---

## Common Tasks

### Adding a New Game
1. Read `docs/GAME_IDEAS.md` for validated concepts
2. Create component in `components/games/[GameName].tsx`
3. Implement accessibility controls
4. Test keyboard-only navigation
5. Test with screen reader
6. Verify "less anxious" goal

### Using AI Invisibly
```typescript
// Generate content
const content = await generateText(prompt, { temperature: 0.9 })

// Stream content (but hide "typing" indicator)
await generateTextStream(prompt, (chunk) => {
  // Update UI silently
  setText(prev => prev + chunk)
})

// Multi-turn conversation
const conversation = new GeminiConversation()
const response = await conversation.sendMessage(userInput)
```

### Testing
```bash
# Run all tests
npm test

# Run integration tests with real API (NO MOCKS)
npm run test:integration

# Watch mode
npm run test:watch
```

---

## Dealbreakers (Never Do)

- ❌ Expose AI to users ("Powered by AI", "AI is generating...")
- ❌ Create direct clones of existing games
- ❌ Build anything that increases anxiety
- ❌ Skip accessibility features
- ❌ Ignore keyboard navigation
- ❌ Add timing requirements that exclude users
- ❌ Use dark patterns or addiction mechanics
- ❌ Waste user's time or attention

---

## Success Indicators

- ✅ Users describe games as "thoughtful" or "unique"
- ✅ Neurodivergent users praise accessibility
- ✅ People return for value, not addiction
- ✅ You'd proudly show it to anyone
- ✅ Lighthouse scores 90+
- ✅ Users feel better after visiting

---

## Quick Links

- **Full Philosophy:** [DESIGN_PHILOSOPHY.md](./DESIGN_PHILOSOPHY.md)
- **Accessibility Spec:** [ACCESSIBILITY_CONTROLS.md](./ACCESSIBILITY_CONTROLS.md)
- **Game Ideas:** [GAME_IDEAS.md](./GAME_IDEAS.md)
- **Development Guide:** [DEVELOPMENT.md](./DEVELOPMENT.md)
- **AI Integration:** [AI_INTEGRATION.md](./AI_INTEGRATION.md)

---

**Remember:** Quality over quantity. One amazing game beats ten mediocre ones.

**Mantra:** Users should feel LESS ANXIOUS when leaving than when they arrived.
