<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class HomepageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => [
                'banner' => $this->bannerData(),
                'best_sellers' => ProductResource::collection($this->bestSellerProducts())->resolve(request()),
                'deals' => ProductResource::collection($this->dealProducts())->resolve(request()),
            ],
        ]);
    }

    public function banner(): JsonResponse
    {
        return response()->json(['data' => $this->bannerData()]);
    }

    public function bestSellers(): AnonymousResourceCollection
    {
        return ProductResource::collection($this->bestSellerProducts());
    }

    public function deals(): AnonymousResourceCollection
    {
        return ProductResource::collection($this->dealProducts());
    }

    public function categories(): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::query()->withCount('products')->orderByDesc('products_count')->orderBy('name')->get(),
        );
    }

    private function bannerData(): ?array
    {
        $product = Product::query()
            ->withMarketplacePricing()
            ->with('category')
            ->whereHas('offers', fn (Builder $offers) => $offers->available()->where('discount_percentage', '>', 0))
            ->orderByDesc('best_offer_discount_percentage')
            ->orderBy('title')
            ->first();

        if ($product === null) {
            return null;
        }

        return [
            'eyebrow' => 'A deal picked for you',
            'title' => "Meet your next favorite: {$product->title}",
            'description' => $product->description,
            'badge' => 'Up to '.(int) $product->best_offer_discount_percentage.'% off',
            'image_url' => $product->image_url,
            'product_slug' => $product->slug,
            'lowest_offer_price' => $product->lowest_available_offer_price === null
                ? null
                : number_format((float) $product->lowest_available_offer_price, 2, '.', ''),
        ];
    }

    private function bestSellerProducts(): Collection
    {
        $completedSales = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->selectRaw('order_items.product_id, SUM(order_items.quantity) AS units_sold')
            ->where('orders.status', 'completed')
            ->groupBy('order_items.product_id');

        $products = Product::query()
            ->withMarketplacePricing()
            ->with('category')
            ->whereHas('offers', fn (Builder $offers) => $offers->available())
            ->leftJoinSub($completedSales, 'completed_sales', 'completed_sales.product_id', '=', 'products.id')
            ->addSelect('products.*')
            ->selectRaw('COALESCE(completed_sales.units_sold, 0) AS units_sold')
            ->orderByDesc('units_sold')
            ->orderBy('lowest_available_offer_price')
            ->orderBy('title')
            ->limit(8)
            ->get();

        return $products;
    }

    private function dealProducts(): Collection
    {
        $products = Product::query()
            ->withMarketplacePricing()
            ->with('category')
            ->whereHas('offers', fn (Builder $offers) => $offers->available()->where('discount_percentage', '>', 0))
            ->orderByDesc('best_offer_discount_percentage')
            ->orderBy('lowest_available_offer_price')
            ->limit(8)
            ->get();

        return $products;
    }
}
