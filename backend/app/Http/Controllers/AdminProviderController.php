<?php

namespace App\Http\Controllers;

use App\Models\ProviderProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        if (! Storage::disk('local')->exists($provider->cv_path)) {
            return response()->json([
                'message' => 'CV file is missing from private storage.',
            ], 404);
        }

        $filename = $provider->cv_original_name ?? ('provider_'.$provider->id.'_cv.pdf');
        $safeFilename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $filename);

        return Storage::disk('local')->response(
            $provider->cv_path,
            $safeFilename,
            [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="'.$safeFilename.'"',
                'Cache-Control' => 'no-cache, private',
            ]
        );
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

        if (! Storage::disk('local')->exists($provider->certificate_path)) {
            return response()->json([
                'message' => 'Certificate file is missing from private storage.',
            ], 404);
        }

        $filename = $provider->certificate_original_name ?? ('provider_'.$provider->id.'_certificate.pdf');
        $safeFilename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $filename);
        $mime = Storage::disk('local')->mimeType($provider->certificate_path) ?: 'application/octet-stream';

        return Storage::disk('local')->response(
            $provider->certificate_path,
            $safeFilename,
            [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline; filename="'.$safeFilename.'"',
                'Cache-Control' => 'no-cache, private',
            ]
        );
    }
}
