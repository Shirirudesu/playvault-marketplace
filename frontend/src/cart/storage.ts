import type { CartItem } from './types'

const cartPrefix = 'playvault.cart.v1:'
const legacyCartKey = 'playvault.cart.v1'

function isCartItem(item: unknown): item is CartItem {
  const value = item as CartItem | null
  return typeof value?.offerId === 'number'
    && Number.isInteger(value.offerId)
    && typeof value.quantity === 'number'
    && Number.isInteger(value.quantity)
    && value.quantity > 0
    && typeof value.unitPrice === 'string'
    && typeof value.availableQuantity === 'number'
    && typeof value.product?.title === 'string'
    && typeof value.product?.slug === 'string'
    && typeof value.seller?.name === 'string'
}

export function readCart(owner: string): CartItem[] {
  try {
    const key = `${cartPrefix}${owner}`
    const stored = window.localStorage.getItem(key)
    // The pre-account-aware key could belong to any previously signed-in user.
    // Never migrate that ambiguous data into the guest or another account's cart.
    window.localStorage.removeItem(legacyCartKey)
    const value: unknown = JSON.parse(stored ?? '[]')
    return Array.isArray(value) ? value.filter(isCartItem) : []
  } catch {
    return []
  }
}

export function writeCart(owner: string, items: CartItem[]): void {
  try {
    window.localStorage.setItem(`${cartPrefix}${owner}`, JSON.stringify(items))
  } catch {
    // The cart remains usable for this page if browser storage is unavailable.
  }
}

export function mergeGuestCartIntoAccount(userId: number): void {
  const guestItems = readCart('guest')
  if (!guestItems.length) return

  const owner = `user:${userId}`
  const accountItems = readCart(owner)
  const merged = new Map(accountItems.map((item) => [item.offerId, item]))

  for (const guestItem of guestItems) {
    const accountItem = merged.get(guestItem.offerId)
    if (!accountItem) {
      merged.set(guestItem.offerId, { ...guestItem, quantity: Math.min(guestItem.quantity, guestItem.availableQuantity) })
      continue
    }

    const available = Math.min(accountItem.availableQuantity, guestItem.availableQuantity)
    merged.set(guestItem.offerId, {
      ...accountItem,
      availableQuantity: available,
      quantity: Math.min(accountItem.quantity + guestItem.quantity, available),
    })
  }

  writeCart(owner, [...merged.values()])
  writeCart('guest', [])
}
