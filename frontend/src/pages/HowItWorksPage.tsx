import { Link } from 'react-router'

const steps = [
  { title: 'Compare offers', text: 'Product pages show sample offers from different demo sellers. Choose an offer to see its displayed price and stock information.' },
  { title: 'Review your cart', text: 'Add an offer to your cart and review the items before continuing to the simulated checkout.' },
  { title: 'See the demo delivery', text: 'A completed demo order can show fictional key text in your order details. Those values are sample data and cannot activate a game.' },
]

export function HowItWorksPage() {
  return <article className="mx-auto max-w-[1040px] px-4 py-10 sm:px-6 lg:px-10">
    <nav aria-label="Breadcrumb" className="mb-6 text-xs text-[#B3AAC9]"><Link to="/" className="hover:text-white">Home</Link><span className="px-2">/</span><span className="text-white">How it works</span></nav>
    <header className="border-b border-white/10 pb-6">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#63E3C2]">PlayVault demo guide</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">How this marketplace works</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#D3C8EB]">PlayVault is a learning project that demonstrates a multi-seller digital marketplace flow. Product and offer data are for demonstration.</p>
    </header>
    <section id="offers" className="mt-7 grid gap-3 sm:grid-cols-3">
      {steps.map((step, index) => <div key={step.title} className="border border-white/10 bg-[#1F0A4D] p-4 sm:p-5"><span className="grid h-7 w-7 place-items-center bg-[#5825CC] text-xs font-black text-[#63E3C2]">0{index + 1}</span><h2 className="mt-4 text-base font-extrabold">{step.title}</h2><p className="mt-2 text-xs leading-5 text-[#B3AAC9]">{step.text}</p></div>)}
    </section>
    <section id="delivery" className="mt-7 border border-[#FAD318]/40 bg-[#351183] p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">Demo orders and key delivery</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#D3C8EB]">Checkout is simulated: no payment provider is connected and no money is collected. Order pages may display generated demonstration key strings to illustrate delivery. They are not valid product activations.</p>
    </section>
    <div className="mt-7 flex flex-wrap gap-3"><Link to="/store" className="market-primary inline-flex min-h-10 items-center px-5 text-sm">Browse games</Link><Link to="/" className="inline-flex min-h-10 items-center border border-white/40 px-5 text-sm font-bold hover:border-[#63E3C2]">Back to home</Link></div>
  </article>
}
