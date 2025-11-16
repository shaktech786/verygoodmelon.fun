import { render, screen } from '@testing-library/react'
import { Card } from '@/components/ui/Card'

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies hover effect when hover prop is true', () => {
    const { container } = render(<Card hover>Hoverable</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('hover:scale-105', 'transition-transform')
  })

  it('applies padding variant styles', () => {
    const { container, rerender } = render(<Card padding="none">No padding</Card>)
    expect(container.firstChild).toHaveClass('p-0')

    rerender(<Card padding="sm">Small padding</Card>)
    expect(container.firstChild).toHaveClass('p-4')

    rerender(<Card padding="md">Medium padding</Card>)
    expect(container.firstChild).toHaveClass('p-6')

    rerender(<Card padding="lg">Large padding</Card>)
    expect(container.firstChild).toHaveClass('p-8')
  })

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Custom</Card>)
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has default background and border styles', () => {
    const { container } = render(<Card>Default</Card>)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('bg-card-bg', 'border', 'border-card-border')
  })

  it('has rounded corners', () => {
    const { container } = render(<Card>Rounded</Card>)
    expect(container.firstChild).toHaveClass('rounded-xl')
  })
})
