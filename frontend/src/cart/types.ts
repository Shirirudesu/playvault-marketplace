import type { Offer, Product } from '../api'

export interface CartItem {
  offerId: number
  quantity: number
  unitPrice: string
  availableQuantity: number
  product: Pick<Product, 'id' | 'slug' | 'title' | 'image_url' | 'platform' | 'region'>
  seller: { id: number; name: string }
}

export interface CartContextValue {
  items: CartItem[]
  itemCount: number
  addItem: (product: Product, offer: Offer) => string | null
  setQuantity: (offerId: number, quantity: number) => void
  removeItem: (offerId: number) => void
  clearCart: () => void
}
