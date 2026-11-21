import { describe, expect, it } from 'vitest'
import { confirmationEmailHtml } from '@/lib/email/templates'

describe('confirmationEmailHtml', () => {
  it('escapes the requester name so it cannot inject markup into the email', () => {
    const html = confirmationEmailHtml({
      requesterName: '<a href="https://evil.example">Click</a>',
      requestedName: 'Hypatia',
    })

    expect(html).not.toContain('<a href="https://evil.example">')
    expect(html).toContain('Hi &lt;a href=&quot;https://evil.example&quot;&gt;Click&lt;/a&gt;,')
  })

  it('links back to the game at its real address', () => {
    const html = confirmationEmailHtml({ requestedName: 'Hypatia' })

    expect(html).toContain('/games/ancient-voices"')
    expect(html).not.toContain('/timeless-minds"')
  })
})
