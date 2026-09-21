# VeryGoodMelon.Fun - Quick Context (Token-Optimized)

## Core
**Goal:** Users feel LESS ANXIOUS after visiting
**Tech:** Next.js 16, TS strict, Tailwind v4, Gemini AI (invisible)
**Deploy:** Vercel, auto from `main`

## Quality Checklist
1. Less anxious after?
2. Unique (not clone)?
3. Accessible (keyboard+screen reader)?
4. Polished?
5. Lighter than real world?

❌ If any "no"/"maybe" → don't build

## Critical Rules
- ❌ NEVER show "AI" in UI
- ✅ Keyboard nav + ARIA labels
- ✅ Use `useAccessibility()` hook
- ❌ No clones (e.g., "Flappy Bird + watermelons")
- ✅ Have fallbacks for AI failures

## Paths
```
lib/ai/gemini.ts       - AI helpers
lib/hooks/             - React hooks
components/accessibility/ - A11y controls
docs/                  - Full context if needed
```

## Patterns
```ts
// AI (invisible)
import { generateCached } from '@/lib/ai/token-manager'
const text = await generateCached(key, prompt, { maxTokens: 256 })

// Accessibility
import { useAccessibility } from '@/lib/hooks/useAccessibility'
const { settings } = useAccessibility()

// Components
<button aria-label="Action" className="focus:ring-2">Text</button>
```

## Commands
```bash
npm run dev             # Start dev
npm run test:integration # Real API tests (no mocks)
```

**Full docs:** `/docs/AI_CONTEXT.md` (only read if needed)
