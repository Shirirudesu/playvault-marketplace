import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { Footer } from './Footer'
import { Header } from './Header'

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const minimal = pathname === '/login' || pathname === '/register'
  return <div className="min-h-screen bg-[#4618AC] text-white"><Header minimal={minimal} /><main className={minimal ? 'min-h-[calc(100vh-8rem)]' : 'min-h-[62vh]'}>{children}</main><Footer minimal={minimal} /></div>
}
