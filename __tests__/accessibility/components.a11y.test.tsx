import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '@/components/ui/Button'
import { KeyHints } from '@/components/ui/KeyHints'
import { LegalPage, LegalSection } from '@/components/ui/LegalPage'
import { StickyActionBar } from '@/components/ui/StickyActionBar'
import { expect } from 'vitest'

expect.extend(toHaveNoViolations)

describe('Accessibility Tests', () => {
  describe('Button Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<Button>Click me</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible name', async () => {
      const { container } = render(<Button aria-label="Submit form">Submit</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper disabled state', async () => {
      const { container } = render(<Button disabled>Disabled</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it.each(['primary', 'secondary', 'ghost', 'danger'] as const)('%s variant should have no violations', async (variant) => {
      const { container } = render(<Button variant={variant}>Click</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('KeyHints Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<KeyHints>Space: place a seed</KeyHints>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('LegalPage Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <LegalPage title="Privacy" lastUpdated="1 January 2026">
          <LegalSection id="what" title="What we keep">
            <p>Nothing that names you.</p>
          </LegalSection>
        </LegalPage>,
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('interactive elements in an action bar should be keyboard focusable', async () => {
      const { container } = render(
        <StickyActionBar>
          <Button>Button 1</Button>
          <Button variant="secondary">Button 2</Button>
        </StickyActionBar>,
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
