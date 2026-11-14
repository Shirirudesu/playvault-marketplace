<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutQuoteRequest;
use App\Http\Requests\CheckoutRequest;
use App\Http\Resources\OrderResource;
use App\Services\CheckoutService;
use Illuminate\Http\JsonResponse;

class CheckoutController extends Controller
{
    public function quote(CheckoutQuoteRequest $request, CheckoutService $checkout): JsonResponse
    {
        return response()->json(['data' => $checkout->quote($request->validated('items'))]);
    }

    public function store(CheckoutRequest $request, CheckoutService $checkout): JsonResponse
    {
        $order = $checkout->checkout(
            $request->user(),
            $request->validated('items'),
            $request->validated('idempotency_key'),
        );

        return (new OrderResource($order))->response()->setStatusCode($order->wasRecentlyCreated ? 201 : 200);
    }
}
