import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { apiPost, money, type CheckoutQuote, type Order } from '../api'
import { useCart } from '../cart/useCart'
import { LoadingState } from '../components/PageStates'
import { ProductArtwork } from '../components/ProductArtwork'

interface QuoteState {
  key: string
  quote?: CheckoutQuote
  error?: string
}

export function CheckoutPage() {
  const { items, clearCart } = useCart()
  const navigate = useNavigate()
  const [quoteState, setQuoteState] = useState<QuoteState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const fallbackIdempotencyKey = useRef<{ cartKey: string; key: string } | null>(null)
  const payload = items.map(({ offerId, quantity }) => ({ offer_id: offerId, quantity }))
  const cartKey = payload.map((item) => `${item.offer_id}:${item.quantity}`).join('|')
  const quote = quoteState?.key === cartKey ? quoteState.quote : null
  const quoteError = quoteState?.key === cartKey ? quoteState.error : null

  useEffect(() => {
    if (!cartKey) return
    const quoteItems = cartKey.split('|').map((item) => {
      const [offer_id, quantity] = item.split(':').map(Number)
      return { offer_id, quantity }
    })
    let active = true
    apiPost<{ data: CheckoutQuote }>('/checkout/quote', { items: quoteItems })
      .then(({ data }) => { if (active) setQuoteState({ key: cartKey, quote: data }) })
      .catch((error: unknown) => {
        if (!active) return
        setQuoteState({ key: cartKey, error: getErrorMessage(error) })
      })
    return () => { active = false }
  }, [cartKey])

  async function confirmPurchase() {
    setSubmitting(true)
    setCheckoutError(null)
    try {
      const storageKey = `playvault.checkout.${cartKey}`
      let idempotencyKey: string
      try {
        idempotencyKey = window.sessionStorage.getItem(storageKey) ?? crypto.randomUUID()
        window.sessionStorage.setItem(storageKey, idempotencyKey)
      } catch {
        if (fallbackIdempotencyKey.current?.cartKey === cartKey) idempotencyKey = fallbackIdempotencyKey.current.key
        else {
          idempotencyKey = crypto.randomUUID()
          fallbackIdempotencyKey.current = { cartKey, key: idempotencyKey }
        }
      }
      const response = await apiPost<{ data: Order }>('/checkout', { items: payload }, { 'Idempotency-Key': idempotencyKey })
      try { window.sessionStorage.removeItem(storageKey) } catch { /* Session storage is optional. */ }
      clearCart()
      navigate(`/orders/${response.data.id}/confirmation`, { replace: true })
    } catch (error) {
      setCheckoutError(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (!items.length) {
    return <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><div className="market-panel p-8 text-center"><h1 className="text-2xl font-black">Nothing to check out yet</h1><p className="mt-2 text-sm text-slate-400">Add a seller offer to your cart first.</p><Link to="/cart" className="market-primary mt-5 inline-flex px-4 py-2.5 text-sm">Return to cart</Link></div></div>
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">Secure review</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Review your order</h1>
      <p className="mt-2 text-sm text-slate-400">Offers, inventory and final prices are verified by the marketplace before purchase.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Order items" className="space-y-3">
          {quote?.items.map((item) => <article key={item.offer_id} className="flex gap-4 rounded-2xl border border-white/10 bg-[#17172a] p-4 sm:p-5">
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-36"><ProductArtwork src={item.product.image_url} title={item.product.title} className="h-full w-full" /></div>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-violet-300">{item.product.platform} · {item.product.region}</p><h2 className="mt-1 truncate text-sm font-bold text-white">{item.product.title}</h2><p className="mt-1 text-xs text-slate-400">Seller: {item.seller.name} <span className="mx-1 text-slate-600">·</span> Qty {item.quantity}</p><p className="mt-3 text-xs text-slate-400">{money(item.unit_price)} each</p></div>
            <p className="shrink-0 self-end text-sm font-bold text-white">{money(item.subtotal)}</p>
          </article>)}
          {quoteError && <div role="alert" className="rounded-2xl border border-rose-300/20 bg-rose-300/5 p-5"><p className="text-sm font-semibold text-rose-200">We couldn’t verify your cart.</p><p className="mt-2 text-sm leading-6 text-rose-100/80">{quoteError}</p><Link to="/cart" className="mt-3 inline-block text-xs font-bold text-violet-200 underline">Return to cart</Link></div>}
          {checkoutError && <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-300/5 px-4 py-3 text-sm text-rose-200">{checkoutError}</p>}
          {quoteState?.key !== cartKey && <div className="rounded-2xl border border-white/10 bg-[#17172a] p-5"><LoadingState label="Verifying current prices and availability" /></div>}
        </section>

        <aside className="rounded-2xl border border-white/10 bg-[#17172a] p-5 sm:p-6 lg:sticky lg:top-5">
          <h2 className="text-lg font-bold">Purchase summary</h2>
          {quote ? <>
            <div className="mt-5 space-y-3 border-b border-white/8 pb-4 text-sm"><div className="flex justify-between text-slate-400"><span>Digital items</span><span>{quote.items.reduce((sum, item) => sum + item.quantity, 0)}</span></div><div className="flex justify-between text-slate-400"><span>Payment</span><span>Simulated · €0 charged</span></div></div>
            <div className="mt-4 flex items-baseline justify-between gap-3"><span className="font-semibold text-slate-300">Total</span><span className="text-2xl font-black text-white">{money(quote.total)}</span></div>
          <button type="button" onClick={confirmPurchase} disabled={submitting || Boolean(quoteError)} className="market-primary mt-5 h-12 w-full text-sm disabled:cursor-wait">{submitting ? 'Completing simulated purchase…' : 'Confirm simulated purchase'}</button>
          </> : !quoteError && <div className="mt-5"><LoadingState label="Preparing your total" /></div>}
          <div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4"><p className="text-xs font-bold text-amber-100">Demo checkout</p><p className="mt-1 text-xs leading-5 text-amber-100/70">No payment provider is used and no money is charged. Delivered DEMO- keys are fictional and cannot be redeemed.</p></div>
          <Link to="/cart" className="mt-4 block text-center text-xs font-semibold text-slate-400 hover:text-white">Back to cart</Link>
        </aside>
      </div>
    </div>
  )
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && 'errors' in error) {
    const errors = (error as Error & { errors?: Record<string, string[]> }).errors
    const checkoutError = errors?.items?.[0]
    if (checkoutError) return checkoutError
  }
  return error instanceof Error ? error.message : 'Please try again after checking your cart.'
}
