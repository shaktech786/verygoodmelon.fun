# Testing Documentation

Comprehensive testing strategy for VeryGoodMelon.Fun

## Testing Stack

- **Unit & Integration Tests**: Vitest + React Testing Library
- **Accessibility Tests**: jest-axe + axe-core
- **Visual Regression**: Playwright
- **End-to-End**: Playwright (future)

---

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run with coverage
npm test -- --coverage
```

### Accessibility Tests
```bash
# Run accessibility tests
npm test __tests__/accessibility

# Run specific a11y test
npm test components.a11y.test.tsx
```

### Visual Regression Tests
```bash
# First install Playwright
npx playwright install

# Run visual tests
npx playwright test

# Update baseline screenshots
npx playwright test --update-snapshots

# Run specific browser
npx playwright test --project=chromium

# Run with UI mode
npx playwright test --ui
```

---

## Test Organization

```
__tests__/
├── components/          # Component unit tests
│   ├── ui/
│   │   ├── Button.test.tsx
│   │   └── Card.test.tsx
│   └── ErrorBoundary.test.tsx
├── lib/                 # Utility tests
│   └── utils/
│       └── typography.test.ts
├── accessibility/       # A11y tests
│   └── components.a11y.test.tsx
└── visual/              # Visual regression
    ├── homepage.visual.test.ts
    └── components.visual.test.ts
```

---

## Coverage Thresholds

Current thresholds (vitest.config.ts):
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

Goal: Increase to 80%+ for critical paths

---

## Accessibility Testing

### What We Test
1. **WCAG 2.1 AA Compliance**
   - Color contrast (4.5:1 minimum)
   - Keyboard navigation
   - Screen reader support
   - Focus management

2. **Component Accessibility**
   - Semantic HTML
   - ARIA attributes
   - Label associations
   - Error announcements

3. **Interactive Elements**
   - Buttons have accessible names
   - Forms have labels
   - Modals trap focus
   - Links are distinguishable

### Example Accessibility Test
```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

it('should not have accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

## Visual Regression Testing

### What We Test
1. **Cross-Browser Consistency**
   - Chrome, Firefox, Safari
   - Mobile (iOS Safari, Chrome)

2. **Responsive Design**
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

3. **Accessibility Features**
   - Dark mode
   - Reduced motion
   - High contrast

### Example Visual Test
```typescript
test('homepage renders correctly', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
  })
})
```

---

## Writing Tests

### Component Tests (Vitest)

**Good practices:**
- Test user-facing behavior, not implementation
- Use semantic queries (getByRole, getByLabelText)
- Test accessibility attributes
- Mock external dependencies
- Keep tests focused and simple

**Example:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is keyboard accessible', () => {
    render(<Button>Accessible</Button>)
    const button = screen.getByRole('button')

    button.focus()
    expect(button).toHaveFocus()
  })
})
```

### Accessibility Tests (jest-axe)

**Good practices:**
- Test all interactive components
- Test with labels, errors, helpers
- Test keyboard navigation
- Test ARIA attributes
- Test color contrast

**Example:**
```typescript
it('input has accessible label', async () => {
  const { container } = render(
    <Input label="Email" type="email" />
  )
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Visual Tests (Playwright)

**Good practices:**
- Wait for network idle
- Test critical user paths
- Update baselines intentionally
- Test dark mode variants
- Test responsive breakpoints

**Example:**
```typescript
test('button hover state', async ({ page }) => {
  await page.goto('/components')
  const button = page.locator('button').first()

  await button.hover()
  await expect(button).toHaveScreenshot('button-hover.png')
})
```

---

## Continuous Integration

### Pre-commit Checks
```bash
# Run before committing
npm test -- --run
npm run build
```

### CI Pipeline (GitHub Actions)
```yaml
- name: Run tests
  run: npm test -- --run

- name: Run accessibility tests
  run: npm test __tests__/accessibility

- name: Check coverage
  run: npm test -- --coverage --run
```

---

## Testing Checklist

### Before Shipping New Components
- [ ] Unit tests for all props
- [ ] Accessibility test with axe
- [ ] Visual regression test
- [ ] Keyboard navigation test
- [ ] Mobile responsiveness test
- [ ] Dark mode test
- [ ] Reduced motion test
- [ ] Error states tested
- [ ] Loading states tested

### Before Shipping New Pages
- [ ] Lighthouse score 90+
- [ ] Accessibility audit passes
- [ ] Visual regression baseline
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] SEO metadata verified

---

## Common Issues & Solutions

### Issue: Tests timeout
**Solution**: Increase timeout in vitest.config.ts
```typescript
test: {
  testTimeout: 10000, // 10 seconds
}
```

### Issue: Flaky visual tests
**Solution**: Wait for network idle and animations
```typescript
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500) // Wait for animations
```

### Issue: Accessibility violations in third-party components
**Solution**: Wrap in accessible container or suppress specific rules
```typescript
const results = await axe(container, {
  rules: {
    'color-contrast': { enabled: false } // Only if necessary
  }
})
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [Playwright](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## Next Steps

1. **Increase coverage** to 80%+
2. **Add E2E tests** for critical user flows
3. **Automate visual tests** in CI/CD
4. **Performance testing** with Lighthouse CI
5. **Load testing** for game endpoints
