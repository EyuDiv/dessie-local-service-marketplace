<?php

namespace Tests\Feature;

use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentVerificationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    /**
     * 1. Provider registration without a CV (succeeds, has_cv is false).
     */
    public function test_provider_registration_without_cv(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test Provider No CV',
            'email' => 'nocv_' . uniqid() . '@example.com',
            'phone' => '+251911000001',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'provider',
            'business_name' => 'No CV Electric',
            'location' => 'Piazza',
            'experience_years' => 3,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('provider_profiles', [
            'business_name' => 'No CV Electric',
            'verification_status' => 'pending',
            'cv_path' => null,
        ]);
    }

    /**
     * 2. Successful valid CV upload during provider registration.
     */
    public function test_successful_valid_cv_upload(): void
    {
        $fakePdf = UploadedFile::fake()->create('my_resume.pdf', 1024, 'application/pdf');

        $response = $this->postJson('/api/register', [
            'name' => 'Test Provider With CV',
            'email' => 'withcv_' . uniqid() . '@example.com',
            'phone' => '+251911000002',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'provider',
            'business_name' => 'With CV Plumbing',
            'location' => 'Hote',
            'experience_years' => 5,
            'cv' => $fakePdf,
        ]);

        $response->assertStatus(201);
        $user = User::where('email', $response->json('user.email'))->first();
        $this->assertNotNull($user->providerProfile->cv_path);
        $this->assertEquals('my_resume.pdf', $user->providerProfile->cv_original_name);
        Storage::disk('local')->assertExists($user->providerProfile->cv_path);
    }

    /**
     * 3. Invalid file type rejection (e.g., .txt or .exe).
     */
    public function test_invalid_cv_file_type_rejected(): void
    {
        $fakeTxt = UploadedFile::fake()->create('malicious.txt', 500, 'text/plain');

        $response = $this->postJson('/api/register', [
            'name' => 'Bad File Provider',
            'email' => 'badfile_' . uniqid() . '@example.com',
            'phone' => '+251911000003',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'provider',
            'business_name' => 'Bad File Services',
            'location' => 'Buanbua Wuha',
            'experience_years' => 2,
            'cv' => $fakeTxt,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cv']);
    }

    /**
     * 4. Oversized file rejection (> 5MB).
     */
    public function test_oversized_cv_file_rejected(): void
    {
        // 6MB PDF
        $fakeLargePdf = UploadedFile::fake()->create('huge.pdf', 6144, 'application/pdf');

        $response = $this->postJson('/api/register', [
            'name' => 'Oversized Provider',
            'email' => 'oversized_' . uniqid() . '@example.com',
            'phone' => '+251911000004',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'provider',
            'business_name' => 'Oversized Services',
            'location' => 'Menhariya',
            'experience_years' => 4,
            'cv' => $fakeLargePdf,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cv']);
    }

    /**
     * 5. CV association with the correct provider profile.
     */
    public function test_cv_associated_with_correct_provider(): void
    {
        $fakePdf = UploadedFile::fake()->create('correct_provider_cv.pdf', 800, 'application/pdf');

        $response = $this->postJson('/api/register', [
            'name' => 'Profile Association Provider',
            'email' => 'assoc_' . uniqid() . '@example.com',
            'phone' => '+251911000005',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'provider',
            'business_name' => 'Assoc Services',
            'location' => 'Piazza',
            'experience_years' => 6,
            'cv' => $fakePdf,
        ]);

        $response->assertStatus(201);
        $profile = ProviderProfile::where('business_name', 'Assoc Services')->first();
        $this->assertNotNull($profile);
        $this->assertEquals('correct_provider_cv.pdf', $profile->cv_original_name);
        $this->assertStringStartsWith('cvs/', $profile->cv_path);
    }

    /**
     * 6. Newly registered providers remain pending.
     */
    public function test_newly_registered_provider_remains_pending(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Pending Status Provider',
            'email' => 'pending_' . uniqid() . '@example.com',
            'phone' => '+251911000006',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'provider',
            'business_name' => 'Pending Services',
            'location' => 'Robit',
            'experience_years' => 2,
        ]);

        $response->assertStatus(201);
        $profile = ProviderProfile::where('business_name', 'Pending Services')->first();
        $this->assertEquals('pending', $profile->verification_status);
    }

    /**
     * 7. Pending providers remain hidden from public discovery.
     */
    public function test_pending_providers_hidden_from_public_discovery(): void
    {
        $email = 'hidden_' . uniqid() . '@example.com';
        $this->postJson('/api/register', [
            'name' => 'Hidden Provider',
            'email' => $email,
            'phone' => '+251911000007',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'provider',
            'business_name' => 'Hidden Services Unique',
            'location' => 'Hote',
            'experience_years' => 3,
        ]);

        $publicRes = $this->getJson('/api/providers');
        $publicRes->assertStatus(200);

        $names = collect($publicRes->json('data'))->pluck('business_name');
        $this->assertFalse($names->contains('Hidden Services Unique'));
    }

    /**
     * 8. Admin can access a submitted CV.
     */
    public function test_admin_can_access_submitted_cv(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $fakePdf = UploadedFile::fake()->create('admin_inspect_cv.pdf', 500, 'application/pdf');
        $storedPath = Storage::disk('local')->putFile('cvs', $fakePdf);

        $providerUser = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Admin CV Inspection Pro',
            'location' => 'Piazza',
            'experience_years' => 5,
            'verification_status' => 'pending',
            'cv_path' => $storedPath,
            'cv_original_name' => 'admin_inspect_cv.pdf',
        ]);

        $response = $this->actingAs($admin)
            ->get("/api/admin/providers/{$profile->id}/cv");

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/pdf');
    }

    /**
     * 9. Customer cannot access a private CV.
     */
    public function test_customer_cannot_access_private_cv(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $fakePdf = UploadedFile::fake()->create('secret_cv.pdf', 500, 'application/pdf');
        $storedPath = Storage::disk('local')->putFile('cvs', $fakePdf);

        $providerUser = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Secret CV Pro',
            'location' => 'Piazza',
            'experience_years' => 5,
            'verification_status' => 'pending',
            'cv_path' => $storedPath,
            'cv_original_name' => 'secret_cv.pdf',
        ]);

        $response = $this->actingAs($customer)
            ->getJson("/api/admin/providers/{$profile->id}/cv");

        $response->assertStatus(403);
    }

    /**
     * 10. Provider cannot access another provider's CV.
     */
    public function test_provider_cannot_access_another_providers_cv(): void
    {
        $provider1 = User::factory()->create(['role' => 'provider']);
        $provider2 = User::factory()->create(['role' => 'provider']);

        $fakePdf = UploadedFile::fake()->create('other_cv.pdf', 500, 'application/pdf');
        $storedPath = Storage::disk('local')->putFile('cvs', $fakePdf);

        $profile = ProviderProfile::create([
            'user_id' => $provider2->id,
            'business_name' => 'Target Provider',
            'location' => 'Piazza',
            'experience_years' => 3,
            'verification_status' => 'pending',
            'cv_path' => $storedPath,
            'cv_original_name' => 'other_cv.pdf',
        ]);

        $response = $this->actingAs($provider1)
            ->getJson("/api/admin/providers/{$profile->id}/cv");

        $response->assertStatus(403);
    }

    /**
     * 11. Non-admin users cannot approve or reject providers.
     */
    public function test_non_admin_cannot_approve_or_reject_providers(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $providerUser = User::factory()->create(['role' => 'provider']);
        $profile = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Test Mod Pro',
            'location' => 'Hote',
            'experience_years' => 4,
            'verification_status' => 'pending',
        ]);

        $response = $this->actingAs($customer)
            ->putJson("/api/admin/providers/{$profile->id}/verification", [
                'verification_status' => 'verified',
            ]);

        $response->assertStatus(403);
    }

    /**
     * 12. Admin approval makes the provider eligible for public discovery.
     */
    public function test_admin_approval_makes_provider_eligible_for_public_discovery(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $providerUser = User::factory()->create(['role' => 'provider']);
        $service = Service::factory()->create();

        $profile = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Approve Me Pro Unique',
            'location' => 'Piazza',
            'experience_years' => 4,
            'verification_status' => 'pending',
            'availability_status' => 'available',
        ]);
        $profile->services()->attach($service->id);

        // Approve by admin
        $approveRes = $this->actingAs($admin)
            ->putJson("/api/admin/providers/{$profile->id}/verification", [
                'verification_status' => 'verified',
            ]);
        $approveRes->assertStatus(200);

        // Check public discovery
        $publicRes = $this->getJson('/api/providers');
        $publicRes->assertStatus(200);
        $names = collect($publicRes->json('data'))->pluck('business_name');
        $this->assertTrue($names->contains('Approve Me Pro Unique'));
    }

    /**
     * 13. Admin rejection keeps the provider hidden from public discovery.
     */
    public function test_admin_rejection_keeps_provider_hidden(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $providerUser = User::factory()->create(['role' => 'provider']);

        $profile = ProviderProfile::create([
            'user_id' => $providerUser->id,
            'business_name' => 'Rejected Pro Unique',
            'location' => 'Piazza',
            'experience_years' => 4,
            'verification_status' => 'pending',
        ]);

        // Reject by admin
        $rejectRes = $this->actingAs($admin)
            ->putJson("/api/admin/providers/{$profile->id}/verification", [
                'verification_status' => 'rejected',
                'rejection_reason' => 'Missing professional certification.',
            ]);
        $rejectRes->assertStatus(200);

        $profile->refresh();
        $this->assertEquals('rejected', $profile->verification_status);
        $this->assertEquals('Missing professional certification.', $profile->rejection_reason);

        // Must remain hidden
        $publicRes = $this->getJson('/api/providers');
        $publicRes->assertStatus(200);
        $names = collect($publicRes->json('data'))->pluck('business_name');
        $this->assertFalse($names->contains('Rejected Pro Unique'));
    }

    /**
     * 14. Public provider API responses never expose private CV paths or sensitive user fields.
     */
    public function test_public_api_never_exposes_cv_path_or_sensitive_fields(): void
    {
        $response = $this->getJson('/api/providers');
        $response->assertStatus(200);

        foreach ($response->json('data') as $provider) {
            $this->assertArrayNotHasKey('cv_path', $provider);
            $this->assertArrayNotHasKey('certificate_path', $provider);
            if (isset($provider['user'])) {
                $this->assertArrayNotHasKey('password', $provider['user']);
                $this->assertArrayNotHasKey('remember_token', $provider['user']);
            }
        }
    }
}
