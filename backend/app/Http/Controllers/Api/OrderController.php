<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return OrderResource::collection(
            $request->user()->orders()
                ->with('items')
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->paginate(10),
        );
    }

    public function show(Request $request, int $order): OrderResource|JsonResponse
    {
        $ownedOrder = $request->user()->orders()
            ->with('items.digitalKeys')
            ->whereKey($order)
            ->first();

        if (! $ownedOrder) {
            return response()->json(['message' => 'Order not found or unavailable.'], 404);
        }

        return new OrderResource($ownedOrder);
    }
}
