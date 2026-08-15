import { useEffect } from 'react'
import { Card, SectionHeading } from '../components/ui'
import { setPageTitle } from '../services/shareService'
import { FileText, ShieldAlert, Award, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react'

export function TermsOfServicePage() {
  useEffect(() => {
    setPageTitle('Terms of Service — Inkhel Quiz')
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        eyebrow="Legal Agreement"
        title="Terms of Service"
        subtitle="Last updated: August 2026. Rules and terms governing gameplay, scoring, and account usage."
      />

      <Card className="mt-8 space-y-8 p-6 sm:p-10 leading-relaxed text-ink-200">
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <FileText className="h-5 w-5 text-violet-400" />
            <h2>1. Acceptance of Terms</h2>
          </div>
          <p className="text-sm text-ink-300">
            By accessing or playing on <strong>Inkhel Quiz</strong> (<a href="https://quiz.inkhel.com" className="text-violet-400 underline">quiz.inkhel.com</a>), you agree to be bound by these Terms of Service, our Privacy Policy, and all official quiz rules. If you do not agree with any of these terms, please do not use our service.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <ShieldAlert className="h-5 w-5 text-violet-400" />
            <h2>2. Fair Play & Anti-Cheat Policy</h2>
          </div>
          <p className="text-sm text-ink-300">
            Inkhel Quiz is built upon competitive integrity and fair sportsmanship:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-ink-300">
            <li><strong>Single Attempt Rule:</strong> Each registered player is permitted exactly one official attempt per round. Once a round timer begins, it cannot be paused or reset.</li>
            <li><strong>Multiple Accounts:</strong> Creating duplicate Google accounts to attempt the same round multiple times is strictly prohibited and subject to disqualification.</li>
            <li><strong>Automation & Bots:</strong> Use of scripts, automated bots, browser extensions that manipulate timers, or server-tampering tools will result in permanent account bans.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <Award className="h-5 w-5 text-violet-400" />
            <h2>3. Scoring, Rankings & Prizes</h2>
          </div>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-ink-300">
            <li>Scores are calculated based on accuracy and completion speed according to official scoring formulas.</li>
            <li>Leaderboards update in real time. In the event of ties, rankings are broken by lowest average time taken.</li>
            <li>If official cash prizes or tournament rewards are organized for a season or month, decisions made by Inkhel administrators regarding winners, eligibility, and prize disbursement are final.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <RefreshCw className="h-5 w-5 text-violet-400" />
            <h2>4. Service Modifications & Availability</h2>
          </div>
          <p className="text-sm text-ink-300">
            We continuously improve our platform and reserve the right to modify, suspend, or update quiz formats, question pools, scoring rules, or server capabilities without prior notice.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <AlertCircle className="h-5 w-5 text-violet-400" />
            <h2>5. Intellectual Property</h2>
          </div>
          <p className="text-sm text-ink-300">
            All trademarks, logos, custom artwork, software code, and quiz question collections on Inkhel Quiz belong to Inkhel and their respective creators. Club crests and sports images are used under fair editorial and trivia context.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <HelpCircle className="h-5 w-5 text-violet-400" />
            <h2>6. Support & Inquiries</h2>
          </div>
          <p className="text-sm text-ink-300">
            For rules clarifications, dispute reports, or partnership inquiries, contact us at: <a href="mailto:admin@inkhel.com" className="text-violet-400 underline font-semibold">admin@inkhel.com</a>.
          </p>
        </section>
      </Card>
    </div>
  )
}
