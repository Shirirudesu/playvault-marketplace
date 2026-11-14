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
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class CheckoutApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_unauthenticated_checkout_and_order_history_are_rejected(): void
    {
        $this->postJson('/api/checkout', ['items' => [['offer_id' => 1, 'quantity' => 1]]])->assertUnauthorized();
        $this->getJson('/api/orders')->assertUnauthorized();
        $this->getJson('/api/orders/1')->assertUnauthorized();
    }

    public function test_checkout_uses_server_price_assigns_keys_and_never_exposes_them_publicly(): void
    {
        [$product, $offer] = $this->offer('checkout-price', '50.00', '20.00', 2);
        $keys = $this->keys($offer, 2);
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->purchase(['items' => [[
            'offer_id' => $offer->id,
            'quantity' => 2,
            'unit_price' => '0.01',
        ]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items.0');
        $this->assertSame(0, Order::where('user_id', $user->id)->count());

        $this->withoutHeader('Idempotency-Key')
            ->postJson('/api/checkout/quote', ['items' => [['offer_id' => $offer->id, 'quantity' => 2]]])
            ->assertOk()
            ->assertJsonPath('data.items.0.unit_price', '40.00')
            ->assertJsonPath('data.items.0.subtotal', '80.00')
            ->assertJsonPath('data.total', '80.00');

        $response = $this->purchase(['items' => [['offer_id' => $offer->id, 'quantity' => 2]]])
            ->assertCreated()
            ->assertJsonPath('data.total', '80.00')
            ->assertJsonPath('data.items.0.unit_price', '40.00')
            ->assertJsonCount(2, 'data.items.0.digital_keys');

        $orderId = $response->json('data.id');
        $item = OrderItem::where('order_id', $orderId)->firstOrFail();
        $this->assertSame('40.00', $item->unit_price);
        $this->assertSame(2, $item->quantity);
        $this->assertSame(0, $offer->fresh()->available_quantity);
        foreach ($keys as $key) {
            $this->assertSame(DigitalKey::STATUS_SOLD, $key->fresh()->availability_status);
            $this->assertSame($item->id, $key->fresh()->order_item_id);
        }

        $this->getJson("/api/products/{$product->slug}")
            ->assertOk()
            ->assertJsonMissing(['key_code' => $keys[0]->key_code]);
    }

    public function test_insufficient_key_inventory_rejects_the_entire_purchase(): void
    {
        [, $offer] = $this->offer('short-inventory', '25.00', '0.00', 2);
        [$key] = $this->keys($offer, 1);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->purchase(['items' => [['offer_id' => $offer->id, 'quantity' => 2]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items');

        $this->assertSame(0, Order::where('user_id', $user->id)->count());
        $this->assertSame(2, $offer->fresh()->available_quantity);
        $this->assertSame(DigitalKey::STATUS_AVAILABLE, $key->fresh()->availability_status);
        $this->assertNull($key->fresh()->order_item_id);
    }

    public function test_purchase_requires_an_idempotency_key(): void
    {
        [, $offer] = $this->offer('missing-idempotency-key', '12.00', '0.00', 1);
        $this->keys($offer, 1);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withoutHeader('Idempotency-Key')
            ->postJson('/api/checkout', ['items' => [['offer_id' => $offer->id, 'quantity' => 1]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('idempotency_key');

        $this->assertSame(1, $offer->fresh()->available_quantity);
        $this->assertSame(0, Order::where('user_id', $user->id)->count());
    }

    public function test_a_later_unavailable_item_rolls_back_earlier_key_assignments_and_order_rows(): void
    {
        [, $firstOffer] = $this->offer('rollback-first', '10.00', '0.00', 1);
        [, $secondOffer] = $this->offer('rollback-second', '20.00', '0.00', 1);
        [$firstKey] = $this->keys($firstOffer, 1);
        $user = User::factory()->create();
        $orderItemCount = OrderItem::count();

        $this->actingAs($user)
            ->purchase(['items' => [
                ['offer_id' => $firstOffer->id, 'quantity' => 1],
                ['offer_id' => $secondOffer->id, 'quantity' => 1],
            ]])
            ->assertUnprocessable();

        $this->assertSame(0, Order::where('user_id', $user->id)->count());
        $this->assertSame($orderItemCount, OrderItem::count());
        $this->assertSame(1, $firstOffer->fresh()->available_quantity);
        $this->assertSame(DigitalKey::STATUS_AVAILABLE, $firstKey->fresh()->availability_status);
        $this->assertNull($firstKey->fresh()->order_item_id);
        $this->assertSame(1, $secondOffer->fresh()->available_quantity);
    }

    public function test_successive_buyers_receive_different_key_rows(): void
    {
        [, $offer] = $this->offer('unique-keys', '30.00', '0.00', 2);
        $this->keys($offer, 2);
        $buyers = [User::factory()->create(), User::factory()->create()];
        $assigned = [];

        foreach ($buyers as $buyer) {
            $this->actingAs($buyer);
            $response = $this->purchase(['items' => [['offer_id' => $offer->id, 'quantity' => 1]]])
                ->assertCreated();
            $assigned[] = $response->json('data.items.0.digital_keys.0.id');
        }

        $this->assertCount(2, array_unique($assigned));
        $this->assertSame(0, $offer->fresh()->available_quantity);
    }

    public function test_repeating_a_checkout_with_the_same_idempotency_key_returns_the_original_order(): void
    {
        [, $offer] = $this->offer('idempotent-checkout', '22.00', '0.00', 2);
        $this->keys($offer, 2);
        $user = User::factory()->create();
        $key = (string) Str::uuid();
        $payload = ['items' => [['offer_id' => $offer->id, 'quantity' => 1]]];

        $this->actingAs($user);
        $first = $this->purchase($payload, $key)->assertCreated();
        $replay = $this->purchase($payload, $key)->assertOk();

        $this->assertSame($first->json('data.id'), $replay->json('data.id'));
        $this->assertSame(1, Order::where('user_id', $user->id)->count());
        $this->assertSame(1, $offer->fresh()->available_quantity);
    }

    public function test_order_history_and_keys_are_private_to_the_owner(): void
    {
        [, $offer] = $this->offer('private-order', '17.50', '0.00', 1);
        $key = $this->keys($offer, 1)[0];
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $created = $this->actingAs($owner)
            ->purchase(['items' => [['offer_id' => $offer->id, 'quantity' => 1]]])
            ->assertCreated();
        $orderId = $created->json('data.id');

        $this->actingAs($otherUser)
            ->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->getJson("/api/orders/{$orderId}")
            ->assertNotFound()
            ->assertJsonPath('message', 'Order not found or unavailable.')
            ->assertJsonMissing(['message' => 'No query results for model [App\\Models\\Order]']);

        $this->actingAs($owner)
            ->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['key_code' => $key->key_code]);
        $this->getJson("/api/orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('data.items.0.digital_keys.0.key_code', $key->key_code);
    }

    private function offer(string $slugPrefix, string $price, string $discount, int $quantity): array
    {
        $category = Category::create([
            'name' => 'Checkout '.Str::uuid(),
            'slug' => 'checkout-'.Str::uuid(),
        ]);
        $product = Product::create([
            'title' => 'Checkout Game '.Str::uuid(),
            'slug' => $slugPrefix.'-'.Str::uuid(),
            'description' => 'Checkout test product',
            'image_url' => null,
            'category_id' => $category->id,
            'platform' => 'PC',
            'region' => 'Global',
            'release_date' => '2024-01-01',
        ]);
        $seller = Seller::create(['name' => 'Checkout Seller '.Str::uuid(), 'rating' => '4.80']);
        $offer = Offer::create([
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'price' => $price,
            'discount_percentage' => $discount,
            'available_quantity' => $quantity,
        ]);

        return [$product, $offer];
    }

    private function purchase(array $payload, ?string $idempotencyKey = null): TestResponse
    {
        return $this->withHeader('Idempotency-Key', $idempotencyKey ?? (string) Str::uuid())
            ->postJson('/api/checkout', $payload);
    }

    private function keys(Offer $offer, int $count): array
    {
        $keys = [];
        foreach (range(1, $count) as $index) {
            $keys[] = DigitalKey::create([
                'offer_id' => $offer->id,
                'key_code' => 'DEMO-CHECKOUT-'.Str::uuid().'-'.$index,
                'availability_status' => DigitalKey::STATUS_AVAILABLE,
            ]);
        }

        return $keys;
    }
}
