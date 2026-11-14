<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductReviewResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductReviewController extends Controller
{
    public function index(Request $request, string $slug): AnonymousResourceCollection
    {
        $validated = $request->validate(['per_page' => ['sometimes', 'integer', 'min:1', 'max:50']]);
        $product = Product::query()->where('slug', $slug)->firstOrFail();
        $reviews = $product->reviews()
            ->with('user')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($validated['per_page'] ?? 10)
            ->withQueryString();
        $summary = $product->reviews()->selectRaw('COUNT(*) AS count, AVG(rating) AS average_rating')->first();

        return ProductReviewResource::collection($reviews)->additional(['summary' => [
            'average_rating' => $summary->count ? round((float) $summary->average_rating, 2) : null,
            'count' => (int) $summary->count,
        ]]);
    }

    public function mine(Request $request, string $slug): JsonResponse
    {
        $product = Product::query()->where('slug', $slug)->firstOrFail();
        $review = $product->reviews()->with('user')->where('user_id', $request->user()->id)->first();

        return response()->json(['data' => $review ? (new ProductReviewResource($review))->resolve($request) : null]);
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        $product = Product::query()->where('slug', $slug)->firstOrFail();
        abort_if($product->reviews()->where('user_id', $request->user()->id)->exists(), 409, 'You have already reviewed this product. Edit your existing review instead.');
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = $product->reviews()->create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => (new ProductReviewResource($review->load('user')))->resolve($request)], 201);
    }

    public function update(Request $request, string $slug): JsonResponse
    {
        $product = Product::query()->where('slug', $slug)->firstOrFail();
        $review = $product->reviews()->where('user_id', $request->user()->id)->firstOrFail();
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review->update($validated);

        return response()->json(['data' => (new ProductReviewResource($review->load('user')))->resolve($request)]);
    }
}
