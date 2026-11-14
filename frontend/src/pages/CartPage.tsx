import { Link } from 'react-router'
import { money } from '../api'
import { useCart } from '../cart/useCart'
import type { CartItem } from '../cart/types'
import { ProductArtwork } from '../components/ProductArtwork'
import { ArrowRightIcon } from '../components/Icons'

export function CartPage() {
  const { items, setQuantity, removeItem } = useCart()
  const total = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
  const hasUnavailableItem = items.some((item) => item.availableQuantity < item.quantity || item.availableQuantity < 1)

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">Your Playvault cart</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Shopping cart</h1><p className="mt-2 text-sm text-slate-400">Your selected sellers and offers stay in this browser.</p></div>
        {items.length > 0 && <Link to="/store" className="text-sm font-semibold text-violet-300 hover:text-white">Continue shopping</Link>}
      </div>

      {!items.length ? <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-[#17172a] px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-300/10 text-2xl text-violet-200">⌑</span>
        <h2 className="mt-5 text-xl font-bold">Your cart is waiting for a game</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Choose a seller offer on any product page and it will appear here.</p>
        <Link to="/store" className="market-primary mt-6 inline-flex items-center gap-2 px-5 py-3 text-sm">Browse the store <ArrowRightIcon /></Link>
      </div> : <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Cart items" className="space-y-4">
          {items.map((item) => <CartRow key={item.offerId} item={item} onQuantity={(quantity) => setQuantity(item.offerId, quantity)} onRemove={() => removeItem(item.offerId)} />)}
        </section>
        <aside className="rounded-2xl border border-white/10 bg-[#17172a] p-5 sm:p-6 lg:sticky lg:top-5">
          <h2 className="text-lg font-bold">Order summary</h2>
          <div className="mt-5 flex justify-between border-b border-white/8 pb-4 text-sm text-slate-400"><span>Items</span><span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
          <div className="mt-4 flex items-baseline justify-between gap-3"><span className="text-sm font-semibold text-slate-300">Estimated total</span><span className="text-2xl font-black text-white">{money(total)}</span></div>
          <p className="mt-2 text-xs text-slate-500">Final prices and stock are checked by the server at checkout.</p>
          {hasUnavailableItem && <p role="alert" className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2 text-xs leading-5 text-amber-200">A cart quantity exceeds its last known availability. Review the cart or continue to refresh availability.</p>}
          <Link to="/checkout" className="market-primary mt-5 flex h-12 items-center justify-center gap-2 text-sm">Continue to checkout <ArrowRightIcon /></Link>
          <p className="mt-4 text-center text-[11px] leading-5 text-slate-500">Simulated payment only. Demo keys are fictional and cannot be redeemed.</p>
        </aside>
      </div>}
    </div>
  )
}

function CartRow({ item, onQuantity, onRemove }: { item: CartItem; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  const unavailable = item.availableQuantity < item.quantity || item.availableQuantity < 1

  return (
    <article className="grid gap-4 rounded-2xl border border-white/10 bg-[#17172a] p-4 sm:grid-cols-[132px_minmax(0,1fr)] sm:p-5">
      <Link to={`/products/${item.product.slug}`} className="relative h-28 overflow-hidden rounded-xl sm:h-full sm:min-h-32">
        <ProductArtwork src={item.product.image_url} title={item.product.title} className="h-full w-full" />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300">{item.product.platform} <span className="text-slate-600">·</span> {item.product.region}</p><Link to={`/products/${item.product.slug}`} className="mt-1 block text-base font-bold text-white hover:text-violet-200">{item.product.title}</Link><p className="mt-1 text-xs text-slate-400">Seller: <span className="font-semibold text-slate-300">{item.seller.name}</span></p></div>
          <button type="button" onClick={onRemove} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-300/10 hover:text-rose-200">Remove</button>
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-white/8 pt-4">
          <div><p className="text-[10px] uppercase tracking-wider text-slate-500">Unit price</p><p className="mt-1 text-sm font-bold text-white">{money(item.unitPrice)}</p></div>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-white/10 bg-[#101023]">
              <button type="button" aria-label={`Reduce ${item.product.title} quantity`} onClick={() => onQuantity(item.quantity - 1)} disabled={item.quantity <= 1} className="grid h-9 w-9 place-items-center text-base text-slate-300 hover:text-white disabled:opacity-35">−</button>
              <span className="min-w-8 text-center text-sm font-bold" aria-live="polite">{item.quantity}</span>
              <button type="button" aria-label={`Increase ${item.product.title} quantity`} onClick={() => onQuantity(item.quantity + 1)} disabled={item.quantity >= item.availableQuantity} className="grid h-9 w-9 place-items-center text-base text-slate-300 hover:text-white disabled:opacity-35">+</button>
            </div>
            <div className="min-w-20 text-right"><p className="text-[10px] uppercase tracking-wider text-slate-500">Subtotal</p><p className="mt-1 text-base font-black text-white">{money(Number(item.unitPrice) * item.quantity)}</p></div>
          </div>
        </div>
        {unavailable && <p role="alert" className="mt-3 text-xs text-amber-200">Availability may have changed. Checkout will refresh this seller offer.</p>}
      </div>
    </article>
  )
}
