import { useContext } from 'react'
import { MarketplaceDataContext } from './context'

export function useCategories() {
  return useContext(MarketplaceDataContext)
}
