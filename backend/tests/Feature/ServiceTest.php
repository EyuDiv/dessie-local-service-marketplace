<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private User $providerUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Admin
        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@marketplace.com',
            'phone' => '+251911000001',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        // Create Customer
        $this->customer = User::create([
            'name' => 'Customer User',
            'email' => 'customer@marketplace.com',
            'phone' => '+251911000002',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        // Create Provider User & Profile
        $this->providerUser = User::create([
            'name' => 'Provider User',
            'email' => 'provider@marketplace.com',
            'phone' => '+251911000003',
            'password' => 'password123',
            'role' => 'provider',
        ]);

        $this->providerUser->providerProfile()->create([
            'business_name' => 'Pro Services Ltd',
            'experience_years' => 5,
            'location' => 'Bole',
            'availability_status' => 'available',
            'verification_status' => 'verified',
        ]);
    }

    /**
     * 1. Public user can list services.
     */
    public function test_public_user_can_list_services(): void
    {
        Service::create(['name' => 'Plumbing', 'description' => 'Pipe and drainage repairs']);
        Service::create(['name' => 'Electrical', 'description' => 'Wiring and fixture repair']);

        $response = $this->getJson('/api/services');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'description'],
                ],
            ])
            ->assertJsonCount(2, 'data');
    }

    /**
     * 2. Public user can view one service.
     */
    public function test_public_user_can_view_one_service(): void
    {
        $service = Service::create([
            'name' => 'Cleaning',
            'description' => 'Home and office deep cleaning',
        ]);

        $response = $this->getJson("/api/services/{$service->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $service->id,
                    'name' => 'Cleaning',
                    'description' => 'Home and office deep cleaning',
                ],
            ]);
    }

    /**
     * 3. Admin can create a service.
     */
    public function test_admin_can_create_service(): void
    {
        $token = $this->admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/services', [
                'name' => 'Photography',
                'description' => 'Event and portrait photography',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => ['id', 'name', 'description'],
            ])
            ->assertJson([
                'message' => 'Service created successfully',
                'data' => [
                    'name' => 'Photography',
                    'description' => 'Event and portrait photography',
                ],
            ]);

        $this->assertDatabaseHas('services', [
            'name' => 'Photography',
        ]);
    }

    /**
     * 4. Customer cannot create a service.
     */
    public function test_customer_cannot_create_service(): void
    {
        $token = $this->customer->createToken('customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/services', [
                'name' => 'Painting',
                'description' => 'Wall and interior painting',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);

        $this->assertDatabaseMissing('services', [
            'name' => 'Painting',
        ]);
    }

    /**
     * 5. Provider cannot create a service.
     */
    public function test_provider_cannot_create_service(): void
    {
        $token = $this->providerUser->createToken('provider_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/services', [
                'name' => 'Carpentry',
                'description' => 'Custom furniture and repairs',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);

        $this->assertDatabaseMissing('services', [
            'name' => 'Carpentry',
        ]);
    }

    /**
     * 6. Unauthenticated user cannot create a service.
     */
    public function test_unauthenticated_user_cannot_create_service(): void
    {
        $response = $this->postJson('/api/services', [
            'name' => 'Tutoring',
            'description' => 'Math and Physics tutoring',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    /**
     * 7. Admin can update a service.
     */
    public function test_admin_can_update_service(): void
    {
        $service = Service::create([
            'name' => 'Computer Repair',
            'description' => 'Hardware fixes',
        ]);

        $token = $this->admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/services/{$service->id}", [
                'name' => 'Computer & Laptop Repair',
                'description' => 'Hardware and software troubleshooting',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Service updated successfully',
                'data' => [
                    'id' => $service->id,
                    'name' => 'Computer & Laptop Repair',
                    'description' => 'Hardware and software troubleshooting',
                ],
            ]);

        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'name' => 'Computer & Laptop Repair',
        ]);
    }

    /**
     * 8. Customer cannot update a service.
     */
    public function test_customer_cannot_update_service(): void
    {
        $service = Service::create([
            'name' => 'Plumbing',
            'description' => 'Pipe repair',
        ]);

        $token = $this->customer->createToken('customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/services/{$service->id}", [
                'name' => 'Hacked Plumbing',
                'description' => 'Hacked description',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /**
     * 9. Provider cannot update a service.
     */
    public function test_provider_cannot_update_service(): void
    {
        $service = Service::create([
            'name' => 'Electrical',
            'description' => 'Wiring repair',
        ]);

        $token = $this->providerUser->createToken('provider_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/services/{$service->id}", [
                'name' => 'Provider Electrical',
                'description' => 'Updated by provider',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /**
     * 10. Admin can delete an unused service.
     */
    public function test_admin_can_delete_unused_service(): void
    {
        $service = Service::create([
            'name' => 'Temporary Service',
            'description' => 'To be deleted',
        ]);

        $token = $this->admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/services/{$service->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Service deleted successfully']);

        $this->assertDatabaseMissing('services', [
            'id' => $service->id,
        ]);
    }

    /**
     * 11. Customer cannot delete a service.
     */
    public function test_customer_cannot_delete_service(): void
    {
        $service = Service::create([
            'name' => 'Cleaning',
            'description' => 'Deep cleaning',
        ]);

        $token = $this->customer->createToken('customer_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/services/{$service->id}");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);

        $this->assertDatabaseHas('services', ['id' => $service->id]);
    }

    /**
     * 12. Provider cannot delete a service.
     */
    public function test_provider_cannot_delete_service(): void
    {
        $service = Service::create([
            'name' => 'Carpentry',
            'description' => 'Woodworking',
        ]);

        $token = $this->providerUser->createToken('provider_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/services/{$service->id}");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);

        $this->assertDatabaseHas('services', ['id' => $service->id]);
    }

    /**
     * 13. Unauthenticated user cannot delete a service.
     */
    public function test_unauthenticated_user_cannot_delete_service(): void
    {
        $service = Service::create([
            'name' => 'Painting',
            'description' => 'Wall painting',
        ]);

        $response = $this->deleteJson("/api/services/{$service->id}");

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);

        $this->assertDatabaseHas('services', ['id' => $service->id]);
    }

    /**
     * 14. Non-existent service returns 404.
     */
    public function test_non_existent_service_returns_404(): void
    {
        $response = $this->getJson('/api/services/99999');

        $response->assertStatus(404)
            ->assertJson(['message' => 'Service not found.']);
    }

    /**
     * 15. Duplicate service name is rejected.
     */
    public function test_duplicate_service_name_is_rejected(): void
    {
        Service::create([
            'name' => 'Plumbing',
            'description' => 'Initial plumbing service',
        ]);

        $token = $this->admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/services', [
                'name' => 'Plumbing',
                'description' => 'Duplicate plumbing entry',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    /**
     * 16. Invalid service data is rejected.
     */
    public function test_invalid_service_data_is_rejected(): void
    {
        $token = $this->admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/services', [
                'name' => '',
                'description' => '',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description']);
    }

    /**
     * 17. Admin cannot delete a service that has existing service requests (preserves transaction history).
     */
    public function test_admin_cannot_delete_service_with_existing_service_requests(): void
    {
        $service = Service::create([
            'name' => 'Plumbing',
            'description' => 'Plumbing service',
        ]);

        $profile = $this->providerUser->providerProfile;

        ServiceRequest::create([
            'customer_id' => $this->customer->id,
            'provider_id' => $profile->id,
            'service_id' => $service->id,
            'description' => 'Emergency water leak fix',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '14:00:00',
            'status' => 'pending',
        ]);

        $token = $this->admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/services/{$service->id}");

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'Cannot delete service because it is referenced by existing service requests.',
            ]);

        $this->assertDatabaseHas('services', ['id' => $service->id]);
    }

    /**
     * 18. Admin cannot delete a service currently offered by providers.
     */
    public function test_admin_cannot_delete_service_offered_by_providers(): void
    {
        $service = Service::create([
            'name' => 'Electrical',
            'description' => 'Electrical maintenance',
        ]);

        $profile = $this->providerUser->providerProfile;
        $profile->services()->attach($service->id);

        $token = $this->admin->createToken('admin_token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/services/{$service->id}");

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'Cannot delete service because it is currently offered by one or more providers.',
            ]);

        $this->assertDatabaseHas('services', ['id' => $service->id]);
    }
}
