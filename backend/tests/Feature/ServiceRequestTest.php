<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceRequestTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $customer1;
    private User $customer2;
    private User $providerUser1;
    private ProviderProfile $provider1;
    private User $providerUser2;
    private ProviderProfile $provider2;
    private Service $plumbingService;
    private Service $electricalService;
    private Service $cleaningService;

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

        // Customer 1
        $this->customer1 = User::create([
            'name' => 'Abebe Customer',
            'email' => 'abebe@marketplace.com',
            'phone' => '+251911000002',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        // Customer 2
        $this->customer2 = User::create([
            'name' => 'Kebede Customer',
            'email' => 'kebede@marketplace.com',
            'phone' => '+251911000003',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        // Provider 1 (Verified, offers Plumbing & Electrical)
        $this->providerUser1 = User::create([
            'name' => 'Mulugeta Pro',
            'email' => 'mulugeta@marketplace.com',
            'phone' => '+251911000004',
            'password' => 'password123',
            'role' => 'provider',
        ]);

        $this->provider1 = $this->providerUser1->providerProfile()->create([
            'business_name' => 'Mulugeta Multi-Fix',
            'description' => 'Certified repairs in Bole',
            'experience_years' => 6,
            'location' => 'Bole',
            'availability_status' => 'available',
            'verification_status' => 'verified',
        ]);

        // Provider 2 (Verified, offers Electrical only)
        $this->providerUser2 = User::create([
            'name' => 'Selam Pro',
            'email' => 'selam@marketplace.com',
            'phone' => '+251911000005',
            'password' => 'password123',
            'role' => 'provider',
        ]);

        $this->provider2 = $this->providerUser2->providerProfile()->create([
            'business_name' => 'Selam Electrical Works',
            'description' => 'Fast electrical in Piassa',
            'experience_years' => 3,
            'location' => 'Piassa',
            'availability_status' => 'available',
            'verification_status' => 'verified',
        ]);

        // Services
        $this->plumbingService = Service::create([
            'name' => 'Plumbing',
            'description' => 'Plumbing repairs',
        ]);

        $this->electricalService = Service::create([
            'name' => 'Electrical',
            'description' => 'Electrical fixes',
        ]);

        $this->cleaningService = Service::create([
            'name' => 'Cleaning',
            'description' => 'Home cleaning',
        ]);

        // Assign services
        $this->provider1->services()->attach([
            $this->plumbingService->id,
            $this->electricalService->id,
        ]);

        $this->provider2->services()->attach([
            $this->electricalService->id,
        ]);
    }

    // ==========================================
    // 1. CUSTOMER CREATION (Tests 1 - 13)
    // ==========================================

    /** 1. Customer can create a request. */
    public function test_customer_can_create_service_request(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider1->id,
                'service_id' => $this->plumbingService->id,
                'description' => 'Bathroom pipe is leaking urgently.',
                'location' => 'Bole Medhanialem',
                'requested_date' => '2026-10-05',
                'requested_time' => '14:30',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'customer_id',
                    'provider_id',
                    'service_id',
                    'description',
                    'location',
                    'requested_date',
                    'requested_time',
                    'status',
                    'provider' => ['id', 'business_name', 'location'],
                    'service' => ['id', 'name'],
                ],
            ])
            ->assertJson([
                'message' => 'Service request created successfully',
                'data' => [
                    'customer_id' => $this->customer1->id,
                    'provider_id' => $this->provider1->id,
                    'service_id' => $this->plumbingService->id,
                    'status' => 'pending',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'status' => 'pending',
        ]);
    }

    /** 2 & 3. Request automatically uses authenticated user's customer_id and ignores client customer_id. */
    public function test_request_automatically_uses_authenticated_customer_id(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'customer_id' => $this->customer2->id, // Attempt to spoof customer 2
                'provider_id' => $this->provider1->id,
                'service_id' => $this->plumbingService->id,
                'description' => 'Leak repair',
                'location' => 'Bole',
                'requested_date' => '2026-10-05',
                'requested_time' => '10:00',
            ]);

        $response->assertStatus(201);
        $this->assertEquals($this->customer1->id, $response->json('data.customer_id'));

        $this->assertDatabaseMissing('service_requests', [
            'customer_id' => $this->customer2->id,
        ]);
    }

    /** 4. Customer cannot request an unverified provider (pending status). */
    public function test_customer_cannot_request_pending_provider(): void
    {
        $this->provider1->update(['verification_status' => 'pending']);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider1->id,
                'service_id' => $this->plumbingService->id,
                'description' => 'Leak repair',
                'location' => 'Bole',
                'requested_date' => '2026-10-05',
                'requested_time' => '10:00',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'The selected provider is not verified.']);
    }

    /** 5. Customer cannot request a rejected provider. */
    public function test_customer_cannot_request_rejected_provider(): void
    {
        $this->provider1->update(['verification_status' => 'rejected']);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider1->id,
                'service_id' => $this->plumbingService->id,
                'description' => 'Leak repair',
                'location' => 'Bole',
                'requested_date' => '2026-10-05',
                'requested_time' => '10:00',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'The selected provider is not verified.']);
    }

    /** 6. Customer cannot request a service the provider does not offer. */
    public function test_customer_cannot_request_service_provider_does_not_offer(): void
    {
        // Provider 2 only offers Electrical, NOT Plumbing
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider2->id,
                'service_id' => $this->plumbingService->id,
                'description' => 'Fix sink pipe',
                'location' => 'Piassa',
                'requested_date' => '2026-10-06',
                'requested_time' => '11:00',
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'The selected provider does not offer this service.']);
    }

    /** 7. Customer can request a service the provider offers. */
    public function test_customer_can_request_service_provider_offers(): void
    {
        // Provider 2 offers Electrical
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider2->id,
                'service_id' => $this->electricalService->id,
                'description' => 'Circuit breaker tripping constantly',
                'location' => 'Piassa',
                'requested_date' => '2026-10-06',
                'requested_time' => '11:00',
            ]);

        $response->assertStatus(201);
    }

    /** 8. Invalid provider_id is rejected. */
    public function test_invalid_provider_id_is_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => 99999,
                'service_id' => $this->plumbingService->id,
                'description' => 'Repair',
                'location' => 'Bole',
                'requested_date' => '2026-10-05',
                'requested_time' => '10:00',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['provider_id']);
    }

    /** 9. Invalid service_id is rejected. */
    public function test_invalid_service_id_is_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider1->id,
                'service_id' => 99999,
                'description' => 'Repair',
                'location' => 'Bole',
                'requested_date' => '2026-10-05',
                'requested_time' => '10:00',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['service_id']);
    }

    /** 10. Missing required fields are rejected. */
    public function test_missing_required_fields_are_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['provider_id', 'service_id', 'description', 'location', 'requested_date', 'requested_time']);
    }

    /** 11. Provider cannot create a customer request. */
    public function test_provider_cannot_create_customer_request(): void
    {
        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider2->id,
                'service_id' => $this->electricalService->id,
                'description' => 'Repair',
                'location' => 'Bole',
                'requested_date' => '2026-10-05',
                'requested_time' => '10:00',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 12. Admin cannot create a customer request. */
    public function test_admin_cannot_create_customer_request(): void
    {
        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/requests', [
                'provider_id' => $this->provider1->id,
                'service_id' => $this->plumbingService->id,
                'description' => 'Repair',
                'location' => 'Bole',
                'requested_date' => '2026-10-05',
                'requested_time' => '10:00',
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 13. Unauthenticated user cannot create a request. */
    public function test_unauthenticated_user_cannot_create_request(): void
    {
        $response = $this->postJson('/api/requests', [
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '10:00',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    // ==========================================
    // 2. CUSTOMER VIEWING (Tests 14 - 17)
    // ==========================================

    /** 14. Customer can list own requests. */
    public function test_customer_can_list_own_requests(): void
    {
        ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix sink',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/requests');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'customer_id', 'provider_id', 'service_id', 'description', 'status', 'provider', 'service'],
                ],
            ]);
    }

    /** 15. Customer cannot see another customer's request in listing. */
    public function test_customer_cannot_see_another_customers_requests_in_list(): void
    {
        // Request for Customer 2
        ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Customer 2 pipe issue',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        // Customer 1 calls list
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/requests');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /** 16. Customer can view own request. */
    public function test_customer_can_view_own_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix sink',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/requests/{$request->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $request->id,
                    'customer_id' => $this->customer1->id,
                    'description' => 'Fix sink',
                ],
            ]);
    }

    /** 17. Customer cannot view another customer's request. */
    public function test_customer_cannot_view_another_customers_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Customer 2 private request',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/requests/{$request->id}");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    // ==========================================
    // 3. CUSTOMER CANCELLATION (Tests 18 - 24)
    // ==========================================

    /** 18. Customer can cancel pending request. */
    public function test_customer_can_cancel_pending_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix pipe',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/requests/{$request->id}/cancel");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Service request cancelled successfully',
                'data' => [
                    'id' => $request->id,
                    'status' => 'cancelled',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'cancelled',
        ]);
    }

    /** 19. Customer can cancel accepted request. */
    public function test_customer_can_cancel_accepted_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix pipe',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'accepted',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/requests/{$request->id}/cancel");

        $response->assertStatus(200)
            ->assertJson([
                'data' => ['status' => 'cancelled'],
            ]);
    }

    /** 20. Customer cannot cancel rejected request. */
    public function test_customer_cannot_cancel_rejected_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix pipe',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'rejected',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/requests/{$request->id}/cancel");

        $response->assertStatus(409);
    }

    /** 21. Customer cannot cancel in_progress request. */
    public function test_customer_cannot_cancel_in_progress_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix pipe',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'in_progress',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/requests/{$request->id}/cancel");

        $response->assertStatus(409);
    }

    /** 22. Customer cannot cancel completed request. */
    public function test_customer_cannot_cancel_completed_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix pipe',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'completed',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/requests/{$request->id}/cancel");

        $response->assertStatus(409);
    }

    /** 23. Customer cannot cancel already cancelled request. */
    public function test_customer_cannot_cancel_already_cancelled_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fix pipe',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'cancelled',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/requests/{$request->id}/cancel");

        $response->assertStatus(409);
    }

    /** 24. Customer cannot cancel another customer's request. */
    public function test_customer_cannot_cancel_another_customers_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Customer 2 request',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/requests/{$request->id}/cancel");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    // ==========================================
    // 4. PROVIDER WORKFLOW (Tests 25 - 37)
    // ==========================================

    /** 25. Provider can view requests assigned to them. */
    public function test_provider_can_view_assigned_requests(): void
    {
        ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/requests');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'customer', 'service', 'description', 'status'],
                ],
            ]);
    }

    /** 26. Provider cannot view another provider's assigned requests. */
    public function test_provider_cannot_view_another_providers_assigned_requests(): void
    {
        // Request assigned to Provider 2
        ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider2->id,
            'service_id' => $this->electricalService->id,
            'description' => 'Electrical fix',
            'location' => 'Piassa',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        // Provider 1 calls listing
        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/requests');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /** 27. Provider can view one assigned request. */
    public function test_provider_can_view_one_assigned_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/provider/requests/{$request->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $request->id,
                    'provider_id' => $this->provider1->id,
                    'description' => 'Pipe repair',
                ],
            ]);
    }

    /** 28. Provider cannot view another provider's request. */
    public function test_provider_cannot_view_another_providers_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider2->id,
            'service_id' => $this->electricalService->id,
            'description' => 'Provider 2 request',
            'location' => 'Piassa',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/provider/requests/{$request->id}");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 29. Provider can accept pending request. */
    public function test_provider_can_accept_pending_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/accept");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Service request accepted successfully',
                'data' => [
                    'id' => $request->id,
                    'status' => 'accepted',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'accepted',
        ]);
    }

    /** 30. Provider cannot accept non-pending request. */
    public function test_provider_cannot_accept_non_pending_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'accepted', // Already accepted
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/accept");

        $response->assertStatus(409);
    }

    /** 31. Provider can reject pending request. */
    public function test_provider_can_reject_pending_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/reject");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Service request rejected successfully',
                'data' => [
                    'id' => $request->id,
                    'status' => 'rejected',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'rejected',
        ]);
    }

    /** 32. Provider cannot reject non-pending request. */
    public function test_provider_cannot_reject_non_pending_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'in_progress',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/reject");

        $response->assertStatus(409);
    }

    /** 33. Provider can start accepted request. */
    public function test_provider_can_start_accepted_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'accepted',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/start");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Service request marked as in progress',
                'data' => [
                    'id' => $request->id,
                    'status' => 'in_progress',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'in_progress',
        ]);
    }

    /** 34. Provider cannot start non-accepted request. */
    public function test_provider_cannot_start_non_accepted_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending', // Not yet accepted
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/start");

        $response->assertStatus(409);
    }

    /** 35. Provider can complete in_progress request. */
    public function test_provider_can_complete_in_progress_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'in_progress',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/complete");

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Service request completed successfully',
                'data' => [
                    'id' => $request->id,
                    'status' => 'completed',
                ],
            ]);

        $this->assertDatabaseHas('service_requests', [
            'id' => $request->id,
            'status' => 'completed',
        ]);
    }

    /** 36. Provider cannot complete non-in-progress request. */
    public function test_provider_cannot_complete_non_in_progress_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pipe repair',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'accepted', // Not yet in progress
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/complete");

        $response->assertStatus(409);
    }

    /** 37. Provider cannot manage another provider's request. */
    public function test_provider_cannot_manage_another_providers_request(): void
    {
        // Assigned to Provider 2
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider2->id,
            'service_id' => $this->electricalService->id,
            'description' => 'Provider 2 job',
            'location' => 'Piassa',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        // Provider 1 tries to accept
        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/provider/requests/{$request->id}/accept");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    // ==========================================
    // 5. ADMIN OVERSIGHT (Tests 38 - 42)
    // ==========================================

    /** 38. Admin can list all requests. */
    public function test_admin_can_list_all_requests(): void
    {
        ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job 1',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider2->id,
            'service_id' => $this->electricalService->id,
            'description' => 'Job 2',
            'location' => 'Piassa',
            'requested_date' => '2026-10-06',
            'requested_time' => '10:00',
            'status' => 'accepted',
        ]);

        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/requests');

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'customer', 'provider', 'service', 'status'],
                ],
            ]);
    }

    /** 39. Admin can view a single request. */
    public function test_admin_can_view_single_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job 1',
            'location' => 'Bole',
            'requested_date' => '2026-10-05',
            'requested_time' => '14:00',
            'status' => 'pending',
        ]);

        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/admin/requests/{$request->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $request->id,
                    'description' => 'Job 1',
                ],
            ]);
    }

    /** 40. Customer cannot access admin request endpoints. */
    public function test_customer_cannot_access_admin_request_endpoints(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/requests')
            ->assertStatus(403);
    }

    /** 41. Provider cannot access admin request endpoints. */
    public function test_provider_cannot_access_admin_request_endpoints(): void
    {
        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/requests')
            ->assertStatus(403);
    }

    /** 42. Unauthenticated user cannot access admin request endpoints. */
    public function test_unauthenticated_user_cannot_access_admin_request_endpoints(): void
    {
        $this->getJson('/api/admin/requests')->assertStatus(401);
    }
}
