# Design System Documentation

## Overview

This document outlines the design system for VeryGoodMelon.Fun, including components, utilities, and patterns for consistent, accessible UI development.

## Table of Contents

1. [Components](#components)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Colors](#colors)
5. [Animations](#animations)
6. [Accessibility](#accessibility)

---

## Components

### Button

**Location:** `components/ui/Button.tsx`

Reusable button component with multiple variants and sizes.

**Props:**
- `variant`: `'primary' | 'secondary' | 'ghost' | 'danger'` (default: `'primary'`)
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- All standard HTML button attributes

**Usage:**
```tsx
import { Button } from '@/components/ui/Button'

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

<Button variant="secondary" disabled>
  Disabled
</Button>

<Button variant="danger" size="lg">
  Delete
</Button>
```

**Variants:**
- `primary`: Accent background, white text (main CTAs)
- `secondary`: Card background with border (secondary actions)
- `ghost`: Transparent background (tertiary actions)
- `danger`: Red background, white text (destructive actions)

**Accessibility:**
- Built-in focus ring (`focus:ring-2`)
- Disabled state with proper cursor and opacity
- `disabled` attribute prevents interaction

---

### Input / Textarea

**Location:** `components/ui/Input.tsx`

Form input components with labels, errors, and helper text.

**Props:**
- `label`: Optional label text
- `error`: Error message (shows as red text below input)
- `helperText`: Helper text (shows as muted text below input)
- `required`: Adds asterisk to label
- `variant`: `'default' | 'filled' | 'outline'` (default: `'default'`)
- All standard HTML input/textarea attributes

**Usage:**
```tsx
import { Input, Textarea } from '@/components/ui/Input'

<Input
  label="Email"
  type="email"
  required
  error={errors.email}
  helperText="We'll never share your email"
/>

<Textarea
  label="Message"
  rows={4}
  resize={false}
  error={errors.message}
/>
```

**Variants:**
- `default`: Card background with border
- `filled`: Filled background, no border
- `outline`: Transparent with thicker border

**Accessibility:**
- Auto-generated IDs linking labels to inputs
- `aria-invalid` on errors
- `aria-describedby` for error/helper text
- `role="alert"` on error messages

---

### Modal / Dialog

**Location:** `components/ui/Modal.tsx`

Accessible modal system with overlay, escape handling, and body scroll lock.

**Props:**
- `isOpen`: Controls modal visibility
- `onClose`: Callback when modal should close
- `title`: Optional modal title
- `description`: Optional modal description
- `size`: `'sm' | 'md' | 'lg' | 'xl' | 'full'` (default: `'md'`)
- `showCloseButton`: Show X button in header (default: `true`)
- `closeOnOverlayClick`: Allow clicking overlay to close (default: `true`)

**Usage:**
```tsx
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'

<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Confirm Action"
  description="This action cannot be undone"
  size="sm"
>
  <ModalBody>
    <p>Are you sure you want to continue?</p>
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="danger" onClick={handleConfirm}>Confirm</Button>
  </ModalFooter>
</Modal>
```

**ConfirmDialog:**
Convenience component for simple confirmation dialogs:

```tsx
import { ConfirmDialog } from '@/components/ui/Modal'

<ConfirmDialog
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={handleDelete}
  title="Delete Item"
  description="This will permanently delete the item"
  confirmText="Delete"
  variant="danger"
/>
```

**Accessibility:**
- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` / `aria-describedby` for title/description
- Escape key to close
- Body scroll lock when open
- Z-index `z-[100]` (above navbar at `z-50`)
- Focus trap within modal

---

### Card

**Location:** `components/ui/Card.tsx`

Container component for grouped content.

**Props:**
- `hover`: Enable hover effects (default: `false`)
- All standard HTML div attributes

**Usage:**
```tsx
import { Card } from '@/components/ui/Card'

<Card hover>
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

---

### Badge

**Location:** `components/ui/Badge.tsx`

Small label for status, tags, or categories.

**Props:**
- `variant`: `'default' | 'success' | 'warning' | 'danger'`
- All standard HTML span attributes

**Usage:**
```tsx
import { Badge } from '@/components/ui/Badge'

<Badge variant="success">Easy</Badge>
<Badge variant="warning">Medium</Badge>
<Badge variant="danger">Hard</Badge>
```

---

### Toast Notifications

**Location:** `components/ui/Toast.tsx` + `lib/stores/toastStore.ts`

Global toast notification system using Zustand.

**Usage:**
```tsx
import { useToast } from '@/lib/stores/toastStore'

function MyComponent() {
  const { showToast } = useToast()

  const handleSuccess = () => {
    showToast({
      type: 'success',
      message: 'Changes saved successfully!',
      duration: 3000
    })
  }

  const handleError = () => {
    showToast({
      type: 'error',
      message: 'Failed to save changes',
      duration: 5000
    })
  }
}
```

**Toast Types:**
- `success`: Green with checkmark
- `error`: Red with X
- `warning`: Orange with alert icon
- `info`: Blue with info icon

**Features:**
- Auto-dismiss after duration
- Manual dismiss button
- Smooth animations
- Accessible (role="status", aria-live)

---

### WatermelonLoader

**Location:** `components/ui/WatermelonLoader.tsx`

Brand-themed loading indicator.

**Props:**
- `size`: `'sm' | 'md' | 'lg'` (default: `'md'`)
- `message`: Loading message (default: `'Loading...'`)

**Usage:**
```tsx
import { WatermelonLoader } from '@/components/ui/WatermelonLoader'

<WatermelonLoader size="lg" message="Loading game..." />
```

---

## Typography

**Location:** `lib/utils/typography.ts`

Standardized typography scale with semantic names.

### Display Sizes

Large headlines for hero sections:

```tsx
import { TYPOGRAPHY } from '@/lib/utils/typography'

<h1 className={TYPOGRAPHY.display.xl}>Hero Title</h1>
<h2 className={TYPOGRAPHY.display.lg}>Subheading</h2>
```

**Sizes:** `xl` (60px), `lg` (48px), `md` (36px), `sm` (30px)

### Headings

Section titles and card headers:

```tsx
<h1 className={TYPOGRAPHY.heading.h1}>Main Title</h1>
<h2 className={TYPOGRAPHY.heading.h2}>Section Title</h2>
<h3 className={TYPOGRAPHY.heading.h3}>Card Title</h3>
```

**Sizes:** `h1` through `h6` (36px to 16px)

### Body Text

Paragraphs and descriptions:

```tsx
<p className={TYPOGRAPHY.body.lg}>Large body text</p>
<p className={TYPOGRAPHY.body.md}>Default body text</p>
<p className={TYPOGRAPHY.body.sm}>Small body text</p>
```

**Sizes:** `xl` (20px), `lg` (18px), `md` (16px), `sm` (14px), `xs` (12px)

### Labels

Form labels, tags, badges:

```tsx
<label className={TYPOGRAPHY.label.lg}>Email Address</label>
<span className={TYPOGRAPHY.label.sm}>NEW</span>
```

### Helper Function

```tsx
import { getTypography } from '@/lib/utils/typography'

<h1 className={getTypography('heading.h1', 'text-accent')}>
  Colored Heading
</h1>
```

---

## Spacing

**Location:** `lib/utils/spacing.ts`

Standardized spacing scale (base unit: 4px).

### Spacing Scale

```tsx
import { SPACING } from '@/lib/utils/spacing'

// Component internal spacing
<div className={SPACING.component.md}>...</div>

// Section spacing
<section className={SPACING.section.lg}>...</section>

// Card padding
<div className={SPACING.card.md}>...</div>
```

### Layout Presets

Common layout patterns:

```tsx
import { LAYOUT_PRESETS } from '@/lib/utils/spacing'

<div className={LAYOUT_PRESETS.page}>Page content</div>
<div className={LAYOUT_PRESETS.pageNarrow}>Narrow page</div>

<section className={LAYOUT_PRESETS.section}>Section</section>

<div className={LAYOUT_PRESETS.card}>Card content</div>

<div className={LAYOUT_PRESETS.stackNormal}>
  <p>Item 1</p>
  <p>Item 2</p>
</div>
```

### Manual Utilities

```tsx
import { PADDING, MARGIN, GAP } from '@/lib/utils/spacing'

<div className={PADDING.all['6']}>Padding on all sides</div>
<div className={PADDING.x['4']}>Horizontal padding</div>
<div className={MARGIN.y['8']}>Vertical margin</div>
<div className={GAP['4']}>Flex/grid gap</div>
```

---

## Colors

### Theme Colors

Defined in `app/globals.css` as CSS variables:

```css
--background: #fafafa      /* Page background */
--foreground: #1a1a1a      /* Primary text */
--accent: #e63946          /* Primary brand (coral red) */
--success: #74c69d         /* Success states */
--warning: #f6ad55         /* Warning states */
--danger: #e63946          /* Danger states */
--card-bg: #ffffff         /* Card backgrounds */
--card-border: #e5e7eb     /* Borders */
--hover-bg: #f3f4f6        /* Hover states */
```

### Extended Melon Palette

Additional game colors:

```css
--melon-purple: #8b5cf6
--melon-blue: #3b82f6
--melon-orange: #f97316
--melon-pink: #ec4899
--melon-teal: #14b8a6
--melon-yellow: #f6ad55
--melon-indigo: #6366f1
--melon-emerald: #10b981
```

### Usage

```tsx
<div className="bg-accent text-white">Branded element</div>
<div className="bg-success/10 text-success">Success message</div>
<div className="bg-melon-purple text-white">Purple game element</div>
```

### Dark Mode

Automatically handled by `data-theme` attribute. All colors adapt.

---

## Animations

**Location:** `lib/utils/constants.ts`

### Transition Timings

```tsx
import { TRANSITIONS } from '@/lib/utils/constants'

// Pre-defined transitions
<button className="transition-all" style={{ transition: TRANSITIONS.HOVER }}>
  Hover me
</button>

// Individual timings
const styles = {
  transition: `transform ${TRANSITIONS.FAST} ${TRANSITIONS.EASE_OUT}`
}
```

**Timings:**
- `INSTANT`: 75ms (clicks)
- `FAST`: 150ms (hovers)
- `NORMAL`: 300ms (slides)
- `SLOW`: 500ms (complex)

**Easing:**
- `EASE_OUT`: Smooth deceleration
- `EASE_IN`: Smooth acceleration
- `EASE_IN_OUT`: Smooth both
- `BOUNCE`: Playful overshoot

### Keyframe Animations

```tsx
import { ANIMATIONS } from '@/lib/utils/constants'

<div className="animate-fade">Fades in</div>
<div className="animate-slide-up">Slides up</div>
<div className="animate-melon-spin">Watermelon loader</div>
```

**Animations:**
- `fade-in`: 400ms fade in
- `slide-up`: 300ms slide up with bounce
- `scale-in`: 200ms scale in
- `pulse`: Infinite pulse
- `melon-spin`: Watermelon loader rotation

---

## Accessibility

### Focus Management

All interactive elements have visible focus rings:

```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2">
  Accessible button
</button>
```

### ARIA Labels

Use semantic HTML and ARIA when needed:

```tsx
<button aria-label="Close modal" onClick={onClose}>
  <X aria-hidden="true" />
</button>

<div role="status" aria-live="polite">
  Loading...
</div>
```

### Screen Reader Text

Hide decorative content:

```tsx
<Icon aria-hidden="true" />
<span className="sr-only">Screen reader only text</span>
```

### Keyboard Navigation

- Tab navigation works everywhere
- Escape closes modals
- Enter/Space activates buttons
- Arrow keys for custom controls

### Reduced Motion

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Best Practices

1. **Use semantic HTML**: `<button>` not `<div onClick>`
2. **Provide alt text**: All images need descriptions
3. **Test keyboard navigation**: Tab through everything
4. **Test screen readers**: Use VoiceOver (Mac) or NVDA (Windows)
5. **Check color contrast**: Minimum 4.5:1 for text
6. **Respect motion preferences**: Use `prefers-reduced-motion`
7. **Use design tokens**: Don't hardcode colors/spacing
8. **Follow component patterns**: Don't reinvent the wheel
9. **Document custom components**: Help future developers
10. **Test on mobile**: Touch targets 44x44px minimum

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Accessibility](https://react.dev/learn/accessibility)
- [MDN ARIA](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)

---

## Questions?

See project instructions in `.claude/CLAUDE.md` or design philosophy in `DESIGN_PHILOSOPHY.md`.
