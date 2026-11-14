<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OfferResource;
use App\Http\Resources\ProductDetailResource;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:120'],
            'category' => ['sometimes', 'string', 'max:120'],
            'platform' => ['sometimes', 'string', 'max:60'],
            'region' => ['sometimes', 'string', 'max:40'],
            'min_price' => ['sometimes', 'numeric', 'min:0'],
            'max_price' => ['sometimes', 'numeric', 'min:0'],
            'sort' => ['sometimes', 'string', 'in:price,title,release_date'],
            'direction' => ['sometimes', 'string', 'in:asc,desc'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        if (isset($filters['min_price'], $filters['max_price']) && $filters['min_price'] > $filters['max_price']) {
            throw ValidationException::withMessages([
                'max_price' => 'The maximum price must be greater than or equal to the minimum price.',
            ]);
        }

        $trigramEnabled = isset($filters['search'])
            && DB::connection()->getDriverName() === 'pgsql'
            && DB::table('pg_extension')->where('extname', 'pg_trgm')->exists();

        $products = Product::query()->withMarketplacePricing()
            ->with('category')
            ->when(isset($filters['search']), function (Builder $query) use ($filters, $trigramEnabled) {
                $search = mb_strtolower(trim($filters['search']));
                $like = "%{$search}%";
                $aliasLike = "EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(products.search_aliases, '[]'::jsonb)) AS aliases(value) WHERE LOWER(aliases.value) LIKE ?)";

                $query->where(function (Builder $matches) use ($search, $like, $aliasLike, $trigramEnabled) {
                    $matches->whereRaw('LOWER(products.title) LIKE ?', [$like]);

                    if (DB::connection()->getDriverName() === 'pgsql') {
                        $matches->orWhereRaw($aliasLike, [$like]);
                    }

                    if ($trigramEnabled && mb_strlen($search) >= 5) {
                        $matches->orWhereRaw('word_similarity(?, LOWER(products.title)) >= 0.35', [$search]);
                        $matches->orWhereRaw("EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(products.search_aliases, '[]'::jsonb)) AS aliases(value) WHERE similarity(LOWER(aliases.value), ?) >= 0.25)", [$search]);
                    }
                });
            })
            ->when(isset($filters['category']), function (Builder $query) use ($filters) {
                $query->whereHas('category', fn (Builder $category) => $category->where('slug', $filters['category']));
            })
            ->when(isset($filters['platform']), fn (Builder $query) => $query->where('platform', $filters['platform']))
            ->when(isset($filters['region']), fn (Builder $query) => $query->where('region', $filters['region']))
            ->when(isset($filters['min_price']) || isset($filters['max_price']), function (Builder $query) use ($filters) {
                $query->whereHas('offers', function (Builder $offers) use ($filters) {
                    $offers->available();

                    if (isset($filters['min_price'])) {
                        $offers->whereRaw('ROUND(price * (1 - discount_percentage / 100.0), 2) >= ?', [$filters['min_price']]);
                    }

                    if (isset($filters['max_price'])) {
                        $offers->whereRaw('ROUND(price * (1 - discount_percentage / 100.0), 2) <= ?', [$filters['max_price']]);
                    }
                });
            });

        $sort = $filters['sort'] ?? 'title';
        $direction = $filters['direction'] ?? 'asc';

        if ($sort === 'price') {
            $products->orderByRaw("lowest_available_offer_price {$direction} NULLS LAST");
        } elseif (! isset($filters['sort']) && isset($filters['search'])) {
            if ($trigramEnabled) {
                $search = mb_strtolower(trim($filters['search']));
                $products->orderByRaw(
                    "CASE WHEN LOWER(products.title) = ? THEN 6 WHEN LOWER(products.title) LIKE ? THEN 5 WHEN LOWER(products.title) LIKE ? THEN 4 WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(products.search_aliases, '[]'::jsonb)) AS aliases(value) WHERE LOWER(aliases.value) = ?) THEN 5.5 WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(products.search_aliases, '[]'::jsonb)) AS aliases(value) WHERE LOWER(aliases.value) LIKE ?) THEN 4.5 ELSE GREATEST(word_similarity(?, LOWER(products.title)), COALESCE((SELECT MAX(similarity(LOWER(aliases.value), ?)) FROM jsonb_array_elements_text(COALESCE(products.search_aliases, '[]'::jsonb)) AS aliases(value)), 0)) END DESC",
                    [$search, "{$search}%", "%{$search}%", $search, "%{$search}%", $search, $search],
                );
            } elseif (DB::connection()->getDriverName() === 'pgsql') {
                $search = mb_strtolower(trim($filters['search']));
                $products->orderByRaw(
                    "CASE WHEN LOWER(products.title) = ? THEN 3 WHEN LOWER(products.title) LIKE ? THEN 2 WHEN EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(products.search_aliases, '[]'::jsonb)) AS aliases(value) WHERE LOWER(aliases.value) = ?) THEN 2.5 ELSE 1 END DESC",
                    [$search, "{$search}%", $search],
                );
            }

            $products->orderBy('products.title');
        } else {
            $products->orderBy("products.{$sort}", $direction);
        }

        return ProductResource::collection(
            $products->paginate($filters['per_page'] ?? 12)->withQueryString(),
        );
    }

    public function show(string $slug): ProductDetailResource
    {
        $product = Product::query()->withMarketplacePricing()
            ->with('category')
            ->withAvg('reviews', 'rating')
            ->withCount('reviews')
            ->where('slug', $slug)
            ->firstOrFail();

        $product->load(['offers' => fn (HasMany $query) => $query
            ->available()
            ->with('seller')
            ->orderByRaw('ROUND(price * (1 - discount_percentage / 100.0), 2) ASC')
            ->orderBy('id')]);

        return new ProductDetailResource($product);
    }

    public function offers(string $slug): AnonymousResourceCollection
    {
        $product = Product::query()->where('slug', $slug)->firstOrFail();
        $offers = $product->offers()
            ->available()
            ->with('seller')
            ->orderByRaw('ROUND(price * (1 - discount_percentage / 100.0), 2) ASC')
            ->orderBy('id')
            ->get();

        return OfferResource::collection($offers);
    }

    public function related(string $slug): AnonymousResourceCollection
    {
        $product = Product::query()->where('slug', $slug)->firstOrFail();

        $related = Product::query()
            ->withMarketplacePricing()
            ->with('category')
            ->whereKeyNot($product->id)
            ->where('category_id', $product->category_id)
            ->whereHas('offers', fn (Builder $offers) => $offers->available())
            ->orderBy('lowest_available_offer_price')
            ->limit(6)
            ->get();

        if ($related->count() < 4) {
            $fallback = Product::query()
                ->withMarketplacePricing()
                ->with('category')
                ->whereKeyNot($product->id)
                ->where('category_id', '!=', $product->category_id)
                ->whereHas('offers', fn (Builder $offers) => $offers->available())
                ->whereNotIn('id', $related->modelKeys())
                ->orderBy('lowest_available_offer_price')
                ->limit(4 - $related->count())
                ->get();

            $related = $related->concat($fallback);
        }

        return ProductResource::collection($related);
    }
}
