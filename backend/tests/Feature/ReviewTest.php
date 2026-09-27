<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\Review;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
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
    private ServiceRequest $completedRequest1;

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

        // Provider 1
        $this->providerUser1 = User::create([
            'name' => 'Mulugeta Pro',
            'email' => 'mulugeta@marketplace.com',
            'phone' => '+251911000004',
            'password' => 'password123',
            'role' => 'provider',
        ]);

        $this->provider1 = $this->providerUser1->providerProfile()->create([
            'business_name' => 'Mulugeta Plumbing Works',
            'description' => 'Expert plumbing in Bole',
            'experience_years' => 8,
            'location' => 'Bole',
            'availability_status' => 'available',
            'verification_status' => 'verified',
        ]);

        // Provider 2
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
            'experience_years' => 4,
            'location' => 'Piassa',
            'availability_status' => 'available',
            'verification_status' => 'verified',
        ]);

        // Service
        $this->plumbingService = Service::create([
            'name' => 'Plumbing',
            'description' => 'Pipe repair',
        ]);

        $this->provider1->services()->attach($this->plumbingService->id);

        // Completed request for customer 1
        $this->completedRequest1 = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Fixed leaking pipes in kitchen',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);
    }

    // ==========================================
    // 1. CUSTOMER CREATE (Tests 1 - 21)
    // ==========================================

    /** 1. Customer can review completed own request. */
    public function test_customer_can_review_completed_own_request(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 5,
                'comment' => 'Excellent plumbing work, very punctual!',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'request_id',
                    'customer_id',
                    'provider_id',
                    'rating',
                    'comment',
                    'created_at',
                    'service_request',
                    'provider',
                ],
            ])
            ->assertJson([
                'message' => 'Review created successfully',
                'data' => [
                    'request_id' => $this->completedRequest1->id,
                    'customer_id' => $this->customer1->id,
                    'provider_id' => $this->provider1->id,
                    'rating' => 5,
                    'comment' => 'Excellent plumbing work, very punctual!',
                ],
            ]);

        $this->assertDatabaseHas('reviews', [
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);
    }

    /** 2 & 3. Review automatically uses authenticated customer_id and request provider_id. */
    public function test_review_automatically_uses_authenticated_customer_id_and_request_provider_id(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 4,
            ]);

        $response->assertStatus(201);
        $this->assertEquals($this->customer1->id, $response->json('data.customer_id'));
        $this->assertEquals($this->provider1->id, $response->json('data.provider_id'));
    }

    /** 4 & 5. Customer cannot submit another customer_id or provider_id. */
    public function test_customer_cannot_spoof_customer_id_or_provider_id(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'customer_id' => $this->customer2->id, // Spoof customer
                'provider_id' => $this->provider2->id, // Spoof provider
                'rating' => 5,
            ]);

        $response->assertStatus(201);
        // Assert server-controlled IDs override client-sent values
        $this->assertEquals($this->customer1->id, $response->json('data.customer_id'));
        $this->assertEquals($this->provider1->id, $response->json('data.provider_id'));
    }

    /** 6. Cannot review pending request. */
    public function test_cannot_review_pending_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Pending request',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'pending',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $request->id,
                'rating' => 5,
            ]);

        $response->assertStatus(422)
            ->assertJson(['message' => 'Only completed service requests can be reviewed.']);
    }

    /** 7. Cannot review accepted request. */
    public function test_cannot_review_accepted_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Accepted request',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'accepted',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $request->id,
                'rating' => 5,
            ]);

        $response->assertStatus(422);
    }

    /** 8. Cannot review in_progress request. */
    public function test_cannot_review_in_progress_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'In progress request',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'in_progress',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $request->id,
                'rating' => 5,
            ]);

        $response->assertStatus(422);
    }

    /** 9. Cannot review rejected request. */
    public function test_cannot_review_rejected_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Rejected request',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'rejected',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $request->id,
                'rating' => 5,
            ]);

        $response->assertStatus(422);
    }

    /** 10. Cannot review cancelled request. */
    public function test_cannot_review_cancelled_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Cancelled request',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'cancelled',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $request->id,
                'rating' => 5,
            ]);

        $response->assertStatus(422);
    }

    /** 11. Cannot review another customer's completed request. */
    public function test_cannot_review_another_customers_completed_request(): void
    {
        $request = ServiceRequest::create([
            'customer_id' => $this->customer2->id, // Belongs to customer 2
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Customer 2 job',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        // Customer 1 tries to review Customer 2's request
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $request->id,
                'rating' => 5,
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 12. Cannot review same request twice. */
    public function test_cannot_review_same_request_twice(): void
    {
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Initial review',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 4,
            ]);

        $response->assertStatus(409)
            ->assertJson(['message' => 'This service request has already been reviewed.']);
    }

    /** 13. Non-existent request rejected. */
    public function test_non_existent_request_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => 99999,
                'rating' => 5,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['request_id']);
    }

    /** 14. Invalid rating rejected (non-numeric). */
    public function test_invalid_rating_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 'awesome',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    /** 15. Rating below 1 rejected. */
    public function test_rating_below_one_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 0,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    /** 16. Rating above 5 rejected. */
    public function test_rating_above_five_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 6,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    /** 17. Missing rating rejected. */
    public function test_missing_rating_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    /** 18. Missing request_id rejected. */
    public function test_missing_request_id_rejected(): void
    {
        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'rating' => 5,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['request_id']);
    }

    /** 19. Provider cannot create review. */
    public function test_provider_cannot_create_review(): void
    {
        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 5,
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 20. Admin cannot create review. */
    public function test_admin_cannot_create_review(): void
    {
        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', [
                'request_id' => $this->completedRequest1->id,
                'rating' => 5,
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 21. Unauthenticated user cannot create review. */
    public function test_unauthenticated_user_cannot_create_review(): void
    {
        $response = $this->postJson('/api/reviews', [
            'request_id' => $this->completedRequest1->id,
            'rating' => 5,
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Unauthenticated.']);
    }

    // ==========================================
    // 2. CUSTOMER VIEW (Tests 22 - 25)
    // ==========================================

    /** 22. Customer can list own reviews. */
    public function test_customer_can_list_own_reviews(): void
    {
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Very satisfied customer',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/reviews');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'request_id', 'customer_id', 'provider_id', 'rating', 'comment', 'provider', 'service_request'],
                ],
            ]);
    }

    /** 23. Customer cannot see another customer's reviews in listing. */
    public function test_customer_cannot_see_another_customers_reviews_in_list(): void
    {
        // Completed request for customer 2
        $request2 = ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Customer 2 completed job',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        Review::create([
            'request_id' => $request2->id,
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
            'comment' => 'Review by customer 2',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/reviews');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /** 24. Customer can view own review. */
    public function test_customer_can_view_own_review(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Personal review',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $review->id,
                    'customer_id' => $this->customer1->id,
                    'comment' => 'Personal review',
                ],
            ]);
    }

    /** 25. Customer cannot view another customer's review. */
    public function test_customer_cannot_view_another_customers_review(): void
    {
        $request2 = ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job 2',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        $review2 = Review::create([
            'request_id' => $request2->id,
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
            'comment' => 'Customer 2 private review',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/reviews/{$review2->id}");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    // ==========================================
    // 3. CUSTOMER UPDATE (Tests 26 - 31)
    // ==========================================

    /** 26. Customer can update own review. */
    public function test_customer_can_update_own_review(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
            'comment' => 'Good service',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/reviews/{$review->id}", [
                'rating' => 5,
                'comment' => 'Updated: Outstanding service!',
            ]);

        $response->assertStatus(200)
            ->assertJson([
                'message' => 'Review updated successfully',
                'data' => [
                    'rating' => 5,
                    'comment' => 'Updated: Outstanding service!',
                ],
            ]);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'rating' => 5,
            'comment' => 'Updated: Outstanding service!',
        ]);
    }

    /** 27. Customer cannot update another customer's review. */
    public function test_customer_cannot_update_another_customers_review(): void
    {
        $request2 = ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        $review2 = Review::create([
            'request_id' => $request2->id,
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
            'comment' => 'Customer 2 review',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/reviews/{$review2->id}", [
                'rating' => 1,
            ]);

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 28, 29, 30. Customer cannot change request_id, customer_id, or provider_id. */
    public function test_customer_cannot_change_immutable_ids_on_update(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
            'comment' => 'Initial',
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/reviews/{$review->id}", [
                'rating' => 5,
                'request_id' => 9999,
                'customer_id' => $this->customer2->id,
                'provider_id' => $this->provider2->id,
            ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('reviews', [
            'id' => $review->id,
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);
    }

    /** 31. Updated rating must remain 1–5. */
    public function test_updated_rating_must_remain_between_one_and_five(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/reviews/{$review->id}", [
                'rating' => 6,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['rating']);
    }

    // ==========================================
    // 4. CUSTOMER DELETE (Tests 32 - 36)
    // ==========================================

    /** 32. Customer can delete own review. */
    public function test_customer_can_delete_own_review(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Review deleted successfully']);

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
    }

    /** 33. Customer cannot delete another customer's review. */
    public function test_customer_cannot_delete_another_customers_review(): void
    {
        $request2 = ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job',
            'location' => 'Bole',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        $review2 = Review::create([
            'request_id' => $request2->id,
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/reviews/{$review2->id}");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);

        $this->assertDatabaseHas('reviews', ['id' => $review2->id]);
    }

    /** 34, 35, 36. Deleting review does not delete service request, provider, or service. */
    public function test_deleting_review_does_not_delete_service_request_or_provider_or_service(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/reviews/{$review->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
        $this->assertDatabaseHas('service_requests', ['id' => $this->completedRequest1->id]);
        $this->assertDatabaseHas('provider_profiles', ['id' => $this->provider1->id]);
        $this->assertDatabaseHas('services', ['id' => $this->plumbingService->id]);
    }

    // ==========================================
    // 5. PROVIDER (Tests 37 - 43)
    // ==========================================

    /** 37. Provider can list own reviews. */
    public function test_provider_can_list_own_reviews(): void
    {
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Great job!',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/reviews');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    ['rating' => 5, 'comment' => 'Great job!'],
                ],
            ]);
    }

    /** 38. Provider cannot see another provider's reviews. */
    public function test_provider_cannot_see_another_providers_reviews(): void
    {
        // Review for Provider 2
        $request2 = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider2->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job',
            'location' => 'Piassa',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        Review::create([
            'request_id' => $request2->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider2->id,
            'rating' => 4,
            'comment' => 'Provider 2 review',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/provider/reviews');

        $response->assertStatus(200)
            ->assertJsonCount(0, 'data');
    }

    /** 39. Provider can view own review. */
    public function test_provider_can_view_own_review(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Top notch',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/provider/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $review->id,
                    'rating' => 5,
                    'comment' => 'Top notch',
                ],
            ]);
    }

    /** 40. Provider cannot view another provider's review. */
    public function test_provider_cannot_view_another_providers_review(): void
    {
        $request2 = ServiceRequest::create([
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider2->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job',
            'location' => 'Piassa',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        $review2 = Review::create([
            'request_id' => $request2->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider2->id,
            'rating' => 4,
            'comment' => 'Provider 2 review',
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/provider/reviews/{$review2->id}");

        $response->assertStatus(403)
            ->assertJson(['message' => 'Forbidden.']);
    }

    /** 41, 42, 43. Provider cannot create, update, or delete review. */
    public function test_provider_cannot_create_update_or_delete_review(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $token = $this->providerUser1->createToken('token')->plainTextToken;

        // Attempt create
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', ['request_id' => $this->completedRequest1->id, 'rating' => 5])
            ->assertStatus(403);

        // Attempt update
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/reviews/{$review->id}", ['rating' => 5])
            ->assertStatus(403);

        // Attempt delete
        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/reviews/{$review->id}")
            ->assertStatus(403);
    }

    // ==========================================
    // 6. ADMIN (Tests 44 - 47)
    // ==========================================

    /** 44. Admin can list all reviews. */
    public function test_admin_can_list_all_reviews(): void
    {
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Job 1',
        ]);

        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/reviews');

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'customer', 'provider', 'service_request', 'rating', 'comment'],
                ],
            ]);
    }

    /** 45. Admin can view any review. */
    public function test_admin_can_view_any_review(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Job 1',
        ]);

        $token = $this->admin->createToken('token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/admin/reviews/{$review->id}");

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'id' => $review->id,
                    'rating' => 5,
                    'comment' => 'Job 1',
                ],
            ]);
    }

    /** 46 & 47. Admin cannot create or modify reviews. */
    public function test_admin_cannot_create_or_modify_reviews(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $token = $this->admin->createToken('token')->plainTextToken;

        // Admin cannot POST to customer review creation
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/reviews', ['request_id' => $this->completedRequest1->id, 'rating' => 5])
            ->assertStatus(403);

        // Admin cannot PUT to customer review update
        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/reviews/{$review->id}", ['rating' => 4])
            ->assertStatus(403);
    }

    // ==========================================
    // 7. PUBLIC (Tests 48 - 50)
    // ==========================================

    /** 48. Public user can view provider reviews. */
    public function test_public_user_can_view_provider_reviews(): void
    {
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Publicly visible review',
        ]);

        $response = $this->getJson("/api/providers/{$this->provider1->id}/reviews");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'rating', 'comment', 'created_at', 'customer' => ['id', 'name']],
                ],
            ]);
    }

    /** 49. Public endpoint returns only reviews for selected provider. */
    public function test_public_endpoint_returns_only_reviews_for_selected_provider(): void
    {
        // Review for Provider 1
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Review for Pro 1',
        ]);

        // Request & Review for Provider 2
        $request2 = ServiceRequest::create([
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider2->id,
            'service_id' => $this->plumbingService->id,
            'description' => 'Job',
            'location' => 'Piassa',
            'requested_date' => '2026-10-01',
            'requested_time' => '10:00',
            'status' => 'completed',
        ]);

        Review::create([
            'request_id' => $request2->id,
            'customer_id' => $this->customer2->id,
            'provider_id' => $this->provider2->id,
            'rating' => 3,
            'comment' => 'Review for Pro 2',
        ]);

        // Request for Provider 1 only
        $response = $this->getJson("/api/providers/{$this->provider1->id}/reviews");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJson([
                'data' => [
                    ['comment' => 'Review for Pro 1'],
                ],
            ]);
    }

    /** 50. Public response does not expose customer phone/email/password/token. */
    public function test_public_response_does_not_expose_sensitive_customer_information(): void
    {
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
            'comment' => 'Sanitization check',
        ]);

        $response = $this->getJson("/api/providers/{$this->provider1->id}/reviews");

        $response->assertStatus(200);
        $customerData = $response->json('data.0.customer');

        $this->assertArrayHasKey('id', $customerData);
        $this->assertArrayHasKey('name', $customerData);
        $this->assertArrayNotHasKey('email', $customerData);
        $this->assertArrayNotHasKey('phone', $customerData);
        $this->assertArrayNotHasKey('password', $customerData);
    }

    // ==========================================
    // 8. SECURITY / INTEGRITY (Tests 51 - 55)
    // ==========================================

    /** 51. Review belongs to completed request. */
    public function test_review_must_belong_to_completed_request(): void
    {
        $this->assertEquals('completed', $this->completedRequest1->status);
    }

    /** 52. Review has correct customer. */
    public function test_review_has_correct_customer(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $this->assertEquals($this->customer1->id, $review->customer->id);
    }

    /** 53. Review has correct provider. */
    public function test_review_has_correct_provider(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $this->assertEquals($this->provider1->id, $review->provider->id);
    }

    /** 54. Duplicate review is prevented at database level. */
    public function test_duplicate_review_is_prevented_by_unique_constraint(): void
    {
        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 4,
        ]);
    }

    /** 55. Request remains intact after review deletion. */
    public function test_request_remains_intact_after_review_deletion(): void
    {
        $review = Review::create([
            'request_id' => $this->completedRequest1->id,
            'customer_id' => $this->customer1->id,
            'provider_id' => $this->provider1->id,
            'rating' => 5,
        ]);

        $token = $this->customer1->createToken('token')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/reviews/{$review->id}")
            ->assertStatus(200);

        $this->assertDatabaseMissing('reviews', ['id' => $review->id]);
        $this->assertDatabaseHas('service_requests', [
            'id' => $this->completedRequest1->id,
            'status' => 'completed',
        ]);
    }
}
