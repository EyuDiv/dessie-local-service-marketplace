<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    /**
     * Display a paginated listing of registered customer/client accounts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->where('role', 'customer')
            ->withCount('serviceRequests as total_requests_count');

        if ($request->filled('status') && in_array($request->input('status'), ['active', 'suspended'], true)) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            if ($term !== '') {
                $query->where(function ($sub) use ($term) {
                    $sub->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%");
                });
            }
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 10)));

        $paginator = $query->latest()->paginate(
            $perPage,
            ['id', 'name', 'email', 'phone', 'role', 'status', 'last_login_at', 'created_at']
        );

        return response()->json($paginator);
    }

    /**
     * Toggle or explicitly set a user's active/suspended account status.
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $user = User::find($id);

        if (! $user) {
            return response()->json([
                'message' => 'User not found.',
            ], 404);
        }

        if ($user->isAdmin()) {
            return response()->json([
                'message' => 'Administrator accounts cannot be suspended.',
            ], 403);
        }

        $validated = $request->validate([
            'status' => ['nullable', 'string', 'in:active,suspended'],
        ]);

        $newStatus = $validated['status'] ?? ($user->status === 'active' ? 'suspended' : 'active');

        $user->update([
            'status' => $newStatus,
        ]);

        if ($newStatus === 'suspended') {
            $user->tokens()->delete();
        }

        $user->loadCount('serviceRequests as total_requests_count');

        return response()->json([
            'message' => $newStatus === 'suspended'
                ? 'User account suspended successfully.'
                : 'User account activated successfully.',
            'data' => $user->only([
                'id',
                'name',
                'email',
                'phone',
                'role',
                'status',
                'last_login_at',
                'created_at',
                'total_requests_count',
            ]),
        ]);
    }
}

