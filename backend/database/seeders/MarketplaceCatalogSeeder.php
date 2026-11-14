<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\DigitalKey;
use App\Models\Offer;
use App\Models\Product;
use App\Models\Seller;
use Illuminate\Database\Seeder;

class MarketplaceCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categories = collect([
            ['name' => 'Action', 'slug' => 'action'],
            ['name' => 'Role-Playing Games', 'slug' => 'rpg'],
            ['name' => 'Adventure', 'slug' => 'adventure'],
            ['name' => 'Strategy', 'slug' => 'strategy'],
            ['name' => 'Indie', 'slug' => 'indie'],
        ])->mapWithKeys(fn (array $category) => [
            $category['slug'] => Category::updateOrCreate(['slug' => $category['slug']], $category),
        ]);

        $sellers = collect([
            ['name' => 'Pixel Vault', 'rating' => 4.92],
            ['name' => 'Key Harbor', 'rating' => 4.84],
            ['name' => 'GameGrid', 'rating' => 4.78],
            ['name' => 'Digital Foundry', 'rating' => 4.69],
            ['name' => 'PlayKey Market', 'rating' => 4.61],
        ])->map(fn (array $seller) => Seller::updateOrCreate(['name' => $seller['name']], $seller)->id)->values();

        $legacyFreeToPlayListing = Product::query()->where('slug', 'counter-strike-2')->first();
        $replacementExists = Product::query()->where('slug', 'no-mans-sky')->exists();

        if ($legacyFreeToPlayListing !== null && ! $replacementExists) {
            // Preserve its offers and key rows while replacing the misleading paid base-game listing.
            $legacyFreeToPlayListing->update([
                'title' => 'No Man’s Sky',
                'slug' => 'no-mans-sky',
            ]);
        }

        $legacyFreeToPlayListing = Product::query()->where('slug', 'dota-2')->first();
        $replacementExists = Product::query()->where('slug', 'mass-effect-legendary-edition')->exists();

        if ($legacyFreeToPlayListing !== null && ! $replacementExists) {
            // Preserve its offers and key rows while replacing the free-to-play base game.
            $legacyFreeToPlayListing->update([
                'title' => 'Mass Effect Legendary Edition',
                'slug' => 'mass-effect-legendary-edition',
            ]);
        }

        $products = [
            ['title' => 'Cyberpunk 2077', 'slug' => 'cyberpunk-2077', 'category' => 'rpg', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2020-12-10', 'steam_id' => '1091500', 'description' => 'Explore Night City in this open-world role-playing game set in a high-tech future.'],
            ['title' => 'The Witcher 3: Wild Hunt', 'slug' => 'the-witcher-3-wild-hunt', 'category' => 'rpg', 'platform' => 'PC', 'region' => 'Europe', 'release_date' => '2015-05-18', 'steam_id' => '292030', 'description' => 'Track a child of prophecy across a richly detailed fantasy world.'],
            ['title' => 'Red Dead Redemption 2', 'slug' => 'red-dead-redemption-2', 'category' => 'adventure', 'platform' => 'Xbox Series X|S', 'region' => 'North America', 'release_date' => '2019-12-05', 'steam_id' => '1174180', 'description' => 'Join the Van der Linde gang in an expansive story set in the American frontier.'],
            ['title' => 'Elden Ring', 'slug' => 'elden-ring', 'category' => 'rpg', 'platform' => 'PlayStation 5', 'region' => 'Europe', 'release_date' => '2022-02-25', 'steam_id' => '1245620', 'description' => 'Explore the Lands Between in a fantasy action role-playing adventure.'],
            ['title' => "Baldur's Gate 3", 'slug' => 'baldurs-gate-3', 'category' => 'rpg', 'platform' => 'PC', 'region' => 'Europe', 'release_date' => '2023-08-03', 'steam_id' => '1086940', 'description' => 'Gather a party and shape a story-rich adventure in the Forgotten Realms.'],
            ['title' => 'Grand Theft Auto V', 'slug' => 'grand-theft-auto-v', 'category' => 'action', 'platform' => 'PlayStation 5', 'region' => 'North America', 'release_date' => '2015-04-14', 'steam_id' => '271590', 'description' => 'Follow three unlikely partners through a sprawling crime story in Los Santos.'],
            ['title' => 'Hades', 'slug' => 'hades', 'category' => 'indie', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2020-09-17', 'steam_id' => '1145360', 'description' => 'Battle out of the Underworld in this fast-paced rogue-like dungeon crawler.'],
            ['title' => 'Stardew Valley', 'slug' => 'stardew-valley', 'category' => 'indie', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2016-02-26', 'steam_id' => '413150', 'description' => 'Build a new life on the land in a relaxing country-life role-playing game.'],
            ['title' => 'Terraria', 'slug' => 'terraria', 'category' => 'adventure', 'platform' => 'PC', 'region' => 'Europe', 'release_date' => '2011-05-16', 'steam_id' => '105600', 'description' => 'Dig, build, and fight through a colorful sandbox adventure.'],
            ['title' => 'Sid Meier’s Civilization VI', 'slug' => 'civilization-vi', 'category' => 'strategy', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2016-10-21', 'steam_id' => '289070', 'description' => 'Lead a civilization from its first settlement toward a world-spanning empire.'],
            ['title' => 'No Man’s Sky', 'slug' => 'no-mans-sky', 'category' => 'adventure', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2016-08-12', 'steam_id' => '275850', 'description' => 'Explore an ever-expanding universe in this space exploration and survival adventure. Demo offer prices are illustrative.'],
            ['title' => 'Mass Effect Legendary Edition', 'slug' => 'mass-effect-legendary-edition', 'category' => 'rpg', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2021-05-14', 'steam_id' => '1328670', 'description' => 'Experience the original Mass Effect trilogy with remastered visuals and gameplay.'],
            ['title' => 'Hollow Knight', 'slug' => 'hollow-knight', 'category' => 'adventure', 'platform' => 'PC', 'region' => 'Europe', 'release_date' => '2017-02-24', 'steam_id' => '367520', 'description' => 'Descend into the ancient kingdom of Hallownest in a hand-drawn action adventure.'],
            ['title' => 'God of War', 'slug' => 'god-of-war', 'category' => 'action', 'platform' => 'PlayStation 5', 'region' => 'Europe', 'release_date' => '2022-01-14', 'steam_id' => '1593500', 'description' => 'Journey through Norse mythology with Kratos and his son Atreus.'],
            ['title' => 'Hogwarts Legacy', 'slug' => 'hogwarts-legacy', 'category' => 'adventure', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2023-02-10', 'steam_id' => '990080', 'description' => 'Experience life as a student at Hogwarts in an open-world wizarding adventure.'],
            ['title' => 'Sekiro: Shadows Die Twice', 'slug' => 'sekiro-shadows-die-twice', 'category' => 'action', 'platform' => 'PC', 'region' => 'Europe', 'release_date' => '2019-03-22', 'steam_id' => '814380', 'description' => 'Take up the role of a shinobi in a demanding action adventure set in Japan.'],
            ['title' => 'Resident Evil 4', 'slug' => 'resident-evil-4', 'category' => 'action', 'platform' => 'Xbox Series X|S', 'region' => 'North America', 'release_date' => '2023-03-24', 'steam_id' => '2050650', 'description' => 'Survive a rescue mission in a tense reimagining of the horror classic.'],
            ['title' => 'Subnautica', 'slug' => 'subnautica', 'category' => 'adventure', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2018-01-23', 'steam_id' => '264710', 'description' => 'Explore an alien ocean, gather resources, and uncover the story beneath the waves.'],
            ['title' => 'Portal 2', 'slug' => 'portal-2', 'category' => 'adventure', 'platform' => 'PC', 'region' => 'Europe', 'release_date' => '2011-04-19', 'steam_id' => '620', 'description' => 'Solve physics-bending puzzles with a portal device in a story-driven adventure.'],
            ['title' => 'DOOM Eternal', 'slug' => 'doom-eternal', 'category' => 'action', 'platform' => 'PC', 'region' => 'Global', 'release_date' => '2020-03-20', 'steam_id' => '782330', 'description' => 'Fight through an invasion of Hell in a high-speed first-person shooter.'],
        ];

        foreach ($products as $index => $data) {
            $product = Product::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'title' => $data['title'],
                    'description' => $data['description'],
                    'image_url' => "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{$data['steam_id']}/header.jpg",
                    'category_id' => $categories->get($data['category'])->id,
                    'platform' => $data['platform'],
                    'region' => $data['region'],
                    'release_date' => $data['release_date'],
                ],
            );

            foreach (range(0, 2) as $variant) {
                $sellerId = $sellers->get(($index + $variant) % $sellers->count());
                $price = number_format(24.99 + ($index * 1.37) + ($variant * 2.65), 2, '.', '');
                $discount = [5, 10, 0][$variant];
                $offer = Offer::updateOrCreate(
                    ['product_id' => $product->id, 'seller_id' => $sellerId],
                    ['price' => $price, 'discount_percentage' => $discount, 'available_quantity' => 2],
                );

                $keyCount = $offer->digitalKeys()->count();

                foreach (range(1, $offer->available_quantity) as $number) {
                    if ($keyCount >= $offer->available_quantity) {
                        break;
                    }

                    $keyCode = strtoupper(sprintf('DEMO-%s-%d-%03d', $product->slug, $sellerId, $number));
                    $key = DigitalKey::firstOrCreate(
                        ['key_code' => $keyCode],
                        ['offer_id' => $offer->id, 'availability_status' => DigitalKey::STATUS_AVAILABLE],
                    );

                    if ($key->wasRecentlyCreated) {
                        $keyCount++;
                    }
                }
            }
        }
    }
}
