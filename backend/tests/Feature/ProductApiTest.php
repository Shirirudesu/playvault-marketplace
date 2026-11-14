<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\DigitalKey;
use App\Models\Offer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_product_search_and_filters_match_available_discounted_offer_prices(): void
    {
        $token = Str::uuid()->toString();
        [$action, $seller] = $this->categoryAndSeller('Action');
        $productSlug = "apex-legends-{$token}";
        $product = $this->product($action, "Apex Legends {$token}", $productSlug, 'PlayStation 5', 'North America');
        $this->offer($product, $seller, '50.00', '20.00', 3);
        $this->offer($product, Seller::create(['name' => 'Out of Stock '.Str::uuid(), 'rating' => '4.00']), '10.00', '0.00', 0);

        $otherCategory = Category::create([
            'name' => 'Other '.Str::uuid(),
            'slug' => 'other-'.Str::uuid(),
        ]);
        $otherProduct = $this->product($otherCategory, "Apex Legends Other Edition {$token}", "apex-other-edition-{$token}", 'PlayStation 5', 'North America');
        $this->offer($otherProduct, $seller, '50.00', '20.00', 2);

        $differentPlatform = $this->product($action, "Apex Legends: Another Season {$token}", "apex-another-season-{$token}", 'PC', 'Europe');
        $this->offer($differentPlatform, $seller, '60.00', '10.00', 1);

        $response = $this->getJson('/api/products?'.http_build_query([
            'search' => $token,
            'category' => $action->slug,
            'platform' => 'PlayStation 5',
            'region' => 'North America',
            'min_price' => 39,
            'max_price' => 41,
        ]));

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', $productSlug)
            ->assertJsonPath('data.0.lowest_offer_price', '40.00');
    }

    public function test_product_list_sorts_by_lowest_available_offer_price_and_paginates(): void
    {
        $token = Str::uuid()->toString();
        [$category, $seller] = $this->categoryAndSeller('Indie');
        $expensive = $this->product($category, "Zeta {$token}", "zeta-{$token}");
        $cheap = $this->product($category, "Alpha {$token}", "alpha-{$token}");
        $expensive->update(['release_date' => '2024-01-01']);
        $cheap->update(['release_date' => '2020-01-01']);
        $this->offer($expensive, $seller, '30.00');
        $this->offer($cheap, $seller, '12.50');

        $query = [
            'search' => $token,
            'sort' => 'price',
            'direction' => 'asc',
            'per_page' => 1,
        ];

        $this->getJson('/api/products?'.http_build_query($query))
            ->assertOk()
            ->assertJsonPath('data.0.slug', "alpha-{$token}")
            ->assertJsonPath('data.0.lowest_offer_price', '12.50')
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/products?'.http_build_query(array_merge($query, ['sort' => 'title', 'per_page' => 12])))
            ->assertOk()
            ->assertJsonPath('data.0.slug', "alpha-{$token}");

        $this->getJson('/api/products?'.http_build_query(array_merge($query, ['sort' => 'release_date', 'direction' => 'desc', 'per_page' => 12])))
            ->assertOk()
            ->assertJsonPath('data.0.slug', "zeta-{$token}");
    }

    public function test_product_detail_and_offers_include_sellers_but_never_key_codes(): void
    {
        $productSlug = 'the-example-'.Str::uuid()->toString();
        [$category, $seller] = $this->categoryAndSeller('RPG');
        $product = $this->product($category, 'The Example', $productSlug);
        $offer = $this->offer($product, $seller, '40.00', '5.00', 2);
        $this->offer($product, Seller::create(['name' => 'Unavailable Seller '.Str::uuid(), 'rating' => '4.00']), '20.00', '0.00', 0);
        DigitalKey::create([
            'offer_id' => $offer->id,
            'key_code' => 'DEMO-PRIVATE-KEY-DO-NOT-RETURN',
            'availability_status' => DigitalKey::STATUS_AVAILABLE,
        ]);

        $this->getJson("/api/products/{$productSlug}")
            ->assertOk()
            ->assertJsonPath('data.slug', $productSlug)
            ->assertJsonPath('data.offers.0.seller.name', $seller->name)
            ->assertJsonMissing(['key_code' => 'DEMO-PRIVATE-KEY-DO-NOT-RETURN']);

        $this->getJson("/api/products/{$productSlug}/offers")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.discounted_price', '38.00')
            ->assertJsonMissing(['key_code' => 'DEMO-PRIVATE-KEY-DO-NOT-RETURN']);
    }

    public function test_categories_endpoint_returns_category_data(): void
    {
        $categorySlug = 'test-category-'.Str::uuid()->toString();
        Category::create([
            'name' => 'Test Category '.Str::uuid(),
            'slug' => $categorySlug,
        ]);

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonFragment(['slug' => $categorySlug]);
    }

    public function test_related_products_prefer_available_products_from_the_same_category_and_exclude_current(): void
    {
        [$category, $seller] = $this->categoryAndSeller('Related');
        $current = $this->product($category, 'Current game', 'current-'.Str::uuid());
        $sameCategory = $this->product($category, 'Related game', 'related-'.Str::uuid());
        $unavailable = $this->product($category, 'Unavailable game', 'unavailable-'.Str::uuid());
        $otherCategory = Category::create(['name' => 'Other '.Str::uuid(), 'slug' => 'other-'.Str::uuid()]);
        $fallback = $this->product($otherCategory, 'Fallback game', 'fallback-'.Str::uuid());

        $this->offer($current, $seller, '10.00');
        $this->offer($sameCategory, $seller, '12.00');
        $this->offer($unavailable, Seller::create(['name' => 'Out of stock '.Str::uuid(), 'rating' => '4.00']), '1.00', '0.00', 0);
        $this->offer($fallback, $seller, '15.00');

        $response = $this->getJson('/api/products/'.$current->slug.'/related');

        $response->assertOk()
            ->assertJsonFragment(['slug' => $sameCategory->slug])
            ->assertJsonFragment(['slug' => $fallback->slug])
            ->assertJsonMissing(['slug' => $current->slug])
            ->assertJsonMissing(['slug' => $unavailable->slug]);
    }

    public function test_homepage_sections_return_database_backed_content(): void
    {
        [$category, $seller] = $this->categoryAndSeller('Homepage');
        $seller->update(['rating' => '5.00']);
        $slug = 'homepage-feature-'.Str::uuid()->toString();
        $product = $this->product($category, 'Homepage Feature', $slug);
        $this->offer($product, $seller, '40.00', '20.00', 2);

        $this->getJson('/api/homepage/banner')
            ->assertOk()
            ->assertJsonPath('data.product_slug', $slug)
            ->assertJsonPath('data.lowest_offer_price', '32.00');

        $homepage = $this->getJson('/api/homepage')
            ->assertOk()
            ->assertJsonPath('data.banner.product_slug', $slug);
        $this->assertIsArray($homepage->json('data.best_sellers'));

        $bestSellers = $this->getJson('/api/homepage/best-sellers')->assertOk();
        $this->assertIsArray($bestSellers->json('data'));

        $this->getJson('/api/homepage/deals')
            ->assertOk()
            ->assertJsonFragment(['slug' => $slug]);

        $this->getJson('/api/homepage/categories')
            ->assertOk()
            ->assertJsonFragment(['slug' => $category->slug]);
    }

    public function test_postgres_trigram_search_finds_a_minor_spelling_error(): void
    {
        if (! DB::table('pg_extension')->where('extname', 'pg_trgm')->exists()) {
            $this->markTestSkipped('The optional pg_trgm extension is not installed.');
        }

        [$category] = $this->categoryAndSeller('Fuzzy Search');
        $token = Str::uuid()->toString();
        $productSlug = "tiny-robot-{$token}";
        $this->product($category, "Tiny Robot {$token}", $productSlug);

        $this->getJson('/api/products?'.http_build_query(['search' => "tiny robt {$token}"]))
            ->assertOk()
            ->assertJsonFragment(['slug' => $productSlug]);
    }

    public function test_search_retains_partial_matching(): void
    {
        [$category] = $this->categoryAndSeller('Partial Search');
        $token = Str::uuid()->toString();
        $productSlug = "partial-match-{$token}";
        $this->product($category, "Partial Match {$token}", $productSlug);

        $this->getJson('/api/products?'.http_build_query(['search' => 'partial match']))
            ->assertOk()
            ->assertJsonFragment(['slug' => $productSlug]);
    }

    public function test_search_matches_product_aliases_and_returns_no_unrelated_results(): void
    {
        [$category] = $this->categoryAndSeller('Alias Search');
        $gta = $this->product($category, 'Grand Theft Auto V', 'alias-gta-'.Str::uuid());
        $gta->update(['search_aliases' => ['GTA', 'GTA 5', 'GTA V']]);
        $cyberpunk = $this->product($category, 'Cyberpunk 2077', 'alias-cyberpunk-'.Str::uuid());
        $cyberpunk->update(['search_aliases' => ['Cyberpunk', 'CP2077']]);

        foreach (['gta' => $gta, 'gta 5' => $gta, 'grand theft' => $gta, 'cyberpunk' => $cyberpunk] as $query => $product) {
            $this->getJson('/api/products?'.http_build_query(['search' => $query]))
                ->assertOk()
                ->assertJsonFragment(['slug' => $product->slug]);
        }

        $this->getJson('/api/products?'.http_build_query(['search' => 'nothing-matches-'.Str::uuid()]))
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_postgres_alias_trigram_search_finds_cyberpunk_typo(): void
    {
        if (! DB::table('pg_extension')->where('extname', 'pg_trgm')->exists()) {
            $this->markTestSkipped('The optional pg_trgm extension is not installed.');
        }

        [$category] = $this->categoryAndSeller('Typo Search');
        $product = $this->product($category, 'Cyberpunk 2077', 'typo-cyberpunk-'.Str::uuid());
        $product->update(['search_aliases' => ['Cyberpunk', 'Cyberpunk 2077']]);

        $this->getJson('/api/products?search=cyberpnk')
            ->assertOk()
            ->assertJsonFragment(['slug' => $product->slug]);
    }

    public function test_homepage_best_sellers_rank_completed_units_and_ignore_other_statuses(): void
    {
        [$category, $seller] = $this->categoryAndSeller('Sales Ranking');
        $top = $this->product($category, 'Most Units '.Str::uuid(), 'units-top-'.Str::uuid());
        $second = $this->product($category, 'Fewer Units '.Str::uuid(), 'units-second-'.Str::uuid());
        $pending = $this->product($category, 'Pending Order '.Str::uuid(), 'units-pending-'.Str::uuid());
        $topOffer = $this->offer($top, $seller, '40.00');
        $secondOffer = $this->offer($second, $seller, '40.00');
        $pendingOffer = $this->offer($pending, $seller, '40.00');
        $user = User::factory()->create();

        $this->recordSale($user, $top, $topOffer, 'completed', 30000);
        $this->recordSale($user, $second, $secondOffer, 'completed', 29999);
        $this->recordSale($user, $pending, $pendingOffer, 'pending', 30000);

        $slugs = collect($this->getJson('/api/homepage/best-sellers')->assertOk()->json('data'))
            ->pluck('slug')->all();

        $this->assertLessThan(array_search($second->slug, $slugs, true), array_search($top->slug, $slugs, true));
        $pendingIndex = array_search($pending->slug, $slugs, true);
        $this->assertTrue($pendingIndex === false || array_search($second->slug, $slugs, true) < $pendingIndex);
    }

    public function test_homepage_best_sellers_fallback_is_repeatable_and_limited_to_eight(): void
    {
        $existingSoldProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('offers', 'offers.id', '=', 'order_items.offer_id')
            ->where('orders.status', 'completed')
            ->where('offers.available_quantity', '>', 0)
            ->distinct()
            ->count('order_items.product_id');

        if ($existingSoldProducts >= 6) {
            $this->markTestSkipped('The local database already has six or more sold products, so two fallback slots are not available to exercise.');
        }

        [$category] = $this->categoryAndSeller('Sales Fallback');
        $user = User::factory()->create();
        $popularProductsToCreate = 6 - $existingSoldProducts;
        for ($index = 0; $index < $popularProductsToCreate; $index++) {
            $seller = Seller::create(['name' => 'Fallback Seller '.Str::uuid(), 'rating' => '4.00']);
            $popular = $this->product($category, 'Popular '.Str::uuid(), 'popular-'.Str::uuid());
            $popularOffer = $this->offer($popular, $seller, '50.00');
            $this->recordSale($user, $popular, $popularOffer, 'completed', 30000);
        }
        $first = collect($this->getJson('/api/homepage/best-sellers')->assertOk()->json('data'))->pluck('slug')->all();
        $second = collect($this->getJson('/api/homepage/best-sellers')->assertOk()->json('data'))->pluck('slug')->all();

        $this->assertSame($first, $second);
        $this->assertNotEmpty($first);
        $this->assertLessThanOrEqual(8, count($first));
    }

    private function recordSale(User $user, Product $product, Offer $offer, string $status, int $quantity): void
    {
        $order = Order::create(['user_id' => $user->id, 'total' => $quantity * 40, 'status' => $status]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'offer_id' => $offer->id,
            'seller_id' => $offer->seller_id,
            'product_title' => $product->title,
            'product_slug' => $product->slug,
            'platform' => $product->platform,
            'region' => $product->region,
            'seller_name' => $offer->seller->name,
            'unit_price' => '40.00',
            'quantity' => $quantity,
        ]);
    }

    public function test_price_range_validation_rejects_a_minimum_above_the_maximum(): void
    {
        $this->getJson('/api/products?min_price=20&max_price=10')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('max_price');
    }

    private function categoryAndSeller(string $categoryName): array
    {
        $category = Category::create([
            'name' => $categoryName.' '.Str::uuid(),
            'slug' => str($categoryName.'-'.Str::uuid())->slug()->toString(),
        ]);
        $seller = Seller::create(['name' => 'Test Seller '.Str::uuid(), 'rating' => '4.75']);

        return [$category, $seller];
    }

    private function product(Category $category, string $title, string $slug, string $platform = 'PC', string $region = 'Global'): Product
    {
        return Product::create([
            'title' => $title,
            'slug' => $slug,
            'description' => "{$title} demo description",
            'image_url' => null,
            'category_id' => $category->id,
            'platform' => $platform,
            'region' => $region,
            'release_date' => '2024-01-01',
        ]);
    }

    private function offer(Product $product, Seller $seller, string $price, string $discount = '0.00', int $quantity = 2): Offer
    {
        return Offer::create([
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'price' => $price,
            'discount_percentage' => $discount,
            'available_quantity' => $quantity,
        ]);
    }
}
