<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    /**
     * Display a listing of all available services (Public).
     */
    public function index(): JsonResponse
    {
        $services = Service::all(['id', 'name', 'description', 'created_at', 'updated_at']);

        return response()->json([
            'data' => $services,
        ]);
    }

    /**
     * Display the specified service (Public).
     */
    public function show(string $id): JsonResponse
    {
        $service = Service::find($id);

        if (! $service) {
            return response()->json([
                'message' => 'Service not found.',
            ], 404);
        }

        return response()->json([
            'data' => $service,
        ]);
    }

    /**
     * Store a newly created service in storage (Admin only).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:services,name'],
            'description' => ['required', 'string'],
        ]);

        $service = Service::create($validated);

        return response()->json([
            'message' => 'Service created successfully',
            'data' => $service,
        ], 201);
    }

    /**
     * Update the specified service in storage (Admin only).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $service = Service::find($id);

        if (! $service) {
            return response()->json([
                'message' => 'Service not found.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('services', 'name')->ignore($service->id)],
            'description' => ['required', 'string'],
        ]);

        $service->update($validated);

        return response()->json([
            'message' => 'Service updated successfully',
            'data' => $service,
        ]);
    }

    /**
     * Remove the specified service from storage (Admin only).
     */
    public function destroy(string $id): JsonResponse
    {
        $service = Service::find($id);

        if (! $service) {
            return response()->json([
                'message' => 'Service not found.',
            ], 404);
        }

        // Prevent unsafe deletion if service has transaction history (service requests)
        if ($service->serviceRequests()->exists()) {
            return response()->json([
                'message' => 'Cannot delete service because it is referenced by existing service requests.',
            ], 409);
        }

        // Prevent deletion if service is currently assigned to any provider
        if ($service->providers()->exists()) {
            return response()->json([
                'message' => 'Cannot delete service because it is currently offered by one or more providers.',
            ], 409);
        }

        $service->delete();

        return response()->json([
            'message' => 'Service deleted successfully',
        ]);
    }
}
