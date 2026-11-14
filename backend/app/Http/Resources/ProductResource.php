<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $lowestPrice = $this->getAttribute('lowest_available_offer_price');
        $bestDiscount = $this->getAttribute('best_offer_discount_percentage');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'platform' => $this->platform,
            'region' => $this->region,
            'release_date' => $this->release_date?->toDateString(),
            'lowest_offer_price' => $lowestPrice === null ? null : number_format((float) $lowestPrice, 2, '.', ''),
            'best_offer_discount_percentage' => $bestDiscount === null ? null : number_format((float) $bestDiscount, 2, '.', ''),
            'offers' => OfferResource::collection($this->whenLoaded('offers')),
        ];
    }
}
