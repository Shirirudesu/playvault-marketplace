<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSearchAliasSeeder extends Seeder
{
    public function run(): void
    {
        $aliases = [
            'grand-theft-auto-v' => ['GTA', 'GTA 5', 'GTA V', 'GTA5', 'Grand Theft Auto 5', 'Grand Theft Auto Five'],
            'cyberpunk-2077' => ['Cyberpunk', 'Cyberpunk 2077', 'CP2077'],
        ];

        foreach ($aliases as $slug => $searchAliases) {
            Product::query()->where('slug', $slug)->update(['search_aliases' => json_encode($searchAliases)]);
        }
    }
}
