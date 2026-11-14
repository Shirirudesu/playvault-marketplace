import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/useAuth";
import { useCategories } from "../marketplace/useCategories";
import { useCart } from "../cart/useCart";
import { apiGet, money, type Paginated, type Product } from "../api";
import { BagIcon, SearchIcon, UserIcon } from "./Icons";

function GlobalSearch() {
  const location = useLocation();
  const initialTerm =
    location.pathname === "/store"
      ? (new URLSearchParams(location.search).get("search") ?? "")
      : "";

  return (
    <GlobalSearchForm
      key={`${location.pathname}:${location.search}`}
      initialTerm={initialTerm}
    />
  );
}

function GlobalSearchForm({ initialTerm }: { initialTerm: string }) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = "global-search-suggestions";
  const [term, setTerm] = useState(initialTerm);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      apiGet<Paginated<Product>>(
        `/products?search=${encodeURIComponent(query)}&per_page=6`,
        controller.signal,
      )
        .then((result) => {
          setSuggestions(result.data);
          setSearched(true);
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setSuggestions([]);
          setFailed(true);
          setSearched(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  useEffect(() => {
    function handleOutside(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    viewAll();
  }

  function viewAll() {
    const value = term.trim();
    setOpen(false);
    navigate(value ? `/store?search=${encodeURIComponent(value)}` : "/store");
  }

  function choose(product: Product) {
    setOpen(false);
    navigate(`/products/${encodeURIComponent(product.slug)}`);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && open && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && open && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
    } else if (
      event.key === "Enter" &&
      open &&
      activeIndex >= 0 &&
      suggestions[activeIndex]
    ) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const showDropdown = open && term.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="relative w-full sm:max-w-2xl">
      <form
        onSubmit={submit}
        role="search"
        className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/12 bg-white text-slate-900 shadow-sm focus-within:border-violet-300"
      >
        <SearchIcon className="ml-4 h-5 w-5 shrink-0 text-slate-500" />
        <input
          type="text"
          role="combobox"
          inputMode="search"
          aria-label="Search games"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-activedescendant={
            activeIndex >= 0 ? `search-option-${activeIndex}` : undefined
          }
          placeholder="Search games, DLC and more"
          value={term}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            const nextTerm = event.target.value;
            setTerm(nextTerm);
            setOpen(true);
            setActiveIndex(-1);
            setSearched(false);
            setFailed(false);
            setSuggestions([]);
            setLoading(nextTerm.trim().length >= 2);
          }}
          onKeyDown={handleKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
        />
        {term && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setTerm("");
              setOpen(false);
            }}
            className="px-2 text-slate-500 hover:text-slate-900"
          >
            ×
          </button>
        )}
        <button className="mr-1.5 hidden rounded-lg bg-[#6d45d8] px-4 py-2 text-xs font-bold text-white hover:bg-[#815cf0] sm:block">
          Search
        </button>
      </form>
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,560px)] overflow-y-auto border border-white/15 bg-[#351183] shadow-2xl sm:min-w-[min(560px,calc(100vw-2rem))]">
          <div id={listId} role="listbox" aria-label="Matching products">
            {loading && suggestions.length === 0 && (
              <p role="status" className="px-4 py-4 text-sm text-[#B3AAC9]">
                Searching products…
              </p>
            )}
            {!loading && searched && suggestions.length === 0 && (
              <p role="status" className="px-4 py-4 text-sm text-[#B3AAC9]">
                {failed
                  ? "Search is temporarily unavailable. You can still view all results."
                  : "No matching products. Try another search."}
              </p>
            )}
            {loading && suggestions.length > 0 && (
              <p role="status" className="px-4 pt-3 text-xs text-[#B3AAC9]">
                Updating results…
              </p>
            )}
            {suggestions.map((product, index) => (
              <button
                key={product.id}
                id={`search-option-${index}`}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(product)}
                className={`flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left transition hover:bg-[#5825CC] focus-visible:bg-[#5825CC] ${activeIndex === index ? "bg-[#5825CC]" : ""}`}
              >
                <img
                  src={product.image_url ?? ""}
                  alt=""
                  className="h-16 w-12 shrink-0 bg-[#1F0A4D] object-cover"
                />
                <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-white">
                  {product.title}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[11px] text-[#B3AAC9]">From</span>
                  <span className="text-sm font-black text-white">
                    {money(product.lowest_offer_price)}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {searched && suggestions.length > 0 && (
            <button
              type="button"
              onClick={viewAll}
              className="w-full px-4 py-3 text-center text-sm font-bold text-[#FAD318] hover:bg-white/5"
            >
              View all results for “{term.trim()}”
            </button>
          )}
          {searched && suggestions.length === 0 && (
            <button
              type="button"
              onClick={viewAll}
              className="w-full px-4 py-3 text-sm font-bold text-[#FAD318] hover:bg-white/5"
            >
              View all results
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Header({ minimal = false }: { minimal?: boolean }) {
  const categories = useCategories();
  const { user, loading: authLoading, logout } = useAuth();
  const { itemCount } = useCart();
  const [logoutError, setLogoutError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [menuOpen]);

  const drawer = menuOpen
    ? createPortal(
        <div
          className="z-[100]"
          style={{ position: "fixed", inset: 0, zIndex: 100 }}
          onMouseDown={(event) => {
            if (!drawerRef.current?.contains(event.target as Node))
              setMenuOpen(false);
          }}
        >
          <div
            aria-hidden="true"
            className="bg-[#100528]/70 backdrop-blur-[1px]"
            style={{ position: "absolute", inset: 0 }}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Browse categories"
            className="relative flex flex-col overflow-y-auto border-r border-white/10 bg-[#4618AC] text-white shadow-2xl"
            style={{ height: "100dvh", width: "min(380px, 88vw)" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                aria-label="PlayVault home"
                className="text-lg font-black"
              >
                play<span className="text-[#FAD318]">vault</span>
              </Link>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close categories"
                onClick={() => setMenuOpen(false)}
                className="grid h-9 w-9 place-items-center text-2xl text-white/80 hover:bg-white/10 focus-visible:outline-[#FAD318]"
              >
                ×
              </button>
            </div>
            <nav aria-label="Product categories" className="py-2">
              <Link
                to="/store"
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center px-5 text-[16px] font-bold hover:bg-white/10 focus-visible:bg-white/10"
              >
                All games
              </Link>
              {categories.length === 0 ? (
                <p className="px-5 py-3 text-[16px] text-[#B3AAC9]">
                  Categories are loading…
                </p>
              ) : (
                categories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/store?category=${encodeURIComponent(category.slug)}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-11 items-center justify-between px-5 text-sm font-medium text-[#E4DCF7] hover:bg-white/10 hover:text-white focus-visible:bg-white/10"
                  >
                    <span>{category.name}</span>
                    <span aria-hidden="true" className="text-[#B3AAC9]">
                      ›
                    </span>
                  </Link>
                ))
              )}
            </nav>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <header className="relative z-20 bg-[#4618AC] text-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:flex-nowrap lg:gap-6 lg:px-10">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="PlayVault home"
          >
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-full bg-[#FAD318] text-lg font-black text-[#1F0A4D]"
            >
              P
            </span>
            <span className="text-xl font-black tracking-tight">
              play<span className="text-[#FAD318]">vault</span>
            </span>
          </Link>
          {!minimal && (
            <>
              <div className="order-3 w-full lg:order-none lg:flex-1">
                <GlobalSearch />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                {authLoading ? (
                  <span
                    aria-label="Checking account"
                    className="h-9 w-20 animate-pulse rounded-lg bg-white/5"
                  />
                ) : user ? (
                  <>
                    <span className="hidden max-w-32 items-center gap-2 truncate px-2 text-xs font-semibold text-slate-200 sm:flex">
                      <UserIcon />
                      {user.name}
                    </span>
                    <Link
                      to="/orders"
                      className="hidden rounded-lg px-2 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white md:inline-flex"
                    >
                      Orders
                    </Link>
                    <button
                      onClick={async () => {
                        setLogoutError(false);
                        try {
                          await logout();
                        } catch {
                          setLogoutError(true);
                        }
                      }}
                      className="rounded-lg px-2 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
                    >
                      {logoutError ? "Try sign out" : "Sign out"}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white sm:px-3"
                    >
                      <UserIcon />
                      <span className="hidden sm:inline">Sign in</span>
                    </Link>
                    <Link
                      to="/register"
                      className="market-primary px-3 py-2 text-xs"
                    >
                      Join
                    </Link>
                  </>
                )}
                <Link
                  to="/cart"
                  aria-label={`Cart, ${itemCount} items`}
                  className="relative flex items-center gap-2 border border-white/25 px-2.5 py-2 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10 sm:px-3"
                >
                  <BagIcon />
                  <span className="hidden sm:inline">Cart</span>
                  {itemCount > 0 && (
                    <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-[#63E3C2] px-1 text-[10px] font-bold text-[#1F0A4D]">
                      {itemCount}
                    </span>
                  )}
                </Link>
              </div>
            </>
          )}
        </div>
        {!minimal && (
          <nav
            aria-label="Main navigation"
            className="border-t border-white/10 bg-[#351183]"
          >
            <div className="mx-auto flex max-w-[1440px] items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6 lg:px-10">
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className="shrink-0 px-3 py-2 text-sm font-semibold text-[#E4DCF7] transition hover:bg-white/10 hover:text-white"
              >
                <span aria-hidden="true" className="mr-2">
                  ☰
                </span>
                Categories
              </button>
              <NavLink
                to="/store"
                className={({ isActive }) =>
                  `shrink-0 px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-white/10 text-white" : "text-[#E4DCF7] hover:bg-white/5 hover:text-white"}`
                }
              >
                Browse games
              </NavLink>
              {categories.slice(0, 5).map((category) => (
                <NavLink
                  key={category.id}
                  to={`/store?category=${encodeURIComponent(category.slug)}`}
                  className="shrink-0 px-3 py-2 text-sm font-medium text-[#D3C8EB] transition hover:bg-white/5 hover:text-white"
                >
                  {category.name}
                </NavLink>
              ))}
              <span className="ml-auto hidden shrink-0 items-center gap-2 px-3 py-2 text-[11px] font-semibold text-[#63E3C2] xl:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#63E3C2]" /> Demo
                inventory · No payment
              </span>
            </div>
          </nav>
        )}
      </header>
      {drawer}
    </>
  );
}
