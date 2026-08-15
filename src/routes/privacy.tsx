import { useEffect } from 'react'
import { Card, SectionHeading } from '../components/ui'
import { setPageTitle } from '../services/shareService'
import { ShieldCheck, Lock, Eye, Cookie, UserCheck, Mail } from 'lucide-react'

export function PrivacyPolicyPage() {
  useEffect(() => {
    setPageTitle('Privacy Policy — Inkhel Quiz')
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading
        eyebrow="Legal & Compliance"
        title="Privacy Policy"
        subtitle="Last updated: August 2026. How we protect your data, manage cookies, and respect your privacy."
      />

      <Card className="mt-8 space-y-8 p-6 sm:p-10 leading-relaxed text-ink-200">
        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <ShieldCheck className="h-5 w-5 text-violet-400" />
            <h2>1. Introduction</h2>
          </div>
          <p className="text-sm text-ink-300">
            Welcome to <strong>Inkhel Quiz</strong> (<a href="https://quiz.inkhel.com" className="text-violet-400 underline">quiz.inkhel.com</a>), operated by Inkhel. We respect your privacy and are committed to protecting personal data collected when you use our competitive quiz platform.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <UserCheck className="h-5 w-5 text-violet-400" />
            <h2>2. Information We Collect</h2>
          </div>
          <p className="text-sm text-ink-300">
            When you sign in with your <strong>Google Account</strong> to participate in official quiz rounds and leaderboards, we receive basic profile information authorized by Google:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-ink-300">
            <li><strong>Display Name:</strong> To show your player identity on the leaderboard and score cards.</li>
            <li><strong>Email Address:</strong> Used strictly for unique player verification, anti-cheat enforcement, and account integrity.</li>
            <li><strong>Profile Photo URL:</strong> To display your player avatar alongside your scores.</li>
            <li><strong>Gameplay & Score Data:</strong> Round start timestamps, answers submitted, completion times, and calculated scores.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <Eye className="h-5 w-5 text-violet-400" />
            <h2>3. How We Use Your Information</h2>
          </div>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-ink-300">
            <li>To compute and publish real-time round, monthly, and season leaderboards.</li>
            <li>To enforce strict anti-cheating, fair play, and timer validation rules on our edge servers.</li>
            <li>To maintain persistent sessions across your devices so you stay logged in seamlessly.</li>
            <li>We <strong>never sell, rent, or trade</strong> your personal information or email addresses to third parties.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <Cookie className="h-5 w-5 text-violet-400" />
            <h2>4. Cookies & Third-Party Advertising (Google AdSense)</h2>
          </div>
          <p className="text-sm text-ink-300">
            Our platform uses cookies and local browser storage to keep you logged in and improve your experience. In addition:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-ink-300">
            <li>
              Third-party vendors, including <strong>Google</strong>, use cookies (such as the DoubleClick cookie) to serve ads based on a user's prior visits to our website or other websites on the Internet.
            </li>
            <li>
              Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our sites and/or other sites on the Internet.
            </li>
            <li>
              Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">Google Ads Settings</a> or <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline">aboutads.info</a>.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <Lock className="h-5 w-5 text-violet-400" />
            <h2>5. Data Security & Storage</h2>
          </div>
          <p className="text-sm text-ink-300">
            Your quiz progress and account information are secured using industry-standard protocols, hosted on Cloudflare's global edge infrastructure with automated encrypted backups and strict access controls.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2.5 text-white font-display text-lg font-bold">
            <Mail className="h-5 w-5 text-violet-400" />
            <h2>6. Contact Us & Data Deletion</h2>
          </div>
          <p className="text-sm text-ink-300">
            If you have questions regarding this Privacy Policy or wish to request data deletion or profile correction, please reach out to our team at:
          </p>
          <p className="text-sm font-semibold text-white">
            Email: <a href="mailto:admin@inkhel.com" className="text-violet-400 underline">admin@inkhel.com</a>
          </p>
        </section>
      </Card>
    </div>
  )
}
