import { Link } from 'react-router'

const copyrightYear = new Date().getFullYear()

const linkClass = 'text-xs text-[#B3AAC9] transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FAD318]'

function FooterLinks({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return <section>
    <h2 className="text-sm font-extrabold text-white">{title}</h2>
    <ul className="mt-3 space-y-2">{links.map((link) => <li key={link.to}><Link className={linkClass} to={link.to}>{link.label}</Link></li>)}</ul>
  </section>
}

export function Footer({ minimal = false }: { minimal?: boolean }) {
  if (minimal) {
    return <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-center gap-x-6 gap-y-2 px-4 py-5 text-[11px] text-[#D3C8EB] sm:px-6 lg:px-10"><span>© {copyrightYear} PlayVault</span><span>Demo marketplace · No real payments</span><Link to="/store" className="text-white hover:text-[#FAD318]">Browse games</Link><Link to="/how-it-works" className="text-white hover:text-[#FAD318]">How it works</Link></footer>
  }

  return <footer className="mt-12 border-t border-white/10 bg-[#1F0A4D]">
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-10">
        <div>
          <Link to="/" aria-label="PlayVault home" className="text-xl font-black tracking-tight">play<span className="text-[#FAD318]">vault</span></Link>
          <p className="mt-3 max-w-xs text-xs leading-5 text-[#B3AAC9]">A digital game marketplace demo where you can compare sample offers from multiple sellers.</p>
          <p className="mt-3 border-l-2 border-[#63E3C2] pl-3 text-xs leading-5 text-[#D3C8EB]">Purchases are simulated. Demo keys are fictional and cannot be redeemed. No real payments are accepted.</p>
        </div>
        <FooterLinks title="Marketplace" links={[{ to: '/store', label: 'Browse all games' }, { to: '/store?sort=price&direction=asc', label: 'Sort by lowest price' }, { to: '/cart', label: 'Shopping cart' }]} />
        <FooterLinks title="Your account" links={[{ to: '/login', label: 'Sign in' }, { to: '/register', label: 'Create an account' }, { to: '/orders', label: 'Order history' }]} />
        <FooterLinks title="PlayVault guide" links={[{ to: '/how-it-works', label: 'How the demo works' }, { to: '/how-it-works#offers', label: 'Comparing seller offers' }, { to: '/how-it-works#delivery', label: 'Demo key delivery' }]} />
      </div>
    </div>
    <div className="border-t border-white/10">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-4 text-[11px] text-[#9385B2] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <p>© {copyrightYear} PlayVault · Learning project and simulated marketplace.</p>
        <Link to="/how-it-works" className="hover:text-white">About this demo</Link>
      </div>
    </div>
  </footer>
}
