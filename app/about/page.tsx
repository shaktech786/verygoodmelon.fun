import { ExternalLink } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="container mx-auto px-6 py-12 max-w-3xl">
      <div className="animate-fade">
        <h1 className="text-4xl md:text-5xl font-semibold text-foreground mb-6">
          About
        </h1>

        <div className="space-y-6 text-primary-light leading-relaxed">
          <p className="text-lg">
            VeryGoodMelon.Fun is a side project by <span className="text-foreground font-medium">Shakeel Bhamani</span>,
            a Lead Consultant at ThoughtWorks in Atlanta, Georgia.
          </p>

          <p>
            By day, I build AI solutions for Fortune 500 clients. By night, I explore the intersection
            of technology, creativity, and purpose through projects like this.
          </p>

          <p>
            This site is an experiment in thoughtful design—games that engage without addicting,
            interfaces that respect your attention, and experiences that might just make you think.
          </p>

          <div className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Background</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li>Lead Consultant at ThoughtWorks</li>
              <li>Georgia Tech educated</li>
              <li>TEDx Speaker</li>
              <li>2017 Beatbox Vice Champion</li>
              <li>9+ years in software development</li>
            </ul>
          </div>

          <div className="pt-6 border-t border-card-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Connect</h2>
            <div className="flex flex-col gap-3">
              <a
                href="https://shak-tech.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:underline transition-colors"
              >
                Website
                <ExternalLink size={16} />
              </a>
              <a
                href="https://linkedin.com/in/shakeelbhamani"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:underline transition-colors"
              >
                LinkedIn
                <ExternalLink size={16} />
              </a>
              <a
                href="https://github.com/shaktech786"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:underline transition-colors"
              >
                GitHub
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-card-border">
            <p className="text-sm text-primary-light italic">
              &ldquo;Every pixel has meaning.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
