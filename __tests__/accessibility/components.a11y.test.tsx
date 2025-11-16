import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { expect } from 'vitest'

// Extend expect with axe matchers
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
  })

  describe('Card Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Card>
          <h2>Card Title</h2>
          <p>Card content</p>
        </Card>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Input Component', () => {
    it('should not have accessibility violations with label', async () => {
      const { container } = render(
        <Input label="Email" type="email" />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should properly associate label with input', async () => {
      const { container } = render(
        <Input label="Name" id="name-input" />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible error messages', async () => {
      const { container } = render(
        <Input label="Email" error="Invalid email address" />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should mark required fields accessibly', async () => {
      const { container } = render(
        <Input label="Required field" required />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Textarea Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Textarea label="Description" />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Modal Component', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <ModalHeader>
            <h2>Modal Title</h2>
          </ModalHeader>
          <ModalBody>
            <p>Modal content</p>
          </ModalBody>
          <ModalFooter>
            <Button>Close</Button>
          </ModalFooter>
        </Modal>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper dialog role', async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <ModalBody>Content</ModalBody>
        </Modal>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Color Contrast', () => {
    it('primary button should have sufficient contrast', async () => {
      const { container } = render(<Button variant="primary">Click</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('secondary button should have sufficient contrast', async () => {
      const { container } = render(<Button variant="secondary">Click</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('danger button should have sufficient contrast', async () => {
      const { container} = render(<Button variant="danger">Delete</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('interactive elements should be keyboard focusable', async () => {
      const { container } = render(
        <div>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
          <Input label="Input" />
        </div>
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})
