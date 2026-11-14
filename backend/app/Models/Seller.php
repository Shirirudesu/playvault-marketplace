<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Seller extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'rating'];

    protected function casts(): array
    {
        return ['rating' => 'decimal:2'];
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }
}
