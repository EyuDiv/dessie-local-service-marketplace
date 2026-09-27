<?php

namespace App\Http\Controllers;

use App\Models\ProviderProfile;
use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceRequestController extends Controller
{
    /**
     * Display a listing of the customer's own service requests.
     */
    public function index(Request $request): JsonResponse
    {
        $requests = ServiceRequest::where('customer_id', $request->user()->id)
            ->with(['provider:id,business_name,location', 'service:id,name'])
            ->latest()
            ->get();

        return response()->json([
            'data' => $requests,
        ]);
    }

    /**
     * Store a newly created service request in storage (Customer only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider_id' => ['required', 'integer', 'exists:provider_profiles,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'description' => ['required', 'string'],
            'location' => ['required', 'string', 'max:255'],
            'requested_date' => ['required', 'date'],
            'requested_time' => ['required', 'string', 'regex:/^\d{1,2}:\d{2}(:\d{2})?$/'],
        ]);

        $provider = ProviderProfile::find($validated['provider_id']);

        // Check 1: Provider must be verified
        if ($provider->verification_status !== 'verified') {
            return response()->json([
                'message' => 'The selected provider is not verified.',
            ], 422);
        }

        // Check 2: Provider must offer the requested service
        if (! $provider->services()->where('services.id', $validated['service_id'])->exists()) {
            return response()->json([
                'message' => 'The selected provider does not offer this service.',
            ], 422);
        }

        // Create the service request using authenticated customer id
        $serviceRequest = ServiceRequest::create([
            'customer_id' => $request->user()->id,
            'provider_id' => $validated['provider_id'],
            'service_id' => $validated['service_id'],
            'description' => $validated['description'],
            'location' => $validated['location'],
            'requested_date' => $validated['requested_date'],
            'requested_time' => $validated['requested_time'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Service request created successfully',
            'data' => $serviceRequest->load(['provider:id,business_name,location', 'service:id,name']),
        ], 201);
    }

    /**
     * Display the specified service request (Customer only).
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $serviceRequest = ServiceRequest::with([
            'provider:id,business_name,location,availability_status',
            'service:id,name',
        ])->find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        // Ownership check
        if ($serviceRequest->customer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        return response()->json([
            'data' => $serviceRequest,
        ]);
    }

    /**
     * Cancel an existing service request (Customer only).
     */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $serviceRequest = ServiceRequest::find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        // Ownership check
        if ($serviceRequest->customer_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        // Cancellation is only permitted from pending or accepted status
        if (! in_array($serviceRequest->status, ['pending', 'accepted'])) {
            return response()->json([
                'message' => "Cannot cancel a request with status '{$serviceRequest->status}'.",
            ], 409);
        }

        $serviceRequest->update([
            'status' => 'cancelled',
        ]);

        return response()->json([
            'message' => 'Service request cancelled successfully',
            'data' => $serviceRequest->fresh(),
        ]);
    }
}
