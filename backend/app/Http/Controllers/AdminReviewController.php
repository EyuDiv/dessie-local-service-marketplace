<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\JsonResponse;

class AdminReviewController extends Controller
{
    /**
     * Display a listing of all reviews across the marketplace (Admin only).
     */
    public function index(): JsonResponse
    {
        $reviews = Review::with([
            'customer:id,name,email,phone',
            'provider:id,business_name,location',
            'serviceRequest:id,service_id,status,requested_date',
            'serviceRequest.service:id,name',
        ])->latest()->get();

        return response()->json([
            'data' => $reviews,
        ]);
    }

    /**
     * Display the specified review (Admin only).
     */
    public function show(string $id): JsonResponse
    {
        $review = Review::with([
            'customer:id,name,email,phone',
            'provider:id,business_name,location',
            'serviceRequest:id,service_id,status,requested_date',
            'serviceRequest.service:id,name',
        ])->find($id);

        if (! $review) {
            return response()->json([
                'message' => 'Review not found.',
            ], 404);
        }

        return response()->json([
            'data' => $review,
        ]);
    }
}
