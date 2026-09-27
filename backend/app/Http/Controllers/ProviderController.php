<?php

namespace App\Http\Controllers;

use App\Models\ProviderProfile;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderController extends Controller
{
    /**
     * Display authenticated provider's own profile.
     */
    public function profile(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        return response()->json([
            'data' => $profile,
        ]);
    }

    /**
     * Update authenticated provider's own profile details.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'experience_years' => ['required', 'integer', 'min:0'],
            'location' => ['required', 'string', 'max:255'],
        ]);

        // Explicitly update only allowed fields; protect user_id, verification_status, availability_status
        $profile->update([
            'business_name' => $validated['business_name'],
            'description' => $validated['description'] ?? null,
            'experience_years' => $validated['experience_years'],
            'location' => $validated['location'],
        ]);

        return response()->json([
            'message' => 'Provider profile updated successfully',
            'data' => $profile->fresh(),
        ]);
    }

    /**
     * Update authenticated provider's availability status.
     */
    public function updateAvailability(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $validated = $request->validate([
            'availability_status' => ['required', 'string', 'in:available,busy,offline'],
        ]);

        $profile->update([
            'availability_status' => $validated['availability_status'],
        ]);

        return response()->json([
            'message' => 'Availability status updated successfully',
            'data' => $profile->fresh(),
        ]);
    }

    /**
     * List services currently offered by the authenticated provider.
     */
    public function services(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $services = $profile->services()->get(['services.id', 'services.name', 'services.description']);

        return response()->json([
            'data' => $services,
        ]);
    }

    /**
     * Attach an existing service to the authenticated provider's catalog.
     */
    public function addService(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $validated = $request->validate([
            'service_id' => ['required', 'integer', 'exists:services,id'],
        ]);

        // Check if service is already offered
        if ($profile->services()->where('services.id', $validated['service_id'])->exists()) {
            return response()->json([
                'message' => 'Service is already offered by this provider.',
            ], 409);
        }

        $profile->services()->attach($validated['service_id']);

        $service = $profile->services()->where('services.id', $validated['service_id'])->first(['services.id', 'services.name', 'services.description']);

        return response()->json([
            'message' => 'Service added successfully',
            'data' => $service,
        ], 201);
    }

    /**
     * Remove an offered service from the authenticated provider's catalog.
     */
    public function removeService(Request $request, string $serviceId): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        // Verify service is attached to this provider
        if (! $profile->services()->where('services.id', $serviceId)->exists()) {
            return response()->json([
                'message' => 'Service not found in provider catalog.',
            ], 404);
        }

        $profile->services()->detach($serviceId);

        return response()->json([
            'message' => 'Service removed successfully',
        ]);
    }

    /**
     * Public discovery of verified providers with optional filtering.
     */
    public function publicIndex(Request $request): JsonResponse
    {
        // Only verified providers are returned
        $query = ProviderProfile::query()->where('verification_status', 'verified');

        // Optional filter: service_id
        if ($request->filled('service_id')) {
            $query->whereHas('services', function ($q) use ($request) {
                $q->where('services.id', $request->service_id);
            });
        }

        // Optional filter: location
        if ($request->filled('location')) {
            $query->where('location', $request->location);
        }

        // Optional filter: availability_status
        if ($request->filled('availability_status')) {
            $query->where('availability_status', $request->availability_status);
        }

        $providers = $query->with(['services:id,name,description'])->get([
            'id',
            'user_id',
            'business_name',
            'description',
            'experience_years',
            'location',
            'availability_status',
            'verification_status',
        ]);

        return response()->json([
            'data' => $providers,
        ]);
    }
}
