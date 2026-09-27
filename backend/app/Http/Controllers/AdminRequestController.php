<?php

namespace App\Http\Controllers;

use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;

class AdminRequestController extends Controller
{
    /**
     * Display a listing of all service requests across the marketplace (Admin only).
     */
    public function index(): JsonResponse
    {
        $requests = ServiceRequest::with([
            'customer:id,name,phone,email',
            'provider:id,business_name,location,experience_years',
            'service:id,name',
        ])->latest()->get();

        return response()->json([
            'data' => $requests,
        ]);
    }

    /**
     * Display the specified service request (Admin only).
     */
    public function show(string $id): JsonResponse
    {
        $serviceRequest = ServiceRequest::with([
            'customer:id,name,phone,email',
            'provider:id,business_name,location,experience_years',
            'service:id,name',
        ])->find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        return response()->json([
            'data' => $serviceRequest,
        ]);
    }
}
