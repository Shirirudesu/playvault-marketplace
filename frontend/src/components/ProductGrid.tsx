import type { Product } from '../api'
import { ProductCard } from './ProductCard'

export function ProductGrid({ products, layout = 'grid' }: { products: Product[]; layout?: 'grid' | 'rail' }) {
  const className = layout === 'rail'
    ? 'flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-color:#7A4EDF_#351183] [scrollbar-width:thin]'
    : 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 xl:gap-4'

  return <div className={className}>{products.map((product) => <div key={product.id} className={layout === 'rail' ? 'w-[190px] shrink-0 snap-start sm:w-[205px]' : 'min-w-0'}><ProductCard product={product} /></div>)}</div>
}
