import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { apiGet, apiPost, apiPut, type PaginatedReviews, type ProductReview } from '../api'
import { useAuth } from '../auth/useAuth'

type ReviewCollection = PaginatedReviews & { summary: { average_rating: number | null; count: number } }

export function ProductReviews({ slug }: { slug: string }) {
  const { user } = useAuth()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [listing, setListing] = useState<ReviewCollection | null>(null)
  const [myReview, setMyReview] = useState<ProductReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const requests: Promise<unknown>[] = [apiGet<ReviewCollection>(`/products/${encodeURIComponent(slug)}/reviews?page=${page}`, controller.signal)]
    if (user) requests.push(apiGet<{ data: ProductReview | null }>(`/products/${encodeURIComponent(slug)}/reviews/mine`, controller.signal))

    Promise.all(requests).then(([reviews, mine]) => {
      setListing(reviews as ReviewCollection)
      const ownReview = (mine as { data: ProductReview | null } | undefined)?.data ?? null
      setMyReview(ownReview)
      setComment(ownReview?.comment ?? '')
      setRating(ownReview?.rating ?? 5)
    }).catch((loadError: unknown) => {
      if (loadError instanceof Error && loadError.name === 'AbortError') return
      setError('Reviews could not be loaded right now.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })

    return () => controller.abort()
  }, [slug, page, refresh, user])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setSubmitMessage(null)
    try {
      const path = `/products/${encodeURIComponent(slug)}/reviews${myReview ? '/mine' : ''}`
      const payload = { rating, comment: comment.trim() || null }
      if (myReview) await apiPut(path, payload)
      else await apiPost(path, payload)
      setSubmitMessage(myReview ? 'Your review has been updated.' : 'Your review has been posted.')
      setLoading(true)
      setError(null)
      setPage(1)
      setRefresh((value) => value + 1)
    } catch (submitError) {
      setSubmitError(submitError instanceof Error ? submitError.message : 'Your review could not be saved. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const signInDestination = encodeURIComponent(`${location.pathname}${location.search}#reviews`)

  return <section id="reviews" aria-labelledby="reviews-heading" className="mt-9 scroll-mt-6">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#63E3C2]">Customer feedback</p><h2 id="reviews-heading" className="mt-1 text-xl font-extrabold">Customer reviews</h2></div>
      {listing?.summary.count ? <p className="text-sm text-[#D3C8EB]"><strong className="text-[#FAD318]">★ {Number(listing.summary.average_rating).toFixed(2)}</strong> <span className="text-[#B3AAC9]">· {listing.summary.count} {listing.summary.count === 1 ? 'review' : 'reviews'}</span></p> : null}
    </div>

    {user ? <form onSubmit={submit} className="mb-4 border border-white/10 bg-[#351183] p-4 sm:p-5">
      <h3 className="text-sm font-extrabold">{myReview ? 'Edit your review' : 'Share your review'}</h3>
      <fieldset className="mt-3"><legend className="text-xs font-semibold text-[#D3C8EB]">Your rating</legend><div className="mt-1 flex gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`} onClick={() => setRating(value)} className={`rounded-sm px-1 text-2xl leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FAD318] ${value <= rating ? 'text-[#FAD318]' : 'text-white/30'}`}>★</button>)}
      </div></fieldset>
      <label className="mt-3 block text-xs font-semibold text-[#D3C8EB]">Comment <span className="font-normal text-[#9385B2]">(optional)</span>
        <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={2000} rows={3} className="mt-1 w-full resize-y border border-white/15 bg-[#1F0A4D] px-3 py-2 text-sm text-white placeholder:text-[#9385B2] focus:border-[#63E3C2] focus:outline-none" placeholder="What did you think of the game?" />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="text-[10px] text-[#9385B2]">{comment.length}/2000 characters · Reviews are not purchase verified.</span><button type="submit" disabled={submitting} className="market-primary min-h-9 px-4 text-xs disabled:cursor-wait disabled:opacity-60">{submitting ? 'Saving…' : myReview ? 'Update review' : 'Post review'}</button></div>
      {submitError && <p role="alert" className="mt-3 text-xs text-[#FFB4C4]">{submitError}</p>}
      {submitMessage && <p role="status" className="mt-3 text-xs text-[#BFF6E8]">{submitMessage}</p>}
    </form> : <div className="mb-4 border border-white/10 bg-[#351183] p-4 text-sm text-[#D3C8EB]">Sign in to leave a review. <Link to={`/login?redirect=${signInDestination}`} className="ml-1 font-bold text-[#FAD318] underline">Sign in</Link></div>}

    {loading ? <p role="status" className="border border-white/10 bg-[#1F0A4D] p-4 text-sm text-[#B3AAC9]">Loading reviews…</p> : error ? <div className="border border-white/10 bg-[#1F0A4D] p-4 text-sm text-[#B3AAC9]"><p role="alert">{error}</p><button type="button" onClick={() => { setLoading(true); setError(null); setRefresh((value) => value + 1) }} className="mt-2 font-bold text-[#FAD318] underline">Try again</button></div> : listing?.data.length ? <div className="divide-y divide-white/10 border border-white/10 bg-[#1F0A4D]">
      {listing.data.map((review) => <article key={review.id} className="p-4 sm:px-5"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span aria-label={`${review.rating} out of 5 stars`} className="text-[#FAD318]">{'★'.repeat(review.rating)}<span className="text-white/25">{'★'.repeat(5 - review.rating)}</span></span><strong className="text-xs text-white">{review.author_name}</strong><time dateTime={review.created_at} className="text-[10px] text-[#9385B2]">{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(review.created_at))}</time>{review.is_mine && <span className="border border-[#63E3C2]/30 px-1.5 py-0.5 text-[9px] font-bold text-[#63E3C2]">Your review</span>}</div>{review.comment && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#D3C8EB]">{review.comment}</p>}</article>)}
      {listing.meta.last_page > 1 && <nav aria-label="Review pages" className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs"><button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1) }} className="font-bold text-[#FAD318] disabled:text-[#9385B2]">Previous</button><span className="text-[#B3AAC9]">Page {page} of {listing.meta.last_page}</span><button type="button" disabled={page >= listing.meta.last_page} onClick={() => { setLoading(true); setPage((value) => value + 1) }} className="font-bold text-[#FAD318] disabled:text-[#9385B2]">Next</button></nav>}
    </div> : <div className="border border-dashed border-white/20 bg-[#1F0A4D] p-5 text-sm text-[#B3AAC9]">No customer reviews yet. Be the first to share your experience.</div>}
  </section>
}
