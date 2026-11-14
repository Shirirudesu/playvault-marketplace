import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { apiGet, money, type HomepageBanner, type Product } from '../api'
import { useCategories } from '../marketplace/useCategories'
import { ErrorState, LoadingState } from '../components/PageStates'
import { ProductArtwork } from '../components/ProductArtwork'
import { ProductGrid } from '../components/ProductGrid'
import { SectionHeading } from '../components/SectionHeading'
import { ArrowRightIcon } from '../components/Icons'

interface HomepageContent {
  banner: HomepageBanner | null
  bestSellers: Product[]
  deals: Product[]
}

interface HomepageResponse {
  data: {
    banner: HomepageContent['banner']
    best_sellers: Product[]
    deals: Product[]
  }
}

export function HomePage() {
  const categories = useCategories()
  const [content, setContent] = useState<HomepageContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const loadHomepage = useCallback(() => {
    const controller = new AbortController()

    apiGet<HomepageResponse>('/homepage', controller.signal)
      .then(({ data }) => {
        setContent({ banner: data.banner, bestSellers: data.best_sellers, deals: data.deals })
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Please try again in a moment.')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => loadHomepage(), [loadHomepage, retry])

  if (error) {
    return <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-10"><ErrorState message={error} onRetry={() => setRetry((count) => count + 1)} /></div>
  }

  if (!content) {
    return <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 sm:px-6 lg:px-10"><div className="h-[220px] animate-pulse bg-white/5" /><LoadingState /></div>
  }

  const { banner, bestSellers, deals } = content

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-4 sm:px-6 lg:px-10">
      {banner ? (
        <section className="relative isolate min-h-[235px] overflow-hidden border border-white/10 bg-[#351183] sm:min-h-[260px]">
          {banner.image_url && <div aria-hidden="true" className="absolute inset-0 -z-20 bg-cover bg-center opacity-35" style={{ backgroundImage: `url("${banner.image_url}")` }} />}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#351183_0%,rgba(53,17,131,.96)_34%,rgba(53,17,131,.5)_68%,rgba(53,17,131,.12)_100%),linear-gradient(0deg,rgba(31,10,77,.55),transparent_70%)]" />
          <div className="grid min-h-[235px] items-center gap-4 p-5 sm:min-h-[260px] sm:p-7 lg:grid-cols-[1.05fr_.95fr] lg:px-10">
            <div className="max-w-xl py-2">
              <span className="inline-flex items-center gap-2 border border-[#63E3C2]/45 bg-[#1F0A4D]/35 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#63E3C2]"><span className="h-1.5 w-1.5 rounded-full bg-[#FAD318]" />{banner.eyebrow}</span>
              <h1 className="mt-3 text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-4xl">{banner.title}</h1>
              <p className="mt-3 line-clamp-2 max-w-lg text-sm leading-6 text-slate-300">{banner.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link to={`/products/${banner.product_slug}`} className="market-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold">Explore this deal <ArrowRightIcon /></Link>
                <span className="border border-white/15 bg-black/20 px-3 py-2.5 text-xs font-semibold text-violet-100">{banner.badge}</span>
              </div>
              <p className="mt-5 text-xs text-slate-400">From <span className="font-bold text-white">{money(banner.lowest_offer_price)}</span> <span className="ml-1">· sample price</span></p>
            </div>
            <Link to={`/products/${banner.product_slug}`} className="group relative hidden min-h-[210px] items-center justify-center lg:flex">
              {banner.image_url && <ProductArtwork src={banner.image_url} title={banner.title} className="absolute inset-2 opacity-80 shadow-xl shadow-black/40 transition duration-500 group-hover:scale-[1.02]" />}
              <div className="absolute bottom-4 right-4 border border-white/15 bg-[#1F0A4D]/90 px-4 py-3 shadow-xl backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">Featured price</p>
                <p className="mt-1 text-2xl font-black text-white">{money(banner.lowest_offer_price)}</p>
              </div>
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-violet-950 to-[#191830] p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">Playvault</p><h1 className="mt-3 text-4xl font-black">Find a game worth playing.</h1><Link to="/store" className="mt-6 inline-flex rounded-xl bg-violet-500 px-5 py-3 font-bold">Browse games</Link></section>
      )}

        <section className="py-7 sm:py-9">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">Find your next world</p><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse by category</h2></div><Link to="/store" className="hidden items-center gap-2 text-sm font-semibold text-violet-300 hover:text-white sm:flex">All games <ArrowRightIcon /></Link></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category, index) => <Link key={category.id} to={`/store?category=${encodeURIComponent(category.slug)}`} className="group relative overflow-hidden border border-white/10 bg-[#5825CC] p-4 transition hover:border-[#63E3C2] hover:bg-[#7A4EDF]">
            <span className={`mb-3 grid h-8 w-8 place-items-center text-sm font-black ${['bg-white/15 text-white', 'bg-white/15 text-white', 'bg-white/15 text-white', 'bg-white/15 text-white', 'bg-white/15 text-white'][index % 5]}`}>{category.name.slice(0, 1)}</span>
            <h3 className="text-sm font-bold text-white group-hover:text-[#FAD318]">{category.name}</h3>
            <p className="mt-1 text-[11px] text-violet-100/80">{category.product_count ?? 0} games</p>
            <span className="absolute bottom-4 right-4 text-white transition group-hover:translate-x-1"><ArrowRightIcon /></span>
          </Link>)}
        </div>
      </section>

      <section className="-mx-4 bg-[#351183] px-4 pb-7 pt-6 sm:-mx-6 sm:px-6 sm:pb-8 lg:-mx-10 lg:px-10">
        <SectionHeading eyebrow="Loved by players" title="Best sellers" description="Popular picks with offers from trusted sellers." href="/store" />
        {bestSellers.length ? <ProductGrid products={bestSellers} layout="rail" /> : <p className="border border-white/10 p-8 text-center text-sm text-slate-400">New favorites are coming soon.</p>}
      </section>

      <section className="-mx-4 bg-[#351183] px-4 pb-7 pt-6 sm:-mx-6 sm:px-6 sm:pb-8 lg:-mx-10 lg:px-10">
        <SectionHeading eyebrow="Worth a look" title="Deals of the day" description="Compare current demo discounts across sellers." href="/store?sort=price&direction=asc" actionLabel="Shop deals" />
        {deals.length ? <ProductGrid products={deals} layout="rail" /> : <p className="border border-white/10 p-8 text-center text-sm text-slate-400">No deals are available right now.</p>}
      </section>
    </div>
  )
}
