import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('class1', 'class2', 'class3')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
    expect(result).toContain('class3')
  })

  it('handles conditional classes', () => {
    const result = cn('base', true && 'truthy', false && 'falsy')
    expect(result).toContain('base')
    expect(result).toContain('truthy')
    expect(result).not.toContain('falsy')
  })

  it('handles undefined and null', () => {
    const result = cn('class1', undefined, null, 'class2')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
  })

  it('merges Tailwind classes correctly (later classes override)', () => {
    const result = cn('px-4', 'px-6')
    // Should keep px-6 (later class)
    expect(result).toContain('px-6')
  })

  it('handles empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
    expect(result).toContain('class3')
  })
})
