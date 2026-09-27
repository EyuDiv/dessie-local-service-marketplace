<?php

namespace App\Http\Controllers;

use App\Models\ServiceRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProviderRequestController extends Controller
{
    /**
     * Display a listing of service requests assigned to the authenticated provider.
     */
    public function index(Request $request): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $requests = ServiceRequest::where('provider_id', $profile->id)
            ->with([
                'customer:id,name,phone,email',
                'service:id,name,description',
            ])
            ->latest()
            ->get();

        return response()->json([
            'data' => $requests,
        ]);
    }

    /**
     * Display the specified service request assigned to the provider.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $serviceRequest = ServiceRequest::with([
            'customer:id,name,phone,email',
            'service:id,name,description',
        ])->find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        // Ownership check
        if ($serviceRequest->provider_id !== $profile->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        return response()->json([
            'data' => $serviceRequest,
        ]);
    }

    /**
     * Accept a pending service request (Provider only).
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $serviceRequest = ServiceRequest::find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        if ($serviceRequest->provider_id !== $profile->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        if ($serviceRequest->status !== 'pending') {
            return response()->json([
                'message' => "Cannot accept a request with status '{$serviceRequest->status}'.",
            ], 409);
        }

        $serviceRequest->update(['status' => 'accepted']);

        return response()->json([
            'message' => 'Service request accepted successfully',
            'data' => $serviceRequest->fresh(),
        ]);
    }

    /**
     * Reject a pending service request (Provider only).
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $serviceRequest = ServiceRequest::find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        if ($serviceRequest->provider_id !== $profile->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        if ($serviceRequest->status !== 'pending') {
            return response()->json([
                'message' => "Cannot reject a request with status '{$serviceRequest->status}'.",
            ], 409);
        }

        $serviceRequest->update(['status' => 'rejected']);

        return response()->json([
            'message' => 'Service request rejected successfully',
            'data' => $serviceRequest->fresh(),
        ]);
    }

    /**
     * Start an accepted service request (Provider only).
     */
    public function start(Request $request, string $id): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $serviceRequest = ServiceRequest::find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        if ($serviceRequest->provider_id !== $profile->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        if ($serviceRequest->status !== 'accepted') {
            return response()->json([
                'message' => "Cannot start a request with status '{$serviceRequest->status}'.",
            ], 409);
        }

        $serviceRequest->update(['status' => 'in_progress']);

        return response()->json([
            'message' => 'Service request marked as in progress',
            'data' => $serviceRequest->fresh(),
        ]);
    }

    /**
     * Complete an in-progress service request (Provider only).
     */
    public function complete(Request $request, string $id): JsonResponse
    {
        $profile = $request->user()->providerProfile;

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $serviceRequest = ServiceRequest::find($id);

        if (! $serviceRequest) {
            return response()->json([
                'message' => 'Service request not found.',
            ], 404);
        }

        if ($serviceRequest->provider_id !== $profile->id) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        if ($serviceRequest->status !== 'in_progress') {
            return response()->json([
                'message' => "Cannot complete a request with status '{$serviceRequest->status}'.",
            ], 409);
        }

        $serviceRequest->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Service request completed successfully',
            'data' => $serviceRequest->fresh(),
        ]);
    }
}
