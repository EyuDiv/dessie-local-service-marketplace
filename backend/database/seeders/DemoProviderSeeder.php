<?php

namespace Database\Seeders;

use App\Models\ProviderProfile;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DemoProviderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Development and testing only. Does not run in production.
     * Uses non-destructive firstOrCreate to preserve existing user accounts and passwords.
     */
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('DemoProviderSeeder is restricted to local and testing environments.');
            return;
        }

        $email = env('DEMO_PROVIDER_EMAIL', 'demo.provider@dessie.local');
        $phone = env('DEMO_PROVIDER_PHONE', '+251911009999');
        $password = env('DEMO_PROVIDER_PASSWORD', 'DessieDemo2026!Secure');
        $isVerified = filter_var(env('DEMO_PROVIDER_VERIFIED', false), FILTER_VALIDATE_BOOLEAN);

        // 1. Create or retrieve demo provider user
        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Demo Provider Dessie',
                'phone' => $phone,
                'role' => 'provider',
                'password' => Hash::make($password),
            ]
        );

        // 2. Ensure demo CV file exists in private storage
        $privateDisk = config('filesystems.private_disk', 'local');
        $demoCvFilename = 'demo_provider_cv.pdf';
        $demoCvPath = 'cvs/' . $demoCvFilename;
        if (! Storage::disk($privateDisk)->exists($demoCvPath)) {
            Storage::disk($privateDisk)->put(
                $demoCvPath,
                "%PDF-1.4\n1 0 obj\n<< /Title (Demo Dessie Provider CV) /Author (Demo Provider) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
            );
        }

        // 3. Create or retrieve associated provider profile
        $profile = ProviderProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'business_name' => 'Dessie Demo Plumbing & Electrical',
                'description' => 'Certified demo local technician offering residential plumbing and electrical services in Dessie.',
                'experience_years' => 5,
                'location' => 'Piazza',
                'availability_status' => 'available',
                'verification_status' => $isVerified ? 'verified' : 'pending',
                'cv_path' => $demoCvPath,
                'cv_original_name' => 'Dessie_Demo_Technician_CV.pdf',
            ]
        );

        if (empty($profile->cv_path)) {
            $profile->update([
                'cv_path' => $demoCvPath,
                'cv_original_name' => 'Dessie_Demo_Technician_CV.pdf',
            ]);
        }

        // 3. Ensure essential demo services exist in catalog
        $services = [
            ['name' => 'Plumbing', 'description' => 'Pipe repair, leak fixing, and water installation in Dessie homes.'],
            ['name' => 'Electrical', 'description' => 'Wiring, circuit breaker repair, and electrical fixture installation.'],
            ['name' => 'Home Cleaning', 'description' => 'Comprehensive residential cleaning and sanitation services.'],
        ];

        foreach ($services as $serviceData) {
            $service = Service::firstOrCreate(
                ['name' => $serviceData['name']],
                ['description' => $serviceData['description']]
            );

            // Attach service to demo provider if not already attached
            if (!$profile->services()->where('services.id', $service->id)->exists()) {
                $profile->services()->attach($service->id);
            }
        }

        $this->command?->info("Demo provider seeded successfully (Status: {$profile->verification_status}).");
    }
}
