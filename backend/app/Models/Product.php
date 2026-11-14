<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'slug', 'description', 'image_url', 'category_id',
        'platform', 'region', 'release_date', 'long_description',
        'system_requirements', 'metadata', 'search_aliases',
    ];

    protected function casts(): array
    {
        return [
            'release_date' => 'date',
            'system_requirements' => 'array',
            'metadata' => 'array',
            'search_aliases' => 'array',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ProductReview::class);
    }

    public function scopeWithMarketplacePricing(Builder $query): Builder
    {
        $lowestAvailablePrice = Offer::query()
            ->selectRaw('MIN(ROUND(price * (1 - discount_percentage / 100.0), 2))')
            ->whereColumn('offers.product_id', 'products.id')
            ->where('available_quantity', '>', 0);

        $bestAvailableDiscount = Offer::query()
            ->selectRaw('MAX(discount_percentage)')
            ->whereColumn('offers.product_id', 'products.id')
            ->where('available_quantity', '>', 0);

        return $query->addSelect([
            'lowest_available_offer_price' => $lowestAvailablePrice,
            'best_offer_discount_percentage' => $bestAvailableDiscount,
        ]);
    }
}
