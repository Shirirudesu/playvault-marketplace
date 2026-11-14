import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api'
import { useAuth } from '../auth/useAuth'

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const isRegister = mode === 'register'
  const { user, loading, login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedRedirect = new URLSearchParams(location.search).get('redirect')
  const redirectTo = requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : '/'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to={redirectTo} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})

    if (isRegister && password !== confirmation) {
      setFieldErrors({ password_confirmation: ['Passwords do not match.'] })
      return
    }
    if (isRegister && !name.trim()) {
      setFieldErrors({ name: ['Enter your name.'] })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErrors({ email: ['Enter a valid email address.'] })
      return
    }
    if (password.length < 8) {
      setFieldErrors({ password: ['Use at least 8 characters.'] })
      return
    }

    setSubmitting(true)
    try {
      if (isRegister) await register(name.trim(), email.trim(), password, confirmation)
      else await login(email.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setFieldErrors(submitError.errors)
        setError(submitError.status === 0 ? 'The server could not be reached. Check that the backend is running.' : submitError.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1440px] items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,.85fr)] lg:gap-16 lg:px-10 lg:py-10">
      <section className="max-w-3xl py-4 lg:py-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#63E3C2]">PlayVault · Digital game marketplace</p>
        <h1 className="mt-4 max-w-3xl text-[clamp(2.8rem,7vw,6rem)] font-black leading-[.98] tracking-tight text-white">Welcome.<br />Good to see you.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-[#D3C8EB]">{isRegister ? 'Create an account to keep your cart, compare seller offers and access your digital orders.' : 'Sign in to return to your cart and pick up where your next game begins.'}</p>
        <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold">
          <span className="border border-white/20 px-3 py-2 text-white">Seller offers</span>
          <span className="border border-white/20 px-3 py-2 text-white">Digital delivery demo</span>
          <span className="border border-white/20 px-3 py-2 text-white">PlayVault account</span>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[480px] border border-white/10 bg-[#5825CC] p-6 sm:p-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#FAD318]">PlayVault account</p>
        <h2 className="mt-2 text-2xl font-extrabold">{isRegister ? 'Create your account' : 'Sign in'}</h2>
        <p className="mt-1 text-xs text-[#D3C8EB]">{isRegister ? 'Already have an account?' : 'New to PlayVault?'}{' '}
          <Link to={isRegister ? '/login' : '/register'} className="font-bold text-[#FAD318] hover:text-white">{isRegister ? 'Sign in' : 'Create an account'}</Link>
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
          {error && <p role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2.5 text-sm text-rose-200">{error}</p>}
          {isRegister && <Field label="Name" value={name} onChange={setName} autoComplete="name" error={fieldErrors.name?.[0]} required />}
          <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" error={fieldErrors.email?.[0]} required />
          <Field label="Password" value={password} onChange={setPassword} type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} error={fieldErrors.password?.[0]} minLength={8} required />
          {isRegister && <Field label="Confirm password" value={confirmation} onChange={setConfirmation} type="password" autoComplete="new-password" error={fieldErrors.password_confirmation?.[0]} minLength={8} required />}
          <button disabled={submitting || loading} className="market-primary h-12 w-full text-sm disabled:cursor-wait disabled:opacity-60">
            {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

      </section>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', autoComplete, error, minLength, required = false }: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete: string
  error?: string
  minLength?: number
  required?: boolean
}) {
  const id = `auth-${label.toLowerCase().replaceAll(' ', '-')}`

  return (
    <label htmlFor={id} className="block text-xs font-semibold text-slate-300">
      {label}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#101023] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-400"
      />
      {error && <span id={`${id}-error`} className="mt-1 block text-xs font-normal text-rose-300">{error}</span>}
    </label>
  )
}
