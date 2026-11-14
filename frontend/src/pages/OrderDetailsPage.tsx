import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, apiGet, money, type Order } from '../api'
import { ErrorState, LoadingState } from '../components/PageStates'
import { formatDate } from '../utils/date'

export function OrderDetailsPage({ confirmation = false }: { confirmation?: boolean }) {
  const { orderId = '' } = useParams()
  const [loadState, setLoadState] = useState<{ orderId: string; order?: Order; error?: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<number | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ data: Order }>(`/orders/${encodeURIComponent(orderId)}`, controller.signal)
      .then(({ data }) => setLoadState({ orderId, order: data }))
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        const message = loadError instanceof ApiError && loadError.status === 404
          ? 'Order not found or unavailable.'
          : 'We couldn’t load this order. Please try again.'
        setLoadState({ orderId, error: message })
      })
    return () => controller.abort()
  }, [orderId])

  const currentState = loadState?.orderId === orderId ? loadState : null
  const order = currentState?.order ?? null
  const error = currentState?.error ?? null

  async function copyKey(id: number, code: string) {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(code)
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey(null), 1800)
    } catch {
      setCopyError('Clipboard access is unavailable. Select the key text and copy it manually.')
    }
  }

  if (error) return <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>
  if (!order) return <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6"><LoadingState label="Loading your order" /></div>

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      {confirmation && <section aria-live="polite" className="mb-8 overflow-hidden rounded-3xl border border-emerald-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.22),transparent_42%),linear-gradient(135deg,#13231f,#17172a_60%)] p-6 sm:p-8">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-300/15 text-xl font-black text-emerald-200">✓</span><p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">Simulated purchase complete</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Your order is confirmed</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Your demo keys are ready below. No payment was processed.</p>
      </section>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">Order PV-{String(order.id).padStart(6, '0')}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{confirmation ? 'Digital delivery' : 'Order details'}</h1><p className="mt-2 text-sm text-slate-400">{formatDate(order.created_at)} <span className="mx-1 text-slate-600">·</span> {order.status}</p></div>
        <Link to="/orders" className="text-sm font-semibold text-violet-300 hover:text-white">Order history</Link>
      </div>

      <div className="mt-7 space-y-5">
        {order.items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#17172a]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 p-5 sm:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">{item.product.platform} · {item.product.region}</p><h2 className="mt-1 text-lg font-bold">{item.product.title}</h2><p className="mt-1 text-xs text-slate-400">Seller: {item.seller.name} · Qty {item.quantity}</p></div><div className="text-right"><p className="text-xs text-slate-500">{money(item.unit_price)} each</p><p className="mt-1 text-base font-bold text-white">{money(item.subtotal)}</p></div></div>
          <div className="p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Your digital key{item.digital_keys?.length === 1 ? '' : 's'}</h3><p className="mt-1 text-xs text-slate-400">These codes are fictional DEMO- keys and cannot be redeemed.</p></div><span className="rounded-full border border-emerald-300/15 bg-emerald-300/5 px-2.5 py-1 text-[10px] font-bold text-emerald-200">Delivered</span></div>
            <div className="mt-4 space-y-2">{item.digital_keys?.map((key) => <div key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#101023] p-3"><code className="select-all break-all font-mono text-sm tracking-wide text-slate-100">{key.key_code}</code><button type="button" onClick={() => copyKey(key.id, key.key_code)} className="shrink-0 rounded-lg border border-violet-300/20 bg-violet-300/5 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-300/10">{copiedKey === key.id ? 'Copied' : 'Copy key'}</button></div>)}</div>
          </div>
        </article>)}
      </div>

      {copyError && <p role="alert" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">{copyError}</p>}
      <section className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/5 p-5"><h2 className="text-sm font-bold text-amber-100">Demo key disclaimer</h2><p className="mt-2 text-xs leading-5 text-amber-100/70">This marketplace simulates digital delivery. These seeded DEMO- codes are not real game keys, do not activate on any platform, and have no monetary value.</p></section>
      <div className="mt-7 flex flex-wrap gap-3"><Link to="/store" className="market-primary px-5 py-3 text-sm">Find another game</Link>{confirmation && <Link to="/orders" className="border border-white/50 px-5 py-3 text-sm font-bold text-slate-200 hover:border-[#63E3C2] hover:text-white">View order history</Link>}</div>
      <div className="mt-8 flex justify-end border-t border-white/8 pt-5"><p className="text-sm text-slate-400">Order total <span className="ml-3 text-xl font-black text-white">{money(order.total)}</span></p></div>
    </div>
  )
}

export function OrderConfirmationPage() {
  return <OrderDetailsPage confirmation />
}
