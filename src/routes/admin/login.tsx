import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { KeyRound, Lock, ShieldCheck, User } from 'lucide-react'
import { Button, Card, ErrorNote, Field, Input } from '../../components/ui'
import { Logo } from '../../components/layout'
import { loginAdmin } from '../../services/authService'
import { setPageTitle } from '../../services/shareService'
import { useEffect } from 'react'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => setPageTitle('Admin Login'), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginAdmin(username, password)
      navigate({ to: '/admin' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(60%_50%_at_50%_40%,black,transparent)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="animate-fade-up p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">Admin Console</h1>
              <p className="text-xs text-ink-300">Sign in to manage the platform</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorNote message={error} />
            <Field label="Username or email">
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  className="pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <Input
                  type="password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </Field>
            <Button type="submit" className="w-full" size="lg" loading={loading} icon={KeyRound}>
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
