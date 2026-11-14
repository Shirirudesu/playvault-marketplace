import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet, type Category } from '../api'
import { MarketplaceDataContext } from './context'

export function MarketplaceDataProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const controller = new AbortController()
    apiGet<{ data: Category[] }>('/homepage/categories', controller.signal)
      .then(({ data }) => setCategories(data))
      .catch((error: unknown) => {
        if (!(error instanceof Error && error.name === 'AbortError')) setCategories([])
      })
    return () => controller.abort()
  }, [])

  return <MarketplaceDataContext.Provider value={categories}>{children}</MarketplaceDataContext.Provider>
}
