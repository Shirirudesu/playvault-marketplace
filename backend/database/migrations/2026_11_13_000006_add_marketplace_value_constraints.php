<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE sellers ADD CONSTRAINT sellers_rating_range CHECK (rating >= 0 AND rating <= 5)');
        DB::statement('ALTER TABLE offers ADD CONSTRAINT offers_price_nonnegative CHECK (price >= 0)');
        DB::statement('ALTER TABLE offers ADD CONSTRAINT offers_discount_range CHECK (discount_percentage >= 0 AND discount_percentage <= 100)');
        DB::statement('ALTER TABLE offers ADD CONSTRAINT offers_quantity_nonnegative CHECK (available_quantity >= 0)');
        DB::statement("ALTER TABLE digital_keys ADD CONSTRAINT digital_keys_status_valid CHECK (availability_status IN ('available', 'reserved', 'redeemed'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE digital_keys DROP CONSTRAINT IF EXISTS digital_keys_status_valid');
        DB::statement('ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_quantity_nonnegative');
        DB::statement('ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_discount_range');
        DB::statement('ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_price_nonnegative');
        DB::statement('ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_rating_range');
    }
};
