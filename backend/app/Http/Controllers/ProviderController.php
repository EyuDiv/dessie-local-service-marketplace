<?php

namespace App\Http\Controllers;

use App\Models\ProviderProfile;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
     * Upload or update the authenticated provider's CV.
     */
    public function uploadCv(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        // 1. Validate the incoming CV
        $request->validate([
            'cv' => ['required', 'file', 'mimes:pdf', 'max:5120'], // Max 5MB PDF
        ]);

        $privateDisk = config('filesystems.private_disk', 'local');
        $file = $request->file('cv');
        $originalName = $file->getClientOriginalName();
        $randomFilename = Str::random(40) . '.pdf';

        // 2. Upload the new CV to the configured private disk
        $newPath = null;
        try {
            $newPath = $file->storeAs('cvs', $randomFilename, $privateDisk);
        } catch (\Throwable $storageEx) {
            Log::error('Failed to store new CV file to storage: ' . $storageEx->getMessage());
            return response()->json([
                'message' => 'Failed to store document in storage. Please try again.',
            ], 500);
        }

        // 3. Confirm that upload succeeded and a valid path was returned
        // 4. If upload fails, return appropriate error; old CV and database path remain untouched
        if (! $newPath || ! is_string($newPath)) {
            Log::error('Storage driver returned false or non-string path for uploaded CV.');
            return response()->json([
                'message' => 'Failed to store document in storage. Please try again.',
            ], 500);
        }

        $oldPath = $profile->cv_path;

        // 5. Update the database with the new path only after successful upload
        try {
            $profile->update([
                'cv_path' => $newPath,
                'cv_original_name' => $originalName,
                'verification_status' => 'pending', // Re-trigger review upon document update
            ]);
        } catch (\Throwable $dbEx) {
            Log::error('Database update failed after CV upload: ' . $dbEx->getMessage());

            // 7. If database update fails, clean up newly uploaded file and preserve old file
            try {
                if (Storage::disk($privateDisk)->exists($newPath)) {
                    Storage::disk($privateDisk)->delete($newPath);
                }
            } catch (\Throwable $cleanupEx) {
                Log::warning('Failed to clean up newly uploaded CV after DB failure: ' . $cleanupEx->getMessage());
            }

            return response()->json([
                'message' => 'Failed to save document profile details. Please try again.',
            ], 500);
        }

        // 6. Delete previous CV only after the database update succeeds
        if ($oldPath && is_string($oldPath) && $oldPath !== $newPath) {
            try {
                if (Storage::disk($privateDisk)->exists($oldPath)) {
                    Storage::disk($privateDisk)->delete($oldPath);
                }
            } catch (\Throwable $deleteEx) {
                // 8. If deleting old file fails, log safely; old file deletion failure does not invalidate upload
                Log::warning('Failed to delete previous CV file (' . $oldPath . ') from private storage: ' . $deleteEx->getMessage());
            }
        }

        return response()->json([
            'message' => 'CV uploaded successfully.',
            'data' => $profile->fresh(),
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

        // Optional search filter: q or search
        if ($request->filled('q') || $request->filled('search')) {
            $term = trim($request->input('q', $request->input('search')));
            if ($term !== '') {
                $query->where(function ($sub) use ($term) {
                    $sub->where('business_name', 'like', "%{$term}%")
                        ->orWhere('description', 'like', "%{$term}%")
                        ->orWhere('location', 'like', "%{$term}%")
                        ->orWhereHas('services', function ($s) use ($term) {
                            $s->where('name', 'like', "%{$term}%")
                              ->orWhere('description', 'like', "%{$term}%");
                        })
                        ->orWhereHas('user', function ($u) use ($term) {
                            $u->where('name', 'like', "%{$term}%")
                              ->orWhere('phone', 'like', "%{$term}%");
                        });
                });
            }
        }

        $providers = $query->with(['services:id,name,description', 'user:id,name,phone'])->get([
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
