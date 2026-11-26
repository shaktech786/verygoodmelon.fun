import { HELPLINES, HELPLINES_AVAILABLE, sentenceVerb } from '@/lib/care/helplines'

const link = 'font-semibold text-foreground underline underline-offset-4 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring'

/** The free support lines, said the same way wherever the site offers them. */
export function HelplineSentence({ lead }: { lead: string }) {
  const [us, ukIe, directory] = HELPLINES
  return (
    <>
      {lead} {HELPLINES_AVAILABLE} {sentenceVerb(us)} <a href={us.href} className={link}>{us.label}</a> ({us.region}), {sentenceVerb(ukIe)}{' '}
      <a href={ukIe.href} className={link}>{ukIe.label}</a> ({ukIe.region}), or{' '}
      <a href={directory.href} target="_blank" rel="noopener noreferrer" className={link}>
        {directory.label}
      </a>
      .
    </>
  )
}
