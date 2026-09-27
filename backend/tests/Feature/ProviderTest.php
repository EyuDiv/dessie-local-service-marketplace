<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProviderTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer;
    private User $provider1;
    private ProviderProfile $profile1;
    private User $provider2;
    private ProviderProfile $profile2;
    private Service $servicePlumbing;
    private Service $serviceElectrical;

    protected function setUp(): void
    {
        parent::setUp();

        // Admin
        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@marketplace.com',
            'phone' => '+251911000001',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        // Customer
        $this->customer = User::create([
            'name' => 'Customer User',
            'email' => 'customer@marketplace.com',
            'phone' => '+251911000002',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        // Provider 1
        $this->provider1 = User::create([
            'name' => 'Almaz Provider',
            'email' => 'almaz@marketplace.com',
            'phone' => '+251911000003',
            'password' => 'password123',
            'role' => 'provider',
        ]);

        $this->profile1 = $this->provider1->providerProfile()->create([
            'business_name' => 'Almaz Plumbing & Heating',
            'description' => 'Fast residential plumbing repairs',
            'experience_years' => 4,
            'location' => 'Bole',
            'availability_status' => 'offline',
            'verification_status' => 'pending',
        ]);

        // Provider 2
        $this->provider2 = User::create([
            'name' => 'Dawit Provider',
            'email' => 'dawit@marketplace.com',
            'phone' => '+251911000004',
            'password' => 'password123',
            'role' => 'provider',
        ]);

        $this->profile2 = $this->provider2->providerProfile()->create([
            'business_name' => 'Dawit Electrical Works',
            'description' => 'Licensed electrician in Piassa',
            'experience_years' => 7,
            'location' => 'Piassa',
            'availability_status' => 'offline',
            'verification_status' => 'pending',
        ]);

        // Services
        $this->servicePlumbing = Service::create([
            'name' => 'Plumbing',
            'description' => 'Pipe and water fixture repair',
        ]);

        $this->serviceElectrical = Service::create([
            'name' => 'Electrical',
            'description' => 'Wiring and circuit fixes',
        ]);
    }

    // ==========================================
    // PART 1 — PROVIDER PROFILE (Tests 1 - 7)
    // ==========================================

    /** 1. Provider can view own profile. */
    public function test_provider_can_view_own_profile(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/profile');

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $this->profile1->id,
                    'user_id' => $this->provider1->id,
                    'business_name' => 'Almaz Plumbing & Heating',
                    'experience_years' => 4,
                    'location' => 'Bole',
                    'availability_status' => 'offline',
                    'verification_status' => 'pending',
                ],
            ]);
    }

    /** 2. Provider can update own profile. */
    public function test_provider_can_update_own_profile(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/profile', [
                'business_name' => 'Almaz Advanced Plumbing Services',
                'description' => 'Commercial and home plumbing',
                'experience_years' => 5,
                'location' => 'Kazanchis',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Provider profile updated successfully',
                'data' => [
                    'business_name' => 'Almaz Advanced Plumbing Services',
                    'description' => 'Commercial and home plumbing',
                    'experience_years' => 5,
                    'location' => 'Kazanchis',
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'business_name' => 'Almaz Advanced Plumbing Services',
            'location' => 'Kazanchis',
        ]);
    }

    /** 3. Customer cannot access provider profile endpoint. */
    public function test_customer_cannot_access_provider_profile(): void
    {
        $token = $this->customer->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/profile');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 4. Admin cannot use provider self-management endpoint. */
    public function test_admin_cannot_access_provider_profile_endpoint(): void
    {
        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/profile');

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 5. Unauthenticated user cannot access provider profile. */
    public function test_unauthenticated_user_cannot_access_provider_profile(): void
    {
        $response = $this->getJson('/api/provider/profile');

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    /** 6. Provider cannot modify verification_status through profile update. */
    public function test_provider_cannot_modify_verification_status_via_profile_update(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/profile', [
                'business_name' => 'Almaz Plumbing',
                'experience_years' => 4,
                'location' => 'Bole',
                'verification_status' => 'verified', // Malicious attempt
            ]);

        $response->assertStatus(200);

        // Assert verification_status is STILL pending
        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'verification_status' => 'pending',
        ]);
    }

    /** 7. Provider cannot modify availability_status through profile update. */
    public function test_provider_cannot_modify_availability_status_via_profile_update(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/profile', [
                'business_name' => 'Almaz Plumbing',
                'experience_years' => 4,
                'location' => 'Bole',
                'availability_status' => 'available', // Must use separate availability endpoint
            ]);

        $response->assertStatus(200);

        // Assert availability is STILL offline
        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'availability_status' => 'offline',
        ]);
    }

    // ==========================================
    // PART 2 — AVAILABILITY (Tests 8 - 12)
    // ==========================================

    /** 8. Provider can set available. */
    public function test_provider_can_set_available(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/availability', [
                'availability_status' => 'available',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Availability status updated successfully',
                'data' => [
                    'availability_status' => 'available',
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'availability_status' => 'available',
        ]);
    }

    /** 9. Provider can set busy. */
    public function test_provider_can_set_busy(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/availability', [
                'availability_status' => 'busy',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'availability_status' => 'busy',
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'availability_status' => 'busy',
        ]);
    }

    /** 10. Provider can set offline. */
    public function test_provider_can_set_offline(): void
    {
        $this->profile1->update(['availability_status' => 'available']);

        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/availability', [
                'availability_status' => 'offline',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'availability_status' => 'offline',
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'availability_status' => 'offline',
        ]);
    }

    /** 11. Invalid availability status is rejected. */
    public function test_invalid_availability_status_is_rejected(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/availability', [
                'availability_status' => 'on_vacation',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['availability_status']);
    }

    /** 12. Customer cannot change provider availability. */
    public function test_customer_cannot_change_provider_availability(): void
    {
        $token = $this->customer->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/availability', [
                'availability_status' => 'available',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    // ==========================================
    // PART 3 — PROVIDER SERVICES (Tests 13 - 20)
    // ==========================================

    /** 13. Provider can list own services. */
    public function test_provider_can_list_own_services(): void
    {
        $this->profile1->services()->attach($this->servicePlumbing->id);

        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/services');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'description'],
                ],
            ])
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    ['id' => $this->servicePlumbing->id, 'name' => 'Plumbing'],
                ],
            ]);
    }

    /** 14. Provider can attach an existing service. */
    public function test_provider_can_attach_existing_service(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/provider/services', [
                'service_id' => $this->servicePlumbing->id,
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'message' => 'Service added successfully',
                'data' => [
                    'id' => $this->servicePlumbing->id,
                    'name' => 'Plumbing',
                ],
            ]);

        $this->assertDatabaseHas('provider_services', [
            'provider_id' => $this->profile1->id,
            'service_id' => $this->servicePlumbing->id,
        ]);
    }

    /** 15. Provider cannot attach non-existent service. */
    public function test_provider_cannot_attach_non_existent_service(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/provider/services', [
                'service_id' => 99999,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['service_id']);
    }

    /** 16. Provider cannot attach duplicate service. */
    public function test_provider_cannot_attach_duplicate_service(): void
    {
        $this->profile1->services()->attach($this->servicePlumbing->id);

        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/provider/services', [
                'service_id' => $this->servicePlumbing->id,
            ]);

        $response->assertStatus(409)
            ->assertJson([
                'message' => 'Service is already offered by this provider.',
            ]);

        $this->assertDatabaseCount('provider_services', 1);
    }

    /** 17. Provider can remove an offered service. */
    public function test_provider_can_remove_offered_service(): void
    {
        $this->profile1->services()->attach($this->servicePlumbing->id);

        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/provider/services/{$this->servicePlumbing->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Service removed successfully']);

        $this->assertDatabaseMissing('provider_services', [
            'provider_id' => $this->profile1->id,
            'service_id' => $this->servicePlumbing->id,
        ]);
    }

    /** 18. Removing a service does not delete the actual service record. */
    public function test_removing_service_from_provider_does_not_delete_service_table_record(): void
    {
        $this->profile1->services()->attach($this->servicePlumbing->id);

        $token = $this->provider1->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/provider/services/{$this->servicePlumbing->id}")
            ->assertStatus(200);

        // The service MUST still exist in services table
        $this->assertDatabaseHas('services', [
            'id' => $this->servicePlumbing->id,
            'name' => 'Plumbing',
        ]);
    }

    /** 19. Customer cannot manage provider services. */
    public function test_customer_cannot_manage_provider_services(): void
    {
        $token = $this->customer->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/provider/services', [
                'service_id' => $this->servicePlumbing->id,
            ])
            ->assertStatus(403);
    }

    /** 20. Unauthenticated user cannot manage provider services. */
    public function test_unauthenticated_user_cannot_manage_provider_services(): void
    {
        $this->postJson('/api/provider/services', [
            'service_id' => $this->servicePlumbing->id,
        ])->assertStatus(401);
    }

    // ==========================================
    // PART 4 — ADMIN VERIFICATION (Tests 21 - 27)
    // ==========================================

    /** 21. Admin can list providers. */
    public function test_admin_can_list_providers(): void
    {
        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/providers');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'user_id',
                        'business_name',
                        'experience_years',
                        'location',
                        'availability_status',
                        'verification_status',
                        'user' => ['id', 'name', 'email', 'phone'],
                    ],
                ],
            ])
            ->assertJsonCount(2, 'data');
    }

    /** 22. Admin can verify provider. */
    public function test_admin_can_verify_provider(): void
    {
        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/providers/{$this->profile1->id}/verification", [
                'verification_status' => 'verified',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Provider verification status updated successfully',
                'data' => [
                    'id' => $this->profile1->id,
                    'verification_status' => 'verified',
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'verification_status' => 'verified',
        ]);
    }

    /** 23. Admin can reject provider. */
    public function test_admin_can_reject_provider(): void
    {
        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/providers/{$this->profile1->id}/verification", [
                'verification_status' => 'rejected',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $this->profile1->id,
                    'verification_status' => 'rejected',
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'verification_status' => 'rejected',
        ]);
    }

    /** 24. Admin can set provider verification back to pending. */
    public function test_admin_can_set_provider_verification_to_pending(): void
    {
        $this->profile1->update(['verification_status' => 'verified']);

        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/providers/{$this->profile1->id}/verification", [
                'verification_status' => 'pending',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'verification_status' => 'pending',
                ],
            ]);

        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile1->id,
            'verification_status' => 'pending',
        ]);
    }

    /** 25. Provider cannot verify themselves. */
    public function test_provider_cannot_verify_themselves(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/providers/{$this->profile1->id}/verification", [
                'verification_status' => 'verified',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 26. Customer cannot verify providers. */
    public function test_customer_cannot_verify_providers(): void
    {
        $token = $this->customer->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/admin/providers/{$this->profile1->id}/verification", [
                'verification_status' => 'verified',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 27. Unauthenticated user cannot access admin provider endpoints. */
    public function test_unauthenticated_user_cannot_access_admin_provider_endpoints(): void
    {
        $this->getJson('/api/admin/providers')->assertStatus(401);

        $this->putJson("/api/admin/providers/{$this->profile1->id}/verification", [
            'verification_status' => 'verified',
        ])->assertStatus(401);
    }

    // ==========================================
    // PART 5 — PUBLIC DISCOVERY (Tests 28 - 33)
    // ==========================================

    /** 28. Public user can list verified providers. */
    public function test_public_user_can_list_verified_providers(): void
    {
        // Mark profile1 as verified
        $this->profile1->update(['verification_status' => 'verified']);
        // profile2 remains pending

        $response = $this->getJson('/api/providers');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    [
                        'id' => $this->profile1->id,
                        'business_name' => 'Almaz Plumbing & Heating',
                        'verification_status' => 'verified',
                    ],
                ],
            ]);
    }

    /** 29. Unverified providers are not returned in public discovery. */
    public function test_unverified_providers_are_not_returned_publicly(): void
    {
        // Both profiles are pending
        $response = $this->getJson('/api/providers');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /** 30. Filter by service_id works. */
    public function test_public_discovery_filter_by_service_id(): void
    {
        $this->profile1->update(['verification_status' => 'verified']);
        $this->profile2->update(['verification_status' => 'verified']);

        $this->profile1->services()->attach($this->servicePlumbing->id);
        $this->profile2->services()->attach($this->serviceElectrical->id);

        $response = $this->getJson("/api/providers?service_id={$this->servicePlumbing->id}");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    ['id' => $this->profile1->id, 'business_name' => 'Almaz Plumbing & Heating'],
                ],
            ]);
    }

    /** 31. Filter by location works. */
    public function test_public_discovery_filter_by_location(): void
    {
        $this->profile1->update(['verification_status' => 'verified', 'location' => 'Bole']);
        $this->profile2->update(['verification_status' => 'verified', 'location' => 'Piassa']);

        $response = $this->getJson('/api/providers?location=Piassa');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    ['id' => $this->profile2->id, 'business_name' => 'Dawit Electrical Works', 'location' => 'Piassa'],
                ],
            ]);
    }

    /** 32. Filter by availability_status works. */
    public function test_public_discovery_filter_by_availability_status(): void
    {
        $this->profile1->update(['verification_status' => 'verified', 'availability_status' => 'available']);
        $this->profile2->update(['verification_status' => 'verified', 'availability_status' => 'busy']);

        $response = $this->getJson('/api/providers?availability_status=available');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    ['id' => $this->profile1->id, 'availability_status' => 'available'],
                ],
            ]);
    }

    /** 33. Combined filters work. */
    public function test_public_discovery_combined_filters(): void
    {
        $this->profile1->update(['verification_status' => 'verified', 'location' => 'Bole', 'availability_status' => 'available']);
        $this->profile2->update(['verification_status' => 'verified', 'location' => 'Bole', 'availability_status' => 'busy']);

        $this->profile1->services()->attach($this->servicePlumbing->id);
        $this->profile2->services()->attach($this->servicePlumbing->id);

        $response = $this->getJson("/api/providers?service_id={$this->servicePlumbing->id}&location=Bole&availability_status=available");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    ['id' => $this->profile1->id, 'availability_status' => 'available', 'location' => 'Bole'],
                ],
            ]);
    }

    // ==========================================
    // PART 6 — SECURITY (Tests 34 - 37)
    // ==========================================

    /** 34. Provider cannot access another provider's private profile. */
    public function test_provider_cannot_access_another_providers_profile(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        // Provider 1 requests their profile endpoint
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/profile');

        // Endpoint strictly scopes to authenticated user's profile
        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $this->profile1->id,
                ],
            ]);

        $this->assertNotEquals($this->profile2->id, $response->json('data.id'));
    }

    /** 35. Provider cannot modify another provider's profile. */
    public function test_provider_cannot_modify_another_providers_profile(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/profile', [
                'business_name' => 'Provider 1 Name Changed',
                'experience_years' => 10,
                'location' => 'Megenagna',
            ]);

        // Verify Provider 2 profile was untouched
        $this->assertDatabaseHas('provider_profiles', [
            'id' => $this->profile2->id,
            'business_name' => 'Dawit Electrical Works',
            'location' => 'Piassa',
        ]);
    }

    /** 36. Provider cannot modify another provider's services. */
    public function test_provider_cannot_modify_another_providers_services(): void
    {
        // Provider 2 offers Electrical
        $this->profile2->services()->attach($this->serviceElectrical->id);

        $token = $this->provider1->createToken('token')->plainTextToken;

        // Provider 1 tries to remove serviceElectrical
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/provider/services/{$this->serviceElectrical->id}");

        // Fails with 404 because Provider 1 does not offer it
        $response->assertStatus(404)
            ->assertJson(['message' => 'Service not found in provider catalog.']);

        // Provider 2 still offers Electrical
        $this->assertDatabaseHas('provider_services', [
            'provider_id' => $this->profile2->id,
            'service_id' => $this->serviceElectrical->id,
        ]);
    }

    /** 37. Provider cannot modify verification status. */
    public function test_provider_cannot_modify_verification_status(): void
    {
        $token = $this->provider1->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/provider/profile', [
                'business_name' => 'Attempting Self-Verification',
                'experience_years' => 8,
                'location' => 'Bole',
                'verification_status' => 'verified',
            ]);

        $this->profile1->refresh();
        $this->assertEquals('pending', $this->profile1->verification_status);
    }
}
