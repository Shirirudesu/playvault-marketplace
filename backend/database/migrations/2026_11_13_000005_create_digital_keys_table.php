<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offer_id')->constrained()->cascadeOnDelete();
            $table->string('key_code')->unique();
            $table->string('availability_status', 16)->default('available');
            $table->timestamps();

            $table->index(['offer_id', 'availability_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_keys');
    }
};
