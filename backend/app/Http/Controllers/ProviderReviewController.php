<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderReviewController extends Controller
{
    /**
     * Display a listing of reviews received by the authenticated provider.
     */
    public function index(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $reviews = Review::where('provider_id', $profile->id)
            ->with([
                'customer:id,name',
                'serviceRequest:id,service_id,status,requested_date',
                'serviceRequest.service:id,name',
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $reviews,
        ]);
    }

    /**
     * Display a single review received by the authenticated provider.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $review = Review::with([
            'customer:id,name',
            'serviceRequest:id,service_id,status,requested_date',
            'serviceRequest.service:id,name',
        ])->find($id);

        if (! $review) {
            return response()->json([
                'message' => 'Review not found.',
            ], 404);
        }

        // Ownership check
        if ($review->provider_id !== $profile->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        return response()->json([
            'data' => $review,
        ]);
    }
}
