import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { apiGet, money, type Offer, type Product } from '../api'
import { useCart } from '../cart/useCart'
import { ProductArtwork } from './ProductArtwork'

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()
  const requestInFlight = useRef(false)
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function addLowestOffer() {
    if (requestInFlight.current || adding) return
    requestInFlight.current = true
    setAdding(true)
    setFeedback(null)

    try {
      const response = await apiGet<{ data: Product }>(`/products/${encodeURIComponent(product.slug)}`)
      const availableOffers = (response.data.offers ?? [])
        .filter((offer) => offer.available_quantity > 0)
        .sort((first, second) => Number(first.discounted_price) - Number(second.discounted_price))
      const lowestOffer: Offer | undefined = availableOffers[0]

      if (!lowestOffer) {
        setFeedback({ kind: 'error', text: 'No offers are currently available.' })
        return
      }

      const error = addItem(response.data, lowestOffer)
      setFeedback(error
        ? { kind: 'error', text: error }
        : { kind: 'success', text: `${lowestOffer.seller?.name ?? 'Seller offer'} added to cart.` })
    } catch (error) {
      setFeedback({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Could not load available offers.',
      })
    } finally {
      requestInFlight.current = false
      setAdding(false)
    }
  }

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden border border-[#63E3C2]/40 bg-[#1F0A4D] transition duration-150 hover:-translate-y-0.5 hover:border-[#63E3C2] hover:shadow-lg hover:shadow-[#1F0A4D]/40 focus-within:border-[#FAD318] focus-within:ring-2 focus-within:ring-[#FAD318]/70">
      <Link to={`/products/${product.slug}`} aria-label={`View ${product.title}`} className="relative block aspect-square overflow-hidden">
        <ProductArtwork src={product.image_url} title={product.title} className="h-full w-full" />
        <span className="absolute left-2 top-2 bg-[#63E3C2] px-2 py-1 text-[10px] font-extrabold uppercase text-[#1F0A4D]">Digital delivery</span>
      </Link>
      <div className="flex min-h-[226px] flex-1 flex-col p-2.5 sm:p-3">
        <p className="truncate text-[10px] font-extrabold uppercase text-[#63E3C2]">{product.platform} · {product.region}</p>
        <Link to={`/products/${product.slug}`} className="mt-2 line-clamp-2 min-h-10 text-[13px] font-extrabold leading-5 text-white hover:text-[#63E3C2]">{product.title}</Link>
        <div className="mt-auto pt-3">
          <p className="text-[10px] font-semibold text-[#B3AAC9]">From</p>
          <p className="text-xl font-black leading-6 text-white">{money(product.lowest_offer_price)}</p>
        </div>
        <div className="mt-2 grid min-h-[70px] content-start gap-1.5 opacity-100 transition-opacity [@media(hover:hover)]:md:invisible [@media(hover:hover)]:md:opacity-0 [@media(hover:hover)]:md:group-hover:visible [@media(hover:hover)]:md:group-hover:opacity-100 [@media(hover:hover)]:md:group-focus-within:visible [@media(hover:hover)]:md:group-focus-within:opacity-100">
          <button
            type="button"
            disabled={adding}
            onClick={addLowestOffer}
            aria-label={`Add ${product.title} at its lowest available offer to cart`}
            className="market-primary min-h-8 w-full px-2 text-[11px] disabled:cursor-wait disabled:opacity-70"
          >
            {adding ? 'Loading offer…' : 'Add to cart'}
          </button>
          <Link
            to={`/products/${product.slug}#seller-offers`}
            className="flex min-h-8 items-center justify-center border border-white/80 px-2 text-center text-[11px] font-extrabold text-white transition hover:border-[#FAD318] hover:text-[#FAD318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FAD318]"
          >
            View offers
          </Link>
        </div>
        <p aria-live="polite" className={`min-h-4 pt-1 text-[9px] leading-3 ${feedback?.kind === 'error' ? 'text-[#FFB4C6]' : 'text-[#63E3C2]'}`}>
          {feedback?.text ?? ''}
        </p>
      </div>
    </article>
  )
}
