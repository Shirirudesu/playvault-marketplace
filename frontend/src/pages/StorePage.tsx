import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { apiGet, type Paginated, type Product } from '../api'
import { useCategories } from '../marketplace/useCategories'
import { ErrorState, LoadingState } from '../components/PageStates'
import { ProductGrid } from '../components/ProductGrid'
import { SlidersIcon } from '../components/Icons'

interface FilterOptions {
  platforms: string[]
  regions: string[]
}

const fieldClass = 'mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#111124] px-3 text-sm text-white outline-none transition focus:border-violet-400'

export function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryString = searchParams.toString()
  const [loadState, setLoadState] = useState<{ key: string; result?: Paginated<Product>; error?: string } | null>(null)
  const categories = useCategories()
  const [options, setOptions] = useState<FilterOptions>({ platforms: [], regions: [] })
  const [retry, setRetry] = useState(0)
  const [draftState, setDraftState] = useState<{ key: string; search: string; min: string; max: string } | null>(null)
  const drafts = draftState?.key === queryString ? draftState : {
    key: queryString,
    search: searchParams.get('search') ?? '',
    min: searchParams.get('min_price') ?? '',
    max: searchParams.get('max_price') ?? '',
  }

  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ data: FilterOptions }>('/catalog/filters', controller.signal).then((response) => setOptions(response.data)).catch(() => undefined)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const suffix = queryString ? `?${queryString}` : ''
    const key = `${queryString}:${retry}`

    apiGet<Paginated<Product>>(`/products${suffix}`, controller.signal)
      .then((result) => setLoadState({ key, result }))
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === 'AbortError') return
        setLoadState({ key, error: loadError instanceof Error ? loadError.message : 'Please try again in a moment.' })
      })

    return () => controller.abort()
  }, [queryString, retry])

  const activeFilterCount = ['category', 'platform', 'region', 'min_price', 'max_price'].filter((key) => searchParams.has(key)).length
  const loadStateKey = `${queryString}:${retry}`
  const result = loadState?.key === loadStateKey ? loadState.result ?? null : null
  const error = loadState?.key === loadStateKey ? loadState.error ?? null : null

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next, { replace: true })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateParam('search', drafts.search.trim())
  }

  function submitPriceRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (drafts.min) next.set('min_price', drafts.min)
    else next.delete('min_price')
    if (drafts.max) next.set('max_price', drafts.max)
    else next.delete('max_price')
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  function setSort(value: string) {
    const [sort, direction] = value.split(':')
    const next = new URLSearchParams(searchParams)
    if (sort === 'relevance') {
      next.delete('sort')
      next.delete('direction')
    } else {
      next.set('sort', sort)
      next.set('direction', direction)
    }
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  const sortValue = `${searchParams.get('sort') ?? (searchParams.has('search') ? 'relevance' : 'title')}:${searchParams.get('direction') ?? 'asc'}`
  const currentPage = result?.meta.current_page ?? Number(searchParams.get('page') ?? 1)
  const lastPage = result?.meta.last_page ?? 1

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#63E3C2]">The game store</p><h1 className="text-[25px] font-extrabold tracking-tight sm:text-[30px]">Find your next game</h1><p className="mt-1 text-xs text-slate-400">Compare demo offers across platforms, regions and sellers.</p></div>
        {result && <p className="text-sm text-slate-400"><span className="font-bold text-white">{result.meta.total}</span> games found</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[235px_minmax(0,1fr)] xl:gap-5">
        <aside aria-label="Product filters" className="h-fit border border-white/10 bg-[#5825CC] p-4 lg:sticky lg:top-5">
          <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-bold"><SlidersIcon /> Filters <span className="rounded-full bg-violet-400/15 px-2 py-0.5 text-[10px] text-violet-200">{activeFilterCount}</span></h2><button onClick={() => setSearchParams(new URLSearchParams(), { replace: true })} className="text-xs font-semibold text-slate-400 hover:text-white">Clear all</button></div>

          <form onSubmit={submitSearch} className="border-b border-white/8 pb-5">
            <label htmlFor="catalog-search" className="text-xs font-semibold text-slate-300">Search games</label>
            <div className="mt-2 flex gap-2"><input id="catalog-search" value={drafts.search} onChange={(event) => setDraftState({ ...drafts, search: event.target.value })} placeholder="Try a game title" className="h-9 min-w-0 flex-1 border border-white/10 bg-[#351183] px-2.5 text-xs outline-none focus:border-[#63E3C2]" /><button aria-label="Search catalog" className="market-primary px-3 text-xs font-bold">Go</button></div>
          </form>

          <label htmlFor="category-filter" className="mt-5 block text-xs font-semibold text-slate-300">Category</label>
          <select id="category-filter" value={searchParams.get('category') ?? ''} onChange={(event) => updateParam('category', event.target.value)} className={fieldClass}>
            <option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
          </select>

          <label htmlFor="platform-filter" className="mt-5 block text-xs font-semibold text-slate-300">Platform</label>
          <select id="platform-filter" value={searchParams.get('platform') ?? ''} onChange={(event) => updateParam('platform', event.target.value)} className={fieldClass}>
            <option value="">All platforms</option>{options.platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
          </select>

          <label htmlFor="region-filter" className="mt-5 block text-xs font-semibold text-slate-300">Region</label>
          <select id="region-filter" value={searchParams.get('region') ?? ''} onChange={(event) => updateParam('region', event.target.value)} className={fieldClass}>
            <option value="">All regions</option>{options.regions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>

          <form onSubmit={submitPriceRange} className="mt-5 border-t border-white/8 pt-5">
            <p className="text-xs font-semibold text-slate-300">Price range <span className="font-normal text-slate-500">(EUR)</span></p>
            <div className="mt-2 grid grid-cols-2 gap-2"><label><span className="sr-only">Minimum price</span><input inputMode="decimal" type="number" min="0" step="0.01" value={drafts.min} onChange={(event) => setDraftState({ ...drafts, min: event.target.value })} placeholder="Min" className="h-10 w-full rounded-lg border border-white/10 bg-[#111124] px-3 text-sm outline-none focus:border-violet-400" /></label><label><span className="sr-only">Maximum price</span><input inputMode="decimal" type="number" min="0" step="0.01" value={drafts.max} onChange={(event) => setDraftState({ ...drafts, max: event.target.value })} placeholder="Max" className="h-10 w-full rounded-lg border border-white/10 bg-[#111124] px-3 text-sm outline-none focus:border-violet-400" /></label></div>
            <button className="market-primary mt-3 h-9 w-full text-xs">Apply price</button>
          </form>
        </aside>

        <section aria-label="Game results" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-white/8 bg-[#1F0A4D] px-3 py-2.5">
            <div className="text-xs text-slate-400">{searchParams.get('search') ? <>Results for <span className="font-semibold text-white">“{searchParams.get('search')}”</span></> : 'Browse the catalog'}</div>
            <label className="flex items-center gap-2 text-xs text-slate-400">Sort by <select aria-label="Sort products" value={sortValue} onChange={(event) => setSort(event.target.value)} className="h-9 rounded-lg border border-white/10 bg-[#111124] px-2 text-xs font-semibold text-white outline-none focus:border-violet-400"><option value="relevance:asc">Relevance</option><option value="price:asc">Price: low to high</option><option value="price:desc">Price: high to low</option><option value="title:asc">Title: A to Z</option><option value="title:desc">Title: Z to A</option><option value="release_date:desc">Newest release</option><option value="release_date:asc">Oldest release</option></select></label>
          </div>

          {error ? <ErrorState message={error} onRetry={() => setRetry((count) => count + 1)} /> : !result ? <LoadingState label="Loading catalog" /> : result.data.length ? <>
            <ProductGrid products={result.data} />
            <div className="mt-5 flex items-center justify-between border border-white/8 bg-[#1F0A4D] px-3 py-2.5">
              <button onClick={() => updateParam('page', String(Math.max(1, currentPage - 1)))} disabled={currentPage <= 1} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <p className="text-xs text-slate-400">Page <span className="font-bold text-white">{currentPage}</span> of <span className="font-bold text-white">{lastPage}</span></p>
              <button onClick={() => updateParam('page', String(Math.min(lastPage, currentPage + 1)))} disabled={currentPage >= lastPage} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </> : <div className="border border-dashed border-white/15 bg-[#1F0A4D] px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center bg-[#5825CC] text-2xl text-white">⌕</span><h2 className="mt-4 text-lg font-bold">No games match those filters</h2><p className="mt-2 text-sm text-slate-400">Try a broader search or clear the filters.</p><button onClick={() => setSearchParams(new URLSearchParams(), { replace: true })} className="market-primary mt-5 px-4 py-2.5 text-xs">Clear filters</button><p className="mt-4"><Link to="/store" className="text-xs font-semibold text-[#63E3C2] hover:text-white">Back to all games</Link></p></div>}
        </section>
      </div>
    </div>
  )
}
