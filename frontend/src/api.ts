export interface Category {
  id: number
  name: string
  slug: string
  product_count?: number
}

export interface Seller {
  id: number
  name: string
  rating: string
}

export interface Offer {
  id: number
  price: string
  discount_percentage: string
  discounted_price: string
  available_quantity: number
  seller?: Seller
}

export interface Product {
  id: number
  title: string
  slug: string
  description: string
  image_url: string | null
  category: Category
  platform: string
  region: string
  release_date: string | null
  lowest_offer_price: string | null
  best_offer_discount_percentage?: string | null
  offers?: Offer[]
  long_description?: string | null
  system_requirements?: {
    minimum?: ProductRequirement
    recommended?: ProductRequirement
  } | null
  metadata?: {
    developer?: string
    publisher?: string
    supported_languages?: string[]
    supported_operating_systems?: string[]
    [key: string]: string | string[] | undefined
  } | null
  reviews_average_rating?: number | null
  reviews_count?: number
}

export interface ProductRequirement {
  operating_system?: string
  processor?: string
  ram?: string
  graphics?: string
  storage?: string
  additional?: string
}

export interface ProductReview {
  id: number
  author_name: string
  rating: number
  comment: string | null
  created_at: string
  is_mine: boolean
}

export interface PaginatedReviews extends Paginated<ProductReview> {
  summary: { average_rating: number | null; count: number }
}

export interface Paginated<T> {
  data: T[]
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export interface HomepageBanner {
  eyebrow: string
  title: string
  description: string
  badge: string
  image_url: string | null
  product_slug: string
  lowest_offer_price: string | null
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const apiRootUrl = apiBaseUrl.replace(/\/api$/, '')

export interface User {
  id: number
  name: string
  email: string
}

export interface OrderItem {
  id: number
  offer_id: number
  quantity: number
  unit_price: string
  subtotal: string
  product: Pick<Product, 'id' | 'title' | 'slug' | 'image_url' | 'platform' | 'region'>
  seller: { id: number; name: string }
  digital_keys?: { id: number; key_code: string }[]
}

export interface Order {
  id: number
  status: string
  total: string
  created_at: string
  items: OrderItem[]
}

export interface CheckoutQuote {
  items: {
    offer_id: number
    quantity: number
    unit_price: string
    subtotal: string
    product: Pick<Product, 'id' | 'title' | 'slug' | 'image_url' | 'platform' | 'region'>
    seller: { id: number; name: string }
  }[]
  total: string
}

export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

function csrfToken(): string | null {
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith('XSRF-TOKEN='))
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : null
}

async function request<T>(url: string, method: string, body?: unknown, signal?: AbortSignal, extraHeaders: Record<string, string> = {}): Promise<T> {
  const token = method === 'GET' ? null : csrfToken()
  let response: Response
  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError('The server could not be reached. Check that the backend is running.', 0)
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let errors: Record<string, string[]> = {}
    try {
      const data = (await response.json()) as { message?: string; errors?: Record<string, string[]> }
      if (data.message) message = data.message
      if (data.errors) errors = data.errors
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new ApiError(message, response.status, errors)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(`${apiBaseUrl}${path}`, 'GET', undefined, signal)
}

export async function apiGetRelatedProducts(slug: string, signal?: AbortSignal): Promise<Product[]> {
  const response = await apiGet<{ data: Product[] }>(`/products/${encodeURIComponent(slug)}/related`, signal)
  return response.data
}

export async function apiPost<T>(path: string, data?: unknown, headers: Record<string, string> = {}): Promise<T> {
  await initializeCsrf()
  return request<T>(`${apiBaseUrl}${path}`, 'POST', data, undefined, headers)
}

export async function apiPut<T>(path: string, data?: unknown): Promise<T> {
  await initializeCsrf()
  return request<T>(`${apiBaseUrl}${path}`, 'PUT', data)
}

async function initializeCsrf(): Promise<void> {
  try {
    const response = await fetch(`${apiRootUrl}/sanctum/csrf-cookie`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new ApiError(`Could not initialize request security (${response.status})`, response.status)
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('The server could not be reached. Check that the backend is running.', 0)
  }

}

export function money(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'Price unavailable'
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value))
}
