import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Offer, Product } from '../api'
import { useAuth } from '../auth/useAuth'
import { CartContext } from './context'
import { readCart, writeCart } from './storage'
import type { CartContextValue, CartItem } from './types'

const emptyCart: CartContextValue = {
  items: [],
  itemCount: 0,
  addItem: () => 'Please wait while your account is loading.',
  setQuantity: () => undefined,
  removeItem: () => undefined,
  clearCart: () => undefined,
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <CartContext.Provider value={emptyCart}>{children}</CartContext.Provider>

  const owner = user ? `user:${user.id}` : 'guest'
  return <AccountCart key={owner} owner={owner}>{children}</AccountCart>
}

function AccountCart({ owner, children }: { owner: string; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readCart(owner))

  useEffect(() => writeCart(owner, items), [owner, items])

  const addItem = useCallback((product: Product, offer: Offer): string | null => {
    if (offer.available_quantity < 1) return 'This offer is no longer available.'
    const cartItem: CartItem = {
      offerId: offer.id,
      quantity: 1,
      unitPrice: offer.discounted_price,
      availableQuantity: offer.available_quantity,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        image_url: product.image_url,
        platform: product.platform,
        region: product.region,
      },
      seller: { id: offer.seller?.id ?? 0, name: offer.seller?.name ?? 'Marketplace seller' },
    }
    const existing = items.find((item) => item.offerId === offer.id)
    if (existing && existing.quantity >= offer.available_quantity) {
      return `Only ${offer.available_quantity} of this seller offer were available when it was loaded.`
    }

    setItems((current) => {
      const currentItem = current.find((item) => item.offerId === offer.id)
      if (currentItem) {
        return current.map((item) => item.offerId === offer.id
          ? { ...cartItem, quantity: Math.min(item.quantity + 1, offer.available_quantity) }
          : item)
      }
      return [...current, cartItem]
    })

    return null
  }, [items])

  const setQuantity = useCallback((offerId: number, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return
    setItems((current) => current.map((item) => item.offerId === offerId && quantity <= item.availableQuantity
      ? { ...item, quantity }
      : item))
  }, [])

  const removeItem = useCallback((offerId: number) => {
    setItems((current) => current.filter((item) => item.offerId !== offerId))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value: CartContextValue = useMemo(() => ({
    items,
    itemCount: items.reduce((count, item) => count + item.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }), [items, addItem, setQuantity, removeItem, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
