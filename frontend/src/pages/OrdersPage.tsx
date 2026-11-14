import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiGet, money, type Order, type Paginated } from '../api'
import { ErrorState, LoadingState } from '../components/PageStates'
import { ArrowRightIcon } from '../components/Icons'
import { formatDate } from '../utils/date'

export function OrdersPage() {
  const [orders, setOrders] = useState<Paginated<Order> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    apiGet<Paginated<Order>>('/orders', controller.signal)
      .then(setOrders)
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Your orders could not be loaded.')
      })
    return () => controller.abort()
  }, [retry])

  if (error) return <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6"><ErrorState message={error} onRetry={() => { setError(null); setOrders(null); setRetry((count) => count + 1) }} /></div>
  if (!orders) return <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6"><LoadingState label="Loading your order history" /></div>

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">Your Playvault account</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Order history</h1>
      <p className="mt-2 text-sm text-slate-400">Every completed purchase stays here, including your delivered demo keys.</p>

      {orders.data.length ? <div className="mt-8 space-y-4">
        {orders.data.map((order) => <article key={order.id} className="rounded-2xl border border-white/10 bg-[#17172a] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">Order PV-{String(order.id).padStart(6, '0')}</p><h2 className="mt-1 text-lg font-bold">{order.items.length} {order.items.length === 1 ? 'offer' : 'offers'}</h2><p className="mt-1 text-xs text-slate-500">{formatDate(order.created_at)}</p></div>
            <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-200">{order.status}</p><p className="mt-1 text-xl font-black text-white">{money(order.total)}</p></div>
          </div>
          <div className="mt-5 divide-y divide-white/8 border-t border-white/8">
            {order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-100">{item.product.title}</p><p className="mt-1 text-xs text-slate-500">{item.seller.name} · Qty {item.quantity}</p></div><p className="shrink-0 text-sm font-bold text-slate-200">{money(item.subtotal)}</p></div>)}
          </div>
        <Link to={`/orders/${order.id}`} className="mt-2 inline-flex items-center gap-2 border border-white/50 px-3 py-2 text-xs font-bold text-white hover:border-[#63E3C2] hover:text-[#63E3C2]">View order and keys <ArrowRightIcon /></Link>
        </article>)}
      </div> : <div className="mt-8 border border-dashed border-white/15 bg-[#17172a] px-6 py-14 text-center"><h2 className="text-xl font-bold">No orders yet</h2><p className="mt-2 text-sm text-slate-400">When you complete a simulated purchase, it will appear here.</p><Link to="/store" className="market-primary mt-5 inline-flex px-5 py-3 text-sm">Explore games</Link></div>}
    </div>
  )
}
