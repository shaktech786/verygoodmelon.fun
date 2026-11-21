const link = 'font-semibold text-foreground underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/** The free support lines, said the same way wherever the site offers them. */
export function HelplineSentence({ lead }: { lead: string }) {
  return (
    <>
      {lead} Free support, any hour: call or text <a href="tel:988" className={link}>988</a> (US), call{' '}
      <a href="tel:116123" className={link}>116 123</a> (UK and Ireland), or{' '}
      <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className={link}>
        findahelpline.com
      </a>
      .
    </>
  )
}
