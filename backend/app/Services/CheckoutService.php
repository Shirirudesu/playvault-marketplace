<?php

namespace App\Services;

use App\Models\DigitalKey;
use App\Models\Offer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CheckoutService
{
    public function quote(array $items): array
    {
        $offers = $this->loadOffers($items);
        $offerIds = $offers->keys()->all();
        $availableKeyCounts = DigitalKey::query()
            ->whereIn('offer_id', $offerIds)
            ->where('availability_status', DigitalKey::STATUS_AVAILABLE)
            ->whereNull('order_item_id')
            ->selectRaw('offer_id, COUNT(*) AS available_key_count')
            ->groupBy('offer_id')
            ->pluck('available_key_count', 'offer_id');

        $lines = [];
        $totalCents = 0;

        foreach ($items as $item) {
            $offer = $offers->get((int) $item['offer_id']);
            $quantity = (int) $item['quantity'];
            $this->assertInventory($offer, $quantity, (int) $availableKeyCounts->get($offer->id, 0));

            $unitPrice = (string) $offer->checkout_price;
            $subtotalCents = $this->toCents($unitPrice) * $quantity;
            $totalCents += $subtotalCents;
            $lines[] = $this->quoteLine($offer, $quantity, $unitPrice, $subtotalCents);
        }

        return ['items' => $lines, 'total' => $this->fromCents($totalCents)];
    }

    public function checkout(User $user, array $items, string $idempotencyKey): Order
    {
        $existingOrder = $user->orders()->where('idempotency_key', $idempotencyKey)->first();
        if ($existingOrder) {
            return $existingOrder->load(['items.digitalKeys']);
        }

        try {
            return DB::transaction(function () use ($user, $items, $idempotencyKey): Order {
                $offers = $this->loadOffers($items, lockForUpdate: true);
                $order = Order::create([
                    'user_id' => $user->id,
                    'total' => '0.00',
                    'status' => 'completed',
                    'idempotency_key' => $idempotencyKey,
                ]);
                $totalCents = 0;

                foreach ($items as $item) {
                    $offer = $offers->get((int) $item['offer_id']);
                    $quantity = (int) $item['quantity'];
                    $keys = DigitalKey::query()
                        ->where('offer_id', $offer->id)
                        ->where('availability_status', DigitalKey::STATUS_AVAILABLE)
                        ->whereNull('order_item_id')
                        ->orderBy('id')
                        ->limit($quantity)
                        ->lockForUpdate()
                        ->get();

                    $this->assertInventory($offer, $quantity, $keys->count());

                    $unitPrice = (string) $offer->checkout_price;
                    $orderItem = OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $offer->product_id,
                        'offer_id' => $offer->id,
                        'seller_id' => $offer->seller_id,
                        'product_title' => $offer->product->title,
                        'product_slug' => $offer->product->slug,
                        'product_image_url' => $offer->product->image_url,
                        'platform' => $offer->product->platform,
                        'region' => $offer->product->region,
                        'seller_name' => $offer->seller->name,
                        'unit_price' => $unitPrice,
                        'quantity' => $quantity,
                    ]);

                    foreach ($keys as $key) {
                        $key->forceFill([
                            'order_item_id' => $orderItem->id,
                            'availability_status' => DigitalKey::STATUS_SOLD,
                        ])->save();
                    }

                    $offer->decrement('available_quantity', $quantity);
                    $totalCents += $this->toCents($unitPrice) * $quantity;
                }

                $order->update(['total' => $this->fromCents($totalCents)]);

                return $order->load(['items.digitalKeys']);
            }, 3);
        } catch (QueryException $exception) {
            // The unique constraint handles concurrent retries that both initially see no order.
            $existingOrder = $user->orders()->where('idempotency_key', $idempotencyKey)->first();
            if ($existingOrder) {
                return $existingOrder->load(['items.digitalKeys']);
            }

            throw $exception;
        }
    }

    private function loadOffers(array $items, bool $lockForUpdate = false): Collection
    {
        $offerIds = collect($items)->pluck('offer_id')->map(fn ($id) => (int) $id)->all();
        $query = Offer::query()
            ->select('offers.*')
            ->selectRaw('ROUND(price * (1 - discount_percentage / 100.0), 2) AS checkout_price')
            ->with(['product', 'seller'])
            ->whereIn('offers.id', $offerIds)
            ->orderBy('offers.id');

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        $offers = $query->get()->keyBy('id');

        if ($offers->count() !== count(array_unique($offerIds))) {
            throw ValidationException::withMessages([
                'items' => ['One or more seller offers are no longer available. Refresh your cart and try again.'],
            ]);
        }

        return $offers;
    }

    private function assertInventory(Offer $offer, int $quantity, int $availableKeys): void
    {
        if ($offer->available_quantity < $quantity || $availableKeys < $quantity) {
            throw ValidationException::withMessages([
                'items' => ["{$offer->product->title} from {$offer->seller->name} no longer has enough keys available."],
            ]);
        }
    }

    private function quoteLine(Offer $offer, int $quantity, string $unitPrice, int $subtotalCents): array
    {
        return [
            'offer_id' => $offer->id,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'subtotal' => $this->fromCents($subtotalCents),
            'product' => [
                'id' => $offer->product->id,
                'title' => $offer->product->title,
                'slug' => $offer->product->slug,
                'image_url' => $offer->product->image_url,
                'platform' => $offer->product->platform,
                'region' => $offer->product->region,
            ],
            'seller' => [
                'id' => $offer->seller->id,
                'name' => $offer->seller->name,
            ],
        ];
    }

    private function toCents(string $amount): int
    {
        [$units, $fraction] = array_pad(explode('.', number_format((float) $amount, 2, '.', ''), 2), 2, '00');

        return ((int) $units * 100) + (int) str_pad($fraction, 2, '0');
    }

    private function fromCents(int $amount): string
    {
        return sprintf('%d.%02d', intdiv($amount, 100), $amount % 100);
    }
}
