# GitHub Copilot Instructions for VeryGoodMelon.Fun

> Context for GitHub Copilot when working on this project

## Project Context

**VeryGoodMelon.Fun** creates unique, accessible, AI-powered games that reduce anxiety. Inspired by neal.fun but not copying it.

**Core Goal:** Users feel LESS ANXIOUS after visiting than before.

---

## Critical Rules (Never Break)

### 1. Emotional Impact
- ✅ Reduce anxiety, don't increase it
- ✅ Users should smile, relax, or feel "worth it"
- ❌ No stress, no competition, no time pressure

### 2. Invisible AI
- ❌ NEVER show "AI", "Powered by...", "Generating..." in UI
- ✅ Create "How did it know?" moments
- ✅ Make it feel like magic, not technology

### 3. Accessibility (Non-Negotiable)
- ✅ Keyboard navigation works perfectly
- ✅ Screen reader compatible
- ✅ ARIA labels on interactive elements
- ✅ Focus indicators visible
- ✅ Sensory controls (reduce motion, mute, contrast)
- ❌ No timing requirements that exclude users

### 4. No Clones
- ❌ Don't create direct clones (e.g., "Flappy Bird with watermelons")
- ✅ Must have unique twist or innovation
- ✅ Inspiration OK, copying NOT OK

### 5. Quality Bar
Ask before building:
1. Will users feel less anxious after?
2. Is it unique (not a clone)?
3. Is it fully accessible?
4. Is it polished?
5. Is it lighter than the real world?

If any answer is "no" or "maybe" → Don't build it.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **AI:** Google Gemini via `@google/genai`, model ID only in `lib/ai/gemini.ts` (invisible to users)
- **Testing:** Vitest (real API tests, NO MOCKS)

---

## Code Patterns

### AI Integration (Invisible)
```typescript
// ✅ GOOD
import { generateGameContent } from '@/lib/ai/gemini'

const content = await generateGameContent('story', context, {
  style: 'calming',
  length: 'short'
})

// Fallback if AI unavailable
const final = content || FALLBACK_CONTENT

// ❌ BAD
<p>AI is generating your story...</p>
```

### Accessibility Pattern
```typescript
// ✅ GOOD
import { useAccessibility } from '@/lib/hooks/useAccessibility'

function MyGame() {
  const { settings } = useAccessibility()

  return (
    <div role="application" aria-label="Game name">
      <button
        onClick={handleClick}
        aria-label="Clear action"
        className="focus:ring-2 focus:ring-accent"
      >
        Action
      </button>
    </div>
  )
}

// ❌ BAD
<div onClick={handleClick}>
  Click me
</div>
```

### Component Structure
```typescript
// ✅ GOOD: Typed, accessible, responsive
interface GameProps {
  title: string
  onComplete?: () => void
}

export function Game({ title, onComplete }: GameProps) {
  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-4xl font-semibold">{title}</h1>
      {/* Content */}
    </div>
  )
}
```

---

## File Structure

```
shak.fun/
├── app/                    # Next.js pages
├── components/
│   ├── accessibility/      # Accessibility controls
│   ├── games/             # Game components
│   └── ui/                # Reusable UI
├── lib/
│   ├── ai/gemini.ts       # AI helpers
│   └── hooks/             # React hooks
├── types/                 # TypeScript types
├── tests/integration/     # Real API tests
└── docs/                  # Full documentation
```

---

## Common Tasks

### Generate AI Content
```typescript
import { generateGameContent } from '@/lib/ai/gemini'

// Story
const story = await generateGameContent('story', 'a watermelon', {
  style: 'playful',
  length: 'short'
})

// Description
const desc = await generateGameContent('description', 'a garden', {
  style: 'calming',
  length: 'medium'
})

// Always have fallback
const final = content || FALLBACK_CONTENT
```

### Use Accessibility Settings
```typescript
import { useAccessibility } from '@/lib/hooks/useAccessibility'

function MyComponent() {
  const { settings } = useAccessibility()

  const shouldAnimate = !settings.reduceMotion
  const volume = settings.muted ? 0 : settings.volume / 100

  return <div>{/* Use settings */}</div>
}
```

### Style with Tailwind
```typescript
<div className="
  px-4 py-2
  bg-white
  rounded
  transition-transform
  hover:scale-105
  focus:ring-2 focus:ring-accent
  sm:px-6 md:px-8
">
  Content
</div>
```

---

## Naming Conventions

- **Components:** PascalCase (`MyComponent.tsx`)
- **Hooks:** camelCase, start with `use` (`useAccessibility.ts`)
- **Utilities:** camelCase (`cn.ts`)
- **Types:** PascalCase (`AccessibilitySettings`)
- **CSS Classes:** kebab-case (`animate-fade`)

---

## Imports

```typescript
// ✅ GOOD: Use path aliases
import { generateText } from '@/lib/ai/gemini'
import { useAccessibility } from '@/lib/hooks/useAccessibility'
import { cn } from '@/lib/utils/cn'

// ❌ BAD: Relative paths
import { generateText } from '../../../lib/ai/gemini'
```

---

## Testing

```typescript
// Integration test (real API, NO MOCKS)
import { generateText } from '@/lib/ai/gemini'

describe('Gemini Integration', () => {
  it('should generate text', async () => {
    const result = await generateText('Hello')

    expect(result).not.toBeNull()
    expect(typeof result).toBe('string')
  }, 30000) // 30s timeout for API
})
```

Run: `npm run test:integration`

---

## What NOT to Do

- ❌ Show "AI" anywhere in UI
- ❌ Use mocks in integration tests
- ❌ Skip accessibility features
- ❌ Ignore keyboard navigation
- ❌ Create clones of existing games
- ❌ Add timing requirements
- ❌ Use dark patterns
- ❌ Inline styles (use Tailwind)
- ❌ `any` type (use proper types)
- ❌ Class components (use function components)

---

## Resources

- **Full Docs:** `/docs` directory
- **AI Context:** `/docs/AI_CONTEXT.md`
- **Design Philosophy:** `/docs/DESIGN_PHILOSOPHY.md`
- **Game Ideas:** `/docs/GAME_IDEAS.md`

---

**Remember:** Quality over quantity. Users should feel LESS ANXIOUS after visiting.
