<?php

namespace App\Http\Controllers;

use App\Models\ProviderProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AdminProviderController extends Controller
{
    /**
     * Display a listing of all provider profiles for administration.
     */
    public function index(): JsonResponse
    {
        $providers = ProviderProfile::with([
            'user:id,name,email,phone',
            'services:id,name,description',
        ])->latest()->get([
            'id',
            'user_id',
            'business_name',
            'description',
            'experience_years',
            'location',
            'availability_status',
            'verification_status',
            'cv_path',
            'cv_original_name',
            'certificate_path',
            'certificate_original_name',
            'rejection_reason',
            'created_at',
            'updated_at',
        ]);

        return response()->json([
            'data' => $providers,
        ]);
    }

    /**
     * Update the verification status of a provider profile.
     */
    public function updateVerification(Request $request, string $id): JsonResponse
    {
        $provider = ProviderProfile::find($id);

        if (! $provider) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $validated = $request->validate([
            'verification_status' => ['required', 'string', 'in:verified,rejected,pending'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $updateData = [
            'verification_status' => $validated['verification_status'],
        ];

        if ($validated['verification_status'] === 'rejected') {
            $updateData['rejection_reason'] = $validated['rejection_reason'] ?? 'Application does not meet municipal marketplace standards.';
        } elseif ($validated['verification_status'] === 'verified') {
            $updateData['rejection_reason'] = null;
        }

        $provider->update($updateData);

        return response()->json([
            'message' => 'Provider verification status updated successfully',
            'data' => $provider->fresh()->load('user:id,name,email,phone'),
        ]);
    }

    /**
     * Authenticated, authorized admin download/stream of a provider's CV document.
     */
    public function downloadCv(Request $request, string $id)
    {
        $provider = ProviderProfile::find($id);

        if (! $provider || ! $provider->cv_path) {
            return response()->json([
                'message' => 'CV document not found for this provider.',
            ], 404);
        }

        $privateDisk = config('filesystems.private_disk', 'local');

        $fileExists = false;
        try {
            $fileExists = Storage::disk($privateDisk)->exists($provider->cv_path);
        } catch (\Throwable $storageEx) {
            Log::error('Storage service failure checking CV existence for provider ' . $provider->id . ': ' . $storageEx->getMessage());
            return response()->json([
                'message' => 'Storage service is currently unavailable. Please try again later.',
            ], 503);
        }

        if (! $fileExists) {
            return response()->json([
                'message' => 'CV file is missing from private storage.',
            ], 404);
        }

        $filename = $provider->cv_original_name ?? ('provider_'.$provider->id.'_cv.pdf');
        $safeFilename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $filename);

        try {
            return Storage::disk($privateDisk)->response(
                $provider->cv_path,
                $safeFilename,
                [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'inline; filename="'.$safeFilename.'"',
                    'Cache-Control' => 'no-cache, private',
                ]
            );
        } catch (\Throwable $storageEx) {
            Log::error('Storage service failure streaming CV for provider ' . $provider->id . ': ' . $storageEx->getMessage());
            return response()->json([
                'message' => 'Failed to retrieve document from storage service. Please try again later.',
            ], 503);
        }
    }

    /**
     * Authenticated, authorized admin download/stream of a provider's certificate document.
     */
    public function downloadCertificate(Request $request, string $id)
    {
        $provider = ProviderProfile::find($id);

        if (! $provider || ! $provider->certificate_path) {
            return response()->json([
                'message' => 'Certificate document not found for this provider.',
            ], 404);
        }

        $privateDisk = config('filesystems.private_disk', 'local');

        $fileExists = false;
        try {
            $fileExists = Storage::disk($privateDisk)->exists($provider->certificate_path);
        } catch (\Throwable $storageEx) {
            Log::error('Storage service failure checking certificate existence for provider ' . $provider->id . ': ' . $storageEx->getMessage());
            return response()->json([
                'message' => 'Storage service is currently unavailable. Please try again later.',
            ], 503);
        }

        if (! $fileExists) {
            return response()->json([
                'message' => 'Certificate file is missing from private storage.',
            ], 404);
        }

        $filename = $provider->certificate_original_name ?? ('provider_'.$provider->id.'_certificate.pdf');
        $safeFilename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $filename);

        try {
            $mime = Storage::disk($privateDisk)->mimeType($provider->certificate_path) ?: 'application/octet-stream';

            return Storage::disk($privateDisk)->response(
                $provider->certificate_path,
                $safeFilename,
                [
                    'Content-Type' => $mime,
                    'Content-Disposition' => 'inline; filename="'.$safeFilename.'"',
                    'Cache-Control' => 'no-cache, private',
                ]
            );
        } catch (\Throwable $storageEx) {
            Log::error('Storage service failure streaming certificate for provider ' . $provider->id . ': ' . $storageEx->getMessage());
            return response()->json([
                'message' => 'Failed to retrieve document from storage service. Please try again later.',
            ], 503);
        }
    }
}
