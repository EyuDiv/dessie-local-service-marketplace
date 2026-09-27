<?php

namespace App\Http\Controllers;

use App\Models\ProviderProfile;
use App\Models\Review;
use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Display a listing of reviews created by the authenticated customer.
     */
    public function index(Request $request): JsonResponse
    {
        $reviews = Review::where('customer_id', $request->user()->id)
            ->with([
                'provider:id,business_name,location',
                'serviceRequest:id,requested_date,requested_time,status,service_id',
                'serviceRequest.service:id,name',
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $reviews,
        ]);
    }

    /**
     * Store a newly created review for a completed service request (Customer only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'request_id' => ['required', 'integer', 'exists:service_requests,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
        ]);

        $serviceRequest = ServiceRequest::find($validated['request_id']);

        // Check 1: Ownership — Request must belong to authenticated customer
        if ($serviceRequest->customer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        // Check 2: Completed status — Only completed requests can be reviewed
        if ($serviceRequest->status !== 'completed') {
            return response()->json([
                'message' => 'Only completed service requests can be reviewed.',
            ], 422);
        }

        // Check 3: One review per request — Request must not already be reviewed
        if ($serviceRequest->review()->exists() || Review::where('request_id', $serviceRequest->id)->exists()) {
            return response()->json([
                'message' => 'This service request has already been reviewed.',
            ], 409);
        }

        // Create review with immutable server-controlled IDs
        $review = Review::create([
            'request_id' => $serviceRequest->id,
            'customer_id' => $request->user()->id,
            'provider_id' => $serviceRequest->provider_id,
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'message' => 'Review created successfully',
            'data' => $review->load([
                'serviceRequest:id,status',
                'provider:id,business_name',
            ]),
        ], 201);
    }

    /**
     * Display the specified review (Customer only, strictly own).
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $review = Review::with([
            'provider:id,business_name,location',
            'serviceRequest:id,service_id,status',
            'serviceRequest.service:id,name',
        ])->find($id);

        if (! $review) {
            return response()->json([
                'message' => 'Review not found.',
            ], 404);
        }

        if ($review->customer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        return response()->json([
            'data' => $review,
        ]);
    }

    /**
     * Update the specified review (Customer only, strictly own).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $review = Review::find($id);

        if (! $review) {
            return response()->json([
                'message' => 'Review not found.',
            ], 404);
        }

        if ($review->customer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
        ]);

        // Only rating and comment can be updated; IDs remain immutable
        $review->update([
            'rating' => $validated['rating'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return response()->json([
            'message' => 'Review updated successfully',
            'data' => $review->fresh(),
        ]);
    }

    /**
     * Remove the specified review from storage (Customer only, strictly own).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $review = Review::find($id);

        if (! $review) {
            return response()->json([
                'message' => 'Review not found.',
            ], 404);
        }

        if ($review->customer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        $review->delete();

        return response()->json([
            'message' => 'Review deleted successfully',
        ]);
    }

    /**
     * Publicly display reviews for a specific provider.
     */
    public function publicProviderReviews(string $providerId): JsonResponse
    {
        $provider = ProviderProfile::find($providerId);

        if (! $provider) {
            return response()->json([
                'message' => 'Provider not found.',
            ], 404);
        }

        $reviews = Review::where('provider_id', $provider->id)
            ->with(['customer:id,name'])
            ->latest()
            ->get(['id', 'customer_id', 'provider_id', 'rating', 'comment', 'created_at']);

        return response()->json([
            'data' => $reviews,
        ]);
    }
}
