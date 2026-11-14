<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('digital_keys', function (Blueprint $table) {
            $table->foreignId('order_item_id')->nullable()->unique()->constrained()->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('digital_keys', function (Blueprint $table) {
            $table->dropForeign(['order_item_id']);
            $table->dropUnique(['order_item_id']);
            $table->dropColumn('order_item_id');
        });
    }
};
