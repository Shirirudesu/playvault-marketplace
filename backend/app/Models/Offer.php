<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Offer extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id', 'seller_id', 'price', 'discount_percentage', 'available_quantity',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'discount_percentage' => 'decimal:2',
            'available_quantity' => 'integer',
        ];
    }

    public function getDiscountedPriceAttribute(): string
    {
        return number_format(
            (float) $this->price * (1 - (float) $this->discount_percentage / 100),
            2,
            '.',
            '',
        );
    }

    public function scopeAvailable($query)
    {
        return $query->where('available_quantity', '>', 0);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function digitalKeys(): HasMany
    {
        return $this->hasMany(DigitalKey::class);
    }
}
