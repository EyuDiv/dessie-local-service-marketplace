<?php

namespace App\Http\Controllers;

use App\Models\ProviderProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProviderController extends Controller
{
    /**
     * Display a listing of all provider profiles for administration.
     */
    public function index(): JsonResponse
    {
        $providers = ProviderProfile::with(['user:id,name,email,phone'])->get([
            'id',
            'user_id',
            'business_name',
            'description',
            'experience_years',
            'location',
            'availability_status',
            'verification_status',
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
        ]);

        $provider->update([
            'verification_status' => $validated['verification_status'],
        ]);

        return response()->json([
            'message' => 'Provider verification status updated successfully',
            'data' => $provider->fresh(),
        ]);
    }
}
