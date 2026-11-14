<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class CatalogFilterController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                'platforms' => Product::query()->select('platform')->distinct()->orderBy('platform')->pluck('platform'),
                'regions' => Product::query()->select('region')->distinct()->orderBy('region')->pluck('region'),
            ],
        ]);
    }
}
