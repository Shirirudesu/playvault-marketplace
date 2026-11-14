<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductReviewApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_public_review_listing_is_paginated_and_returns_database_aggregate(): void
    {
        [$product, $firstUser] = $this->productAndUser();
        $secondUser = User::factory()->create();
        ProductReview::create(['product_id' => $product->id, 'user_id' => $firstUser->id, 'rating' => 5, 'comment' => 'Great game.']);
        ProductReview::create(['product_id' => $product->id, 'user_id' => $secondUser->id, 'rating' => 3, 'comment' => null]);

        $this->getJson("/api/products/{$product->slug}/reviews?per_page=1")
            ->assertOk()
            ->assertJsonPath('summary.average_rating', 4)
            ->assertJsonPath('summary.count', 2)
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.author_name', $secondUser->name)
            ->assertJsonMissingPath('data.0.author_email');
    }

    public function test_guest_cannot_create_or_retrieve_a_private_review(): void
    {
        [$product] = $this->productAndUser();

        $this->postJson("/api/products/{$product->slug}/reviews", ['rating' => 5])->assertUnauthorized();
        $this->getJson("/api/products/{$product->slug}/reviews/mine")->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_and_edit_one_review(): void
    {
        [$product, $user] = $this->productAndUser();
        $this->actingAs($user);

        $this->postJson("/api/products/{$product->slug}/reviews", ['rating' => 4, 'comment' => 'Enjoyed the story.'])
            ->assertCreated()
            ->assertJsonPath('data.rating', 4)
            ->assertJsonPath('data.author_name', $user->name)
            ->assertJsonPath('data.is_mine', true);

        $this->putJson("/api/products/{$product->slug}/reviews/mine", ['rating' => 5, 'comment' => 'After another playthrough, even better.'])
            ->assertOk()
            ->assertJsonPath('data.rating', 5)
            ->assertJsonPath('data.comment', 'After another playthrough, even better.');

        $this->assertSame(1, ProductReview::where('product_id', $product->id)->count());
    }

    public function test_duplicate_review_creation_is_rejected_and_database_unique_constraint_is_present(): void
    {
        [$product, $user] = $this->productAndUser();
        $this->actingAs($user);

        $this->postJson("/api/products/{$product->slug}/reviews", ['rating' => 4])->assertCreated();
        $this->postJson("/api/products/{$product->slug}/reviews", ['rating' => 5])
            ->assertStatus(409)
            ->assertJsonPath('message', 'You have already reviewed this product. Edit your existing review instead.');

        $this->assertSame(1, ProductReview::where('product_id', $product->id)->count());
    }

    public function test_rating_and_comment_validation_reject_invalid_values(): void
    {
        [$product, $user] = $this->productAndUser();
        $this->actingAs($user);

        $this->postJson("/api/products/{$product->slug}/reviews", ['rating' => 6, 'comment' => str_repeat('x', 2001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rating', 'comment']);
    }

    public function test_user_cannot_edit_another_users_review(): void
    {
        [$product, $owner] = $this->productAndUser();
        $review = ProductReview::create(['product_id' => $product->id, 'user_id' => $owner->id, 'rating' => 5, 'comment' => 'Owner only.']);
        $this->actingAs(User::factory()->create());

        $this->putJson("/api/products/{$product->slug}/reviews/mine", ['rating' => 1])
            ->assertNotFound();

        $this->assertSame(5, $review->fresh()->rating);
    }

    public function test_product_details_include_optional_metadata_without_changing_compact_list_contract(): void
    {
        [$product] = $this->productAndUser();
        $product->update([
            'long_description' => "First paragraph.\n\nSecond paragraph.",
            'system_requirements' => ['minimum' => ['ram' => '8 GB']],
            'metadata' => ['developer' => 'Example Studio'],
        ]);

        $this->getJson("/api/products/{$product->slug}")
            ->assertOk()
            ->assertJsonPath('data.long_description', "First paragraph.\n\nSecond paragraph.")
            ->assertJsonPath('data.system_requirements.minimum.ram', '8 GB')
            ->assertJsonPath('data.metadata.developer', 'Example Studio')
            ->assertJsonPath('data.reviews_average_rating', null)
            ->assertJsonPath('data.reviews_count', 0);

        $this->getJson('/api/products?search='.urlencode($product->title))
            ->assertOk()
            ->assertJsonPath('data.0.slug', $product->slug)
            ->assertJsonMissingPath('data.0.long_description')
            ->assertJsonMissingPath('data.0.system_requirements');
    }

    private function productAndUser(): array
    {
        $token = (string) Str::uuid();
        $category = Category::create(['name' => 'Review '.Str::uuid(), 'slug' => 'review-'.Str::uuid()]);
        $product = Product::create([
            'title' => "Review test {$token}",
            'slug' => 'review-test-'.Str::uuid(),
            'description' => 'Compact summary',
            'category_id' => $category->id,
            'platform' => 'PC',
            'region' => 'Global',
        ]);

        return [$product, User::factory()->create()];
    }
}
