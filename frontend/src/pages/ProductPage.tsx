import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  apiGet,
  apiGetRelatedProducts,
  money,
  type Offer,
  type Product,
} from "../api";
import { ErrorState, LoadingState } from "../components/PageStates";
import { ProductArtwork } from "../components/ProductArtwork";
import { SectionHeading } from "../components/SectionHeading";
import { useCart } from "../cart/useCart";
import { ProductGrid } from "../components/ProductGrid";
import { ProductInformation } from "../components/ProductInformation";
import { ProductReviews } from "../components/ProductReviews";

export function ProductPage() {
  const { slug = "" } = useParams();
  const [loadState, setLoadState] = useState<{
    slug: string;
    product?: Product;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [relatedState, setRelatedState] = useState<{
    slug: string;
    products: Product[];
    error?: string;
  } | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    const controller = new AbortController();

    apiGet<{ data: Product }>(
      `/products/${encodeURIComponent(slug)}`,
      controller.signal,
    )
      .then((response) => {
        setLoadState({ slug, product: response.data });
        setSelectedOffer(response.data.offers?.[0]?.id ?? null);
      })
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError")
          return;
        setLoadState({
          slug,
          error:
            loadError instanceof Error
              ? loadError.message
              : "This product could not be loaded.",
        });
      });

    return () => controller.abort();
  }, [slug, retry]);

  useEffect(() => {
    const controller = new AbortController();
    apiGetRelatedProducts(slug, controller.signal)
      .then((products) => setRelatedState({ slug, products }))
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError")
          return;
        setRelatedState({
          slug,
          products: [],
          error:
            loadError instanceof Error
              ? loadError.message
              : "Similar games could not be loaded.",
        });
      });
    return () => controller.abort();
  }, [slug]);

  const error = loadState?.slug === slug ? loadState.error : null;
  const product = loadState?.slug === slug ? (loadState.product ?? null) : null;

  if (error)
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10">
        <ErrorState
          message={error}
          onRetry={() => setRetry((count) => count + 1)}
        />
      </div>
    );
  if (!product)
    return (
      <div data-scroll-pending="true" className="mx-auto max-w-[1440px] space-y-8 px-4 py-12 sm:px-6 lg:px-10">
        <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
        <LoadingState label="Loading product" />
      </div>
    );

  const offers = product.offers ?? [];
  const cheapestOffer = offers[0];
  const selected =
    offers.find((offer) => offer.id === selectedOffer) ?? cheapestOffer;
  const currentProduct = product;
  const date = product.release_date
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${product.release_date}T00:00:00Z`))
    : "Not listed";

  function addSelectedOffer() {
    if (!selected) return;
    const errorMessage = addItem(currentProduct, selected);
    setCartError(errorMessage);
    setCartMessage(
      errorMessage
        ? null
        : `${selected.seller?.name ?? "Seller offer"} added to your cart.`,
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-4 sm:px-6 lg:px-10">
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-400"
      >
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        <span>/</span>
        <Link to="/store" className="hover:text-white">
          Games
        </Link>
        <span>/</span>
        <span className="text-slate-200">{product.title}</span>
      </nav>

      <section className="grid min-w-0 items-start gap-x-4 gap-y-4 grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-[190px_minmax(0,1fr)_340px] lg:gap-x-5 xl:gap-x-6">
        <div className="row-start-1 lg:col-start-1">
          <ProductArtwork
            key={product.id}
            src={product.image_url}
            title={product.title}
            fit="contain"
            portraitBackdrop
            loading="eager"
            className="aspect-[2/3] w-full border border-white/15 bg-[#19083F] shadow-lg shadow-[#1F0A4D]/35"
          />
        </div>

        <article className="min-w-0 row-start-1 lg:col-start-2">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#63E3C2]">
            {product.category?.name} <span className="text-white/40">/</span>{" "}
            {product.platform}
          </p>
          <h1 className="mt-2 text-[21px] font-extrabold leading-tight tracking-tight sm:text-[27px]">
            {product.title}
          </h1>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-white/15 pt-3 sm:grid-cols-3 lg:mt-5">
            <InfoTag label="Platform" value={product.platform} />
            <InfoTag label="Region" value={product.region} />
            <InfoTag label="Release date" value={date} />
            <InfoTag label="Activation" value="Digital key" />
            <InfoTag label="Delivery" value="After purchase" />
          </dl>

          <section id="seller-offers" className="mt-5 scroll-mt-4">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#63E3C2]">
                  Compare prices
                </p>
                <h2 className="mt-1 text-[20px] font-extrabold">
                  Available seller offers
                </h2>
              </div>
              <span className="text-xs text-[#D3C8EB]">{offers.length} offers</span>
            </div>
            {offers.length ? (
              <div className="space-y-2">
                {offers.map((offer, index) => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    selected={selected?.id === offer.id}
                    best={index === 0}
                    onSelect={() => setSelectedOffer(offer.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="border border-dashed border-white/15 bg-[#1F0A4D] p-4 text-sm text-slate-400">
                No seller offers are available for this product yet.
              </p>
            )}
            <p className="mt-3 text-[11px] leading-5 text-slate-400">
              Offer prices and available quantities are verified again during
              checkout. Public pages never reveal digital key codes.
            </p>
          </section>
        </article>

        <aside className="col-span-full row-start-2 border border-white/10 bg-[#5825CC] p-4 sm:p-5 lg:sticky lg:top-4 lg:col-span-1 lg:col-start-3 lg:row-start-1">
          {selected ? (
            <>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FAD318]">
                {selected.id === cheapestOffer?.id
                  ? "Best available offer"
                  : "Selected seller offer"}
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] text-[#D3C8EB]">
                    {selected.seller?.name ?? "Marketplace seller"}
                  </p>
                  <p className="mt-1 text-[10px] text-[#D3C8EB]">
                    ★ {Number(selected.seller?.rating ?? 0).toFixed(2)} ·{" "}
                    {selected.available_quantity} available
                  </p>
                </div>
                <p className="shrink-0 text-[30px] font-black leading-none">
                  {money(selected.discounted_price)}
                </p>
              </div>
              {selected.id !== cheapestOffer?.id && cheapestOffer && (
                <p className="mt-2 text-[11px] text-[#D3C8EB]">
                  Lowest price {money(cheapestOffer.discounted_price)}
                </p>
              )}
              <button
                type="button"
                onClick={addSelectedOffer}
                className="market-primary mt-4 h-11 w-full text-sm"
              >
                Add selected offer to cart
              </button>
              {cartMessage && (
                <p
                  role="status"
                  className="mt-3 border border-[#63E3C2]/25 bg-[#1F0A4D]/30 px-3 py-2 text-xs text-[#BFF6E8]"
                >
                  {cartMessage}{" "}
                  <Link to="/cart" className="ml-1 font-bold underline">
                    View cart
                  </Link>
                </p>
              )}
              {cartError && (
                <p
                  role="alert"
                  className="mt-3 border border-[#E76A8C]/35 bg-[#1F0A4D]/30 px-3 py-2 text-xs text-white"
                >
                  {cartError}
                </p>
              )}
              <a
                href="#seller-offers"
                className="mt-3 block border-t border-white/15 pt-3 text-center text-xs font-bold text-white hover:text-[#FAD318]"
              >
                Compare {offers.length} seller offers{" "}
                <span aria-hidden="true">↓</span>
              </a>
            </>
          ) : (
            <div className="py-3">
              <h2 className="text-base font-extrabold">No available offers</h2>
              <p className="mt-2 text-xs text-[#D3C8EB]">
                There are no seller offers for this product right now.
              </p>
            </div>
          )}
          <p className="mt-3 border-t border-white/10 pt-3 text-[10px] leading-4 text-[#D3C8EB]">
            Simulated checkout · sample offer data
          </p>
        </aside>
      </section>

      <div className="mt-9 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ProductInformation product={product} />
        <aside className="border border-white/10 bg-[#1F0A4D] p-4 sm:p-5">
          <h2 className="text-base font-extrabold">Digital delivery</h2>
          <p className="mt-2 text-xs leading-5 text-[#B3AAC9]">
            This listing represents a digital key. In this demo, an order
            displays fictional sample key text after simulated checkout.
          </p>
          <p className="mt-3 border-l-2 border-[#FAD318] pl-3 text-xs font-semibold leading-5 text-white">
            Demo keys cannot activate or redeem a real game. No payment is
            collected.
          </p>
        </aside>
      </div>

      <ProductReviews key={slug} slug={slug} />

      <section className="mt-9" aria-label="Similar games">
        <SectionHeading
          title="Similar games"
          description="Other available games in this category, with a few marketplace alternatives when needed."
          href="/store"
          actionLabel="Browse all"
        />
        {relatedState?.slug !== slug ? (
          <div
            className="h-[360px] animate-pulse bg-[#351183]"
            aria-label="Loading similar games"
          />
        ) : relatedState.error ? (
          <p
            role="status"
            className="border border-white/10 bg-[#1F0A4D] p-4 text-xs text-[#B3AAC9]"
          >
            Similar games are temporarily unavailable.
          </p>
        ) : relatedState.products.length ? (
          <ProductGrid products={relatedState.products} layout="rail" />
        ) : (
          <p className="border border-dashed border-white/15 bg-[#1F0A4D] p-4 text-xs text-[#B3AAC9]">
            No similar games with available offers are listed yet.
          </p>
        )}
      </section>
    </div>
  );
}

function InfoTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9385B2]">
        {label}
      </dt>
      <dd
        className="mt-0.5 truncate text-xs font-semibold text-white"
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function OfferRow({
  offer,
  selected,
  best,
  onSelect,
}: {
  offer: Offer;
  selected: boolean;
  best: boolean;
  onSelect: () => void;
}) {
  const discount = Number(offer.discount_percentage);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FAD318] sm:px-4 ${selected ? "border-[#63E3C2] bg-[#351183]" : "border-white/10 bg-[#1F0A4D] hover:border-white/35 hover:bg-[#2A0E68]"}`}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-extrabold text-white">
            {offer.seller?.name ?? "Marketplace seller"}
          </span>
          {best && (
            <span className="bg-[#84E916]/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-[#84E916]">
              Best price
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-[11px] text-[#B3AAC9]">
          ★ {Number(offer.seller?.rating ?? 0).toFixed(2)} rating ·{" "}
          {offer.available_quantity} available
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-lg font-black leading-tight text-white">
          {money(offer.discounted_price)}
        </span>
        {discount > 0 && (
          <span className="block text-[10px] font-bold text-[#84E916]">
            −{Math.round(discount)}%
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 place-items-center border ${selected ? "border-[#63E3C2] bg-[#63E3C2] text-[#1F0A4D]" : "border-white/40 text-transparent"}`}
      >
        ✓
      </span>
    </button>
  );
}
