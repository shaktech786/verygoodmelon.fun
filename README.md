# VeryGoodMelon.Fun 🍉

**Thoughtful games to reduce anxiety.** A collection of creative, accessible web games designed for relaxation and reflection. No ads, no accounts, no distractions.

[**Play Now →**](https://verygoodmelon.fun)

---

## 🎮 Games

Fourteen games in three groups. The list in `lib/games/config.ts` is the source of truth.

### Slow down
- **[The Patient One](https://verygoodmelon.fun/games/the-long-breath)**: A game that rewards you for not rushing
- **[The Harmonist](https://verygoodmelon.fun/games/the-still-point)**: Breathe along with animated patterns that calm you down
- **[The Gardener](https://verygoodmelon.fun/games/quiet-grove)**: Plant a quiet garden and see who comes to visit
- **[The Keeper](https://verygoodmelon.fun/games/the-slow-post)**: Seal a worry away, then see if it came true
- **[The Envoy](https://verygoodmelon.fun/games/the-threshold)**: Settle, find your words, walk in with one line

### Reflect
- **[The Sage](https://verygoodmelon.fun/games/ancient-voices)**: Ask life questions to history's greatest thinkers
- **[The Dilemma](https://verygoodmelon.fun/games/the-crossroads)**: Twelve questions with no right answer, and what your choices protect
- **[The Final Word](https://verygoodmelon.fun/games/final-breath)**: Write what you'd say at the end and read others' words
- **[The Awakening](https://verygoodmelon.fun/games/first-breath)**: Imagine the moment after your life ends, say your first words, then wake up
- **[The Arena](https://verygoodmelon.fun/games/the-arena)**: Pick two people and a topic, then watch them argue it out

### Play
- **[The Optimist](https://verygoodmelon.fun/games/the-silver-lining)**: Guess the word, discover something good about the world
- **[The Alchemist](https://verygoodmelon.fun/games/idea-lab)**: Mix two ideas and find the seven golds
- **[The Philosopher](https://verygoodmelon.fun/games/thought-pockets)**: A deckbuilder where you build arguments against cognitive biases
- **[The Shapeshifter](https://verygoodmelon.fun/games/the-mutation)**: Play a game that keeps changing its mind, and can't be lost

---

## ✨ Features

### Core Experience
- **Zero Friction** - No accounts, no logins, just play
- **Accessible First** - WCAG 2.1 AA+, neurodivergent-friendly
- **Anxiety Reduction** - Games designed to calm, not stress
- **Pixelated Aesthetic** - Retro charm with modern polish
- **Invisible AI** - Smart experiences without "AI" labels

### Accessibility Panel
Built-in accessibility controls accessible via button in corner:
- **Visual**: Reduce motion, contrast modes (normal/high/extra-high), animation speed
- **Colorblind**: Deuteranopia, protanopia, tritanopia, monochrome filters
- **Audio**: Mute toggle, volume control
- **Interaction**: Pause animations on demand
- **Quick Presets**: Calm Mode, Focus Mode, Sensory-Friendly Mode

### Technical Excellence
- **Performance**: 90+ Lighthouse scores, optimized builds
- **Real-time Data**: Supabase for live game data and community features
- **Modern Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Fast Deployment**: Auto-deploy via Vercel on push to main

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15.5.4 (App Router + Turbopack) |
| **Runtime** | Node.js v24.10.0 |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS v4 with custom CSS variables |
| **Database** | Supabase (PostgreSQL with RLS) |
| **AI** | Google Gemini 2.0 Flash (primary), OpenAI (fallback) |
| **Deployment** | Vercel (auto-deploy) |
| **Analytics** | Vercel Speed Insights |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v24.10.0+ (uses `.nvmrc`)
- **npm**: v11.6.0+
- **Supabase**: Account for database (optional for frontend-only work)

### Quick Start

```bash
# Use correct Node version
nvm use

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# Run dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# AI Services (optional - for Timeless Minds game)
GOOGLE_GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key

# Site Config
NEXT_PUBLIC_SITE_NAME=VeryGoodMelon.Fun
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Build & Deploy

```bash
# Production build
npm run build

# Start production server locally
npm run start

# Deploy (auto-deploys on push to main)
git push origin main
```

---

## 📁 Project Structure

```
verygoodmelon.fun/
├── app/                          # Next.js App Router
│   ├── games/                    # Game pages
│   │   ├── bowling/              # The Striker
│   │   ├── hope-daily/           # The Optimist
│   │   ├── timeless-minds/       # The Sage
│   │   ├── hard-choices/         # The Dilemma
│   │   └── last-words/           # The Final Word
│   ├── about/                    # About page
│   ├── globals.css               # Global styles + accessibility CSS
│   ├── layout.tsx                # Root layout with Quicksand font
│   └── page.tsx                  # Homepage with game cards
├── components/
│   ├── accessibility/            # Accessibility panel
│   ├── games/                    # Game components
│   │   ├── Bowling.tsx
│   │   ├── HopeDaily.tsx
│   │   ├── TimelessMinds.tsx
│   │   ├── HardChoices.tsx
│   │   └── LastWords.tsx
│   └── ui/                       # Reusable UI components
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── Card.tsx
│       └── AccessibilityButton.tsx
├── lib/
│   ├── games/
│   │   └── config.ts             # Central game configuration (SSOT)
│   ├── hooks/
│   │   └── useAccessibility.ts   # Accessibility state management
│   ├── supabase/                 # Supabase client setup
│   └── utils/                    # Helper functions
├── supabase/
│   └── migrations/               # Database migrations
├── types/
│   ├── accessibility.ts          # Accessibility types & presets
│   └── database.ts               # Supabase generated types
├── public/
│   ├── logo.png                  # Pixelated watermelon logo
│   └── games/                    # Game assets (card SVGs)
└── README.md                     # You are here
```

---

## 🎨 Design System

### Color Palette (Watermelon-Inspired)

```css
--background: #fafafa;        /* Light grey */
--foreground: #1a1a1a;        /* Dark text */
--primary: #2d3748;           /* Charcoal */
--accent: #e63946;            /* Coral red (watermelon) */
--success: #74c69d;           /* Light green (rind) */
--melon-green: #1a4d2e;       /* Dark green */
--card-bg: #ffffff;           /* White cards */
```

### Typography
- **Font**: Quicksand (Google Fonts, optimized)
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)
- **Line Height**: 1.6 for readability

### Visual Language
- **Pixelated Aesthetic**: Crisp pixel art via `image-rendering: pixelated`
- **Minimal UI**: Every element has meaning
- **Fast Transitions**: 75ms for snappy feel
- **Generous Spacing**: Never cramped
- **Soft Shadows**: Subtle depth without harshness

---

## ♿ Accessibility

### Standards Compliance
- **WCAG 2.1 AA+** - Exceeds baseline requirements
- **Keyboard Navigation** - All features accessible without mouse
- **Screen Readers** - Semantic HTML + ARIA labels throughout
- **Color Contrast** - 4.5:1 minimum for text
- **Focus Indicators** - Clear, visible focus states

### Neurodivergent-Friendly
- **Predictable Patterns** - Consistent UI/UX
- **Optional Controls** - Animation, sound, motion toggles
- **No Time Pressure** - Play at your own pace
- **Undo/Reset** - Always available
- **Simple Instructions** - Clear, direct language
- **Calm Sensory Experience** - No flashing, loud sounds, or jarring effects

### Testing Checklist
Before shipping features:
- [ ] Keyboard-only navigation works
- [ ] Screen reader announces content correctly
- [ ] Reduced motion preference respected
- [ ] Mobile tested (iOS Safari + Android Chrome)
- [ ] Lighthouse accessibility score 90+

---

## 🎯 Game Development Guidelines

### Before Building a Game

Ask these questions FIRST:

#### 1. Emotional Impact (Most Important)
- ❓ Will users feel **less anxious** after playing?
- ❓ Will they **smile, relax, or feel it was worth their time**?
- ❓ Does it add **genuine value** (relaxation, growth, motivation)?
- ❓ Will they **return naturally**, not compulsively?

#### 2. Originality & Value
- ❓ More than a clone with different graphics?
- ❓ What's the **unique twist**?
- ❓ What **value does it add to the world**?

#### 3. Accessibility (Non-Negotiable)
- ❓ **Keyboard-only** playable?
- ❓ **Screen reader** compatible?
- ❓ **Sensory controls** included?
- ❓ No **timing requirements**?

**If ANY answer is "no"** → Don't build it or fix it first.

### Adding a New Game

1. **Create migration** (if database needed):
   ```bash
   # Create migration file
   supabase migration new game_name_schema

   # Apply migration
   supabase db push

   # Regenerate types
   supabase gen types typescript --project-id PROJECT_ID > types/database.ts
   ```

2. **Create game card SVG**:
   - Size: 1024x1792 (playing card aspect ratio)
   - Style: Pixelated/minimalist matching logo
   - Save to: `public/games/game-slug/card.svg`

3. **Create game page**:
   ```bash
   mkdir -p app/games/game-slug
   # Create page.tsx with metadata
   ```

4. **Create game component**:
   ```bash
   # Add to components/games/GameName.tsx
   ```

5. **Add to config**:
   ```typescript
   // lib/games/config.ts
   {
     id: 'game-id',
     slug: 'game-slug',
     title: 'The Game Title',
     description: 'Short description',
     cardImage: '/games/game-slug/card.svg',
     difficulty: 'easy' | 'medium' | 'hard',
     category: 'Action' | 'Puzzle' | 'Wisdom' | 'Thought' | 'Creative',
     accentColor: 'accent' | 'success' | 'warning' | 'purple',
     isShowcase: true,
     tags: ['tag1', 'tag2'],
     order: 6,
   }
   ```

6. **Test thoroughly**:
   - Keyboard navigation
   - Screen reader
   - Mobile devices
   - Accessibility panel interactions
   - Build succeeds: `npm run build`

---

## 🗄️ Database Schema

### Tables

#### `last_words`
Stores user submissions for The Final Word game:
```sql
CREATE TABLE last_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  words TEXT NOT NULL CHECK (char_length(words) <= 500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `hope_daily_words` & `hope_daily_submissions`
Daily word puzzles and commentary for The Optimist.

#### `timeless_minds_conversations`
Chat history for The Sage game.

#### `hard_choices_votes`
Voting data for The Dilemma game.

### Row-Level Security (RLS)
All tables have RLS enabled:
- **Read**: Anyone can read
- **Insert**: Anyone can insert (anonymous submissions)
- **Update/Delete**: Restricted or disabled

---

## 🔧 Development Tips

### Hot Reload Issues?
```bash
# Clear Next.js cache
rm -rf .next && npm run dev
```

### TypeScript Errors After Migration?
```bash
# Regenerate Supabase types
supabase gen types typescript --project-id ihaqvdcckjccxhfabgwd > types/database.ts
```

### Turbopack Font Issues in Dev?
This is a known Turbopack bug with Google Fonts. Build with webpack works fine:
```bash
npm run build  # Uses webpack, fonts work correctly
```

### Database Migration Workflow
```bash
# List migrations
supabase db list

# Push migrations to prod
supabase db push

# Reset local dev database
supabase db reset
```

---

## 📊 Performance

### Lighthouse Scores
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 100

### Optimization Techniques
- **Image Optimization**: Next.js Image component with priority loading
- **Font Optimization**: Google Fonts with `font-display: swap`
- **Code Splitting**: Automatic route-based splitting
- **CSS Extraction**: Tailwind v4 with minimal output
- **Static Generation**: Pre-rendered pages where possible

---

## 🤝 Contributing

This is a personal project, but if you have ideas:

1. **Open an issue** for discussion
2. **Fork & PR** for small fixes
3. **Follow the design philosophy** (see `.claude/CLAUDE.md`)

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Semantic HTML
- Accessibility-first
- Comments explain "why", not "what"

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file

---

## 🙏 Credits

- **Inspired by**: [neal.fun](https://neal.fun) - for proving simple web games can be profound
- **Design Philosophy**: Minimal, accessible, thoughtful
- **Built by**: [Shakeel Bhamani](https://shak-tech.com)
- **Logo**: Pixelated watermelon with Palestinian flag colors

---

## 🔗 Links

- **Live Site**: [verygoodmelon.fun](https://verygoodmelon.fun)
- **GitHub**: [shaktech786/verygoodmelon.fun](https://github.com/shaktech786/verygoodmelon.fun)
- **LinkedIn**: [shakeelbhamani](https://linkedin.com/in/shakeelbhamani)
- **Website**: [shak-tech.com](https://shak-tech.com)

---

**Made with purpose. Every pixel has meaning.** 🍉
