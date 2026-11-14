<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class ProductDetailResource extends ProductResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'long_description' => $this->long_description,
            'system_requirements' => $this->system_requirements,
            'metadata' => $this->metadata,
            'reviews_average_rating' => $this->reviews_avg_rating === null ? null : round((float) $this->reviews_avg_rating, 2),
            'reviews_count' => (int) $this->reviews_count,
        ];
    }
}
