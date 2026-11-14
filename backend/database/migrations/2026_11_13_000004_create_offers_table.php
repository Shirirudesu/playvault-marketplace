<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained()->restrictOnDelete();
            $table->decimal('price', 10, 2);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->integer('available_quantity')->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'seller_id']);
            $table->index(['product_id', 'available_quantity', 'price']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
