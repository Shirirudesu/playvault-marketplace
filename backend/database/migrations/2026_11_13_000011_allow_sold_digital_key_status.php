<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE digital_keys DROP CONSTRAINT digital_keys_status_valid');
        DB::statement("ALTER TABLE digital_keys ADD CONSTRAINT digital_keys_status_valid CHECK (availability_status IN ('available', 'reserved', 'redeemed', 'sold'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE digital_keys DROP CONSTRAINT digital_keys_status_valid');
        DB::statement("ALTER TABLE digital_keys ADD CONSTRAINT digital_keys_status_valid CHECK (availability_status IN ('available', 'reserved', 'redeemed'))");
    }
};
