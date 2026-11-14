import { Route, Routes } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'
import { StorePage } from './pages/StorePage'
import { AuthPage } from './pages/AuthPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderConfirmationPage, OrderDetailsPage } from './pages/OrderDetailsPage'
import { RequireAuth } from './components/RequireAuth'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { ScrollManager } from './components/ScrollManager'

export default function App() {
  return (
    <>
      <ScrollManager />
      <AppLayout>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="/orders/:orderId/confirmation" element={<RequireAuth><OrderConfirmationPage /></RequireAuth>} />
        <Route path="/orders/:orderId" element={<RequireAuth><OrderDetailsPage /></RequireAuth>} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </>
  )
}

function NotFound() {
  return <div className="mx-auto max-w-2xl px-4 py-24 text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">404 · Not found</p><h1 className="mt-3 text-3xl font-black">This page wandered off.</h1><p className="mt-3 text-sm text-slate-400">Try the store to find your next game.</p><a href="/store" className="mt-6 inline-flex rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold">Browse games</a></div>
}
