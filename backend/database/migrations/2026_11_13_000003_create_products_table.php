<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('description');
            $table->text('image_url')->nullable();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('platform', 60)->index();
            $table->string('region', 40)->index();
            $table->date('release_date')->nullable()->index();
            $table->timestamps();

            $table->index(['category_id', 'platform', 'region']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
