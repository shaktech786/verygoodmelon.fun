import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Stamp } from '@/components/seedpress/Stamp'
import { KeyHints } from '@/components/seedpress/KeyHints'
import { Prose, ProseSection } from '@/components/seedpress/Prose'
import { StickyTray } from '@/components/seedpress/StickyTray'
import { expect } from 'vitest'

expect.extend(toHaveNoViolations)

describe('Accessibility Tests', () => {
  describe('KeyHints Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(<KeyHints>Space: place a seed</KeyHints>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Prose Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Prose title="Privacy" meta="Last updated: 1 January 2026">
          <ProseSection id="what" title="What we keep">
            <p>Nothing that names you.</p>
          </ProseSection>
        </Prose>,
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('interactive elements in a tray should be keyboard focusable', async () => {
      const { container } = render(
        <StickyTray>
          <Stamp>Button 1</Stamp>
          <Stamp>Button 2</Stamp>
        </StickyTray>,
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
