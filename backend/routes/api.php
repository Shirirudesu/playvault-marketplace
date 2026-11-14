<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogFilterController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\HomepageController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductReviewController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/checkout/quote', [CheckoutController::class, 'quote']);
    Route::post('/checkout', [CheckoutController::class, 'store']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{order}', [OrderController::class, 'show'])->whereNumber('order');
});

Route::get('/homepage', [HomepageController::class, 'index']);

Route::prefix('homepage')->group(function () {
    Route::get('/banner', [HomepageController::class, 'banner']);
    Route::get('/best-sellers', [HomepageController::class, 'bestSellers']);
    Route::get('/deals', [HomepageController::class, 'deals']);
    Route::get('/categories', [HomepageController::class, 'categories']);
});

Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/catalog/filters', CatalogFilterController::class);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}/reviews', [ProductReviewController::class, 'index']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/products/{slug}/reviews/mine', [ProductReviewController::class, 'mine']);
    Route::post('/products/{slug}/reviews', [ProductReviewController::class, 'store'])->middleware('throttle:10,1');
    Route::put('/products/{slug}/reviews/mine', [ProductReviewController::class, 'update'])->middleware('throttle:10,1');
});
Route::get('/products/{slug}/related', [ProductController::class, 'related']);
Route::get('/products/{slug}/offers', [ProductController::class, 'offers']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
