<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test 1: Register customer.
     */
    public function test_register_customer_successfully(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Abebe Kebede',
            'email' => 'abebe@example.com',
            'phone' => '+251911223344',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'customer',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'phone', 'role', 'created_at', 'updated_at'],
                'token',
            ])
            ->assertJson([
                'message' => 'Registration successful',
                'user' => [
                    'name' => 'Abebe Kebede',
                    'email' => 'abebe@example.com',
                    'phone' => '+251911223344',
                    'role' => 'customer',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'abebe@example.com',
            'role' => 'customer',
        ]);
    }

    /**
     * Test 2: Register provider and create provider profile.
     */
    public function test_register_provider_successfully_with_profile(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Almaz Plumbing',
            'email' => 'almaz@example.com',
            'phone' => '+251922334455',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'provider',
            'business_name' => 'Almaz Quick Plumbing',
            'experience_years' => 5,
            'location' => 'Bole',
            'description' => 'Fast and reliable plumbing services across Bole.',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'role',
                    'provider_profile' => [
                        'id',
                        'user_id',
                        'business_name',
                        'experience_years',
                        'location',
                        'availability_status',
                        'verification_status',
                    ],
                ],
                'token',
            ])
            ->assertJson([
                'user' => [
                    'role' => 'provider',
                    'provider_profile' => [
                        'business_name' => 'Almaz Quick Plumbing',
                        'experience_years' => 5,
                        'location' => 'Bole',
                        'availability_status' => 'offline',
                        'verification_status' => 'pending',
                    ],
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'business_name' => 'Almaz Quick Plumbing',
            'availability_status' => 'offline',
            'verification_status' => 'pending',
        ]);
    }

    /**
     * Test 3: Attempt admin registration fails validation.
     */
    public function test_attempt_admin_registration_is_rejected(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Hacker Admin',
            'email' => 'admin@example.com',
            'phone' => '+251900000000',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);

        $this->assertDatabaseMissing('users', [
            'email' => 'admin@example.com',
        ]);
    }

    /**
     * Test 4: Login with customer.
     */
    public function test_login_with_customer_successfully(): void
    {
        User::create([
            'name' => 'Dawit Customer',
            'email' => 'dawit@example.com',
            'phone' => '+251933445566',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'dawit@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'phone', 'role'],
                'token',
            ])
            ->assertJson([
                'message' => 'Login successful',
                'user' => [
                    'email' => 'dawit@example.com',
                    'role' => 'customer',
                ],
            ]);
    }

    /**
     * Test 5: Login with provider (returns providerProfile).
     */
    public function test_login_with_provider_successfully(): void
    {
        $user = User::create([
            'name' => 'Tadesse Electrician',
            'email' => 'tadesse@example.com',
            'phone' => '+251944556677',
            'password' => 'password123',
            'role' => 'provider',
        ]);

        $user->providerProfile()->create([
            'business_name' => 'Tadesse Electrical Solutions',
            'experience_years' => 3,
            'location' => 'Piassa',
            'availability_status' => 'offline',
            'verification_status' => 'pending',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'tadesse@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'user' => [
                    'id',
                    'name',
                    'email',
                    'phone',
                    'role',
                    'provider_profile',
                ],
                'token',
            ])
            ->assertJson([
                'user' => [
                    'email' => 'tadesse@example.com',
                    'role' => 'provider',
                    'provider_profile' => [
                        'business_name' => 'Tadesse Electrical Solutions',
                    ],
                ],
            ]);
    }

    /**
     * Test 6: Login with incorrect password returns 401.
     */
    public function test_login_with_incorrect_password_fails(): void
    {
        User::create([
            'name' => 'Sara Test',
            'email' => 'sara@example.com',
            'phone' => '+251955667788',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'sara@example.com',
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Invalid email or password.',
            ]);
    }

    /**
     * Test 7: GET /api/me with valid token.
     */
    public function test_get_me_with_valid_token(): void
    {
        $user = User::create([
            'name' => 'Marta Customer',
            'email' => 'marta@example.com',
            'phone' => '+251966778899',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/me');

        $response->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'name' => 'Marta Customer',
                    'email' => 'marta@example.com',
                    'phone' => '+251966778899',
                    'role' => 'customer',
                ],
            ]);
    }

    /**
     * Test 8: GET /api/me without token returns 401 Unauthenticated.
     */
    public function test_get_me_without_token_fails(): void
    {
        $response = $this->getJson('/api/me');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }

    /**
     * Test 9: Logout with valid token revokes current token.
     */
    public function test_logout_with_valid_token_succeeds(): void
    {
        $user = User::create([
            'name' => 'Helen User',
            'email' => 'helen@example.com',
            'phone' => '+251977889900',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/logout');

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Logged out successfully',
            ]);

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    /**
     * Test 10: Try protected endpoint after logout fails with 401.
     */
    public function test_access_protected_route_after_logout_fails(): void
    {
        $user = User::create([
            'name' => 'Yonas User',
            'email' => 'yonas@example.com',
            'phone' => '+251988990011',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        // Logout
        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/logout')
            ->assertStatus(200);

        app('auth')->forgetGuards();

        // Attempting /api/me with revoked token
        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/me');

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
            ]);
    }
}
