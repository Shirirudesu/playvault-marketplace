import { createContext } from 'react'
import type { Category } from '../api'

export const MarketplaceDataContext = createContext<Category[]>([])
