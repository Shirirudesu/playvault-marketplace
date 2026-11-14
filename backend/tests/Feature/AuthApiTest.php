<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_registration_creates_a_hashed_user_and_authenticates_the_session(): void
    {
        $email = 'new-'.Str::uuid().'@example.test';
        $password = 'correct-horse-battery';

        $this->postJson('/api/register', [
            'name' => 'New Player',
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $password,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'New Player')
            ->assertJsonPath('data.email', $email)
            ->assertJsonMissingPath('data.password');

        $user = User::where('email', $email)->firstOrFail();
        $this->assertTrue(Hash::check($password, $user->password));

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_registration_validates_required_fields_unique_email_and_confirmed_password(): void
    {
        $existing = User::factory()->create();

        $this->postJson('/api/register', [
            'name' => '',
            'email' => $existing->email,
            'password' => 'short',
            'password_confirmation' => 'different',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_login_accepts_valid_credentials_and_rejects_invalid_credentials(): void
    {
        $password = 'secure-password-123';
        $user = User::factory()->create(['password' => $password]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => $password])
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);

        auth()->logout();

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_logout_clears_the_session_and_current_user_is_protected(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();

        $user = User::factory()->create();
        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->getJson('/api/user')->assertOk()->assertJsonPath('data.email', $user->email);
        $this->postJson('/api/logout')->assertOk()->assertJsonPath('message', 'Logged out successfully.');
        $this->assertGuest('web');
    }

    public function test_spa_csrf_cookie_and_credentialed_cors_are_enabled(): void
    {
        $this->get('/sanctum/csrf-cookie')
            ->assertNoContent()
            ->assertCookie('XSRF-TOKEN');

        $this->call('OPTIONS', '/api/login', [], [], [], [
            'HTTP_ORIGIN' => 'http://127.0.0.1:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,x-xsrf-token',
        ])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5173')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }
}
