<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'offer_id' => $this->offer_id,
            'product' => [
                'id' => $this->product_id,
                'title' => $this->product_title,
                'slug' => $this->product_slug,
                'image_url' => $this->product_image_url,
                'platform' => $this->platform,
                'region' => $this->region,
            ],
            'seller' => [
                'id' => $this->seller_id,
                'name' => $this->seller_name,
            ],
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'subtotal' => number_format((float) $this->unit_price * $this->quantity, 2, '.', ''),
            'digital_keys' => DigitalKeyResource::collection($this->whenLoaded('digitalKeys')),
        ];
    }
}
