import { TYPOGRAPHY, getTypographyClasses } from '@/lib/utils/typography'

describe('typography utilities', () => {
  describe('TYPOGRAPHY constants', () => {
    it('has display variants', () => {
      expect(TYPOGRAPHY.display.xl).toBeDefined()
      expect(TYPOGRAPHY.display.lg).toBeDefined()
      expect(TYPOGRAPHY.display.md).toBeDefined()
      expect(TYPOGRAPHY.display.sm).toBeDefined()
    })

    it('has heading variants', () => {
      expect(TYPOGRAPHY.heading.h1).toBeDefined()
      expect(TYPOGRAPHY.heading.h2).toBeDefined()
      expect(TYPOGRAPHY.heading.h3).toBeDefined()
      expect(TYPOGRAPHY.heading.h4).toBeDefined()
      expect(TYPOGRAPHY.heading.h5).toBeDefined()
      expect(TYPOGRAPHY.heading.h6).toBeDefined()
    })

    it('has body variants', () => {
      expect(TYPOGRAPHY.body.xl).toBeDefined()
      expect(TYPOGRAPHY.body.lg).toBeDefined()
      expect(TYPOGRAPHY.body.md).toBeDefined()
      expect(TYPOGRAPHY.body.sm).toBeDefined()
      expect(TYPOGRAPHY.body.xs).toBeDefined()
    })
  })

  describe('getTypographyClasses', () => {
    it('returns correct classes for display variants', () => {
      expect(getTypographyClasses('display', 'xl')).toBe(TYPOGRAPHY.display.xl)
      expect(getTypographyClasses('display', 'lg')).toBe(TYPOGRAPHY.display.lg)
    })

    it('returns correct classes for heading variants', () => {
      expect(getTypographyClasses('heading', 'h1')).toBe(TYPOGRAPHY.heading.h1)
      expect(getTypographyClasses('heading', 'h2')).toBe(TYPOGRAPHY.heading.h2)
    })

    it('returns correct classes for body variants', () => {
      expect(getTypographyClasses('body', 'lg')).toBe(TYPOGRAPHY.body.lg)
      expect(getTypographyClasses('body', 'sm')).toBe(TYPOGRAPHY.body.sm)
    })

    it('merges with additional classes', () => {
      const result = getTypographyClasses('body', 'md', 'text-accent')
      expect(result).toContain(TYPOGRAPHY.body.md)
      expect(result).toContain('text-accent')
    })
  })
})
