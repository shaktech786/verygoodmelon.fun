import { DIRECTORY_LINE as directory, HELPLINES_AVAILABLE, UK_IE_LINE as ukIe, US_LINE as us, sentenceVerb } from '@/lib/care/helplines'

const link = 'font-semibold text-ink underline underline-offset-4 rounded-stamp focus:outline-none'

/** The free support lines, said the same way wherever the site offers them. */
export function HelplineSentence({ lead }: { lead: string }) {
  return (
    <>
      {lead} {HELPLINES_AVAILABLE} {sentenceVerb(us)} <a href={us.href} className={link}>{us.label}</a> ({us.region}), {sentenceVerb(ukIe)}{' '}
      <a href={ukIe.href} className={link}>{ukIe.label}</a> ({ukIe.region}), or{' '}
      <a href={directory.href} target="_blank" rel="noopener noreferrer" className={link}>
        {directory.label}
      <span className="sr-only"> (opens in a new tab)</span></a>
      .
    </>
  )
}
