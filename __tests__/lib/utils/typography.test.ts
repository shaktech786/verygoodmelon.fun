import { TYPOGRAPHY, getTypography } from '@/lib/utils/typography'

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

  describe('getTypography', () => {
    it('returns correct classes for display variants', () => {
      expect(getTypography('display.xl')).toBe(TYPOGRAPHY.display.xl)
      expect(getTypography('display.lg')).toBe(TYPOGRAPHY.display.lg)
    })

    it('returns correct classes for heading variants', () => {
      expect(getTypography('heading.h1')).toBe(TYPOGRAPHY.heading.h1)
      expect(getTypography('heading.h2')).toBe(TYPOGRAPHY.heading.h2)
    })

    it('returns correct classes for body variants', () => {
      expect(getTypography('body.lg')).toBe(TYPOGRAPHY.body.lg)
      expect(getTypography('body.sm')).toBe(TYPOGRAPHY.body.sm)
    })

    it('merges with additional classes', () => {
      const result = getTypography('body.md', 'text-accent')
      expect(result).toContain(TYPOGRAPHY.body.md)
      expect(result).toContain('text-accent')
    })
  })
})
