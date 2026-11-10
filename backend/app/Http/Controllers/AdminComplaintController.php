<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminComplaintController extends Controller
{
    /**
     * Related models loaded for complaint administration views.
     *
     * @var list<string>
     */
    private const COMPLAINT_RELATIONS = [
        'user:id,name,email,phone,role',
        'provider:id,business_name,location',
    ];

    /**
     * Display a listing of all user complaints and disputes.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Complaint::query()->with(self::COMPLAINT_RELATIONS);

        if ($request->filled('status') && in_array($request->input('status'), ['pending', 'resolved', 'dismissed'], true)) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            if ($term !== '') {
                $query->where(function ($sub) use ($term) {
                    $sub->where('subject', 'like', "%{$term}%")
                        ->orWhere('message', 'like', "%{$term}%")
                        ->orWhereHas('user', function ($uq) use ($term) {
                            $uq->where('name', 'like', "%{$term}%")
                                ->orWhere('email', 'like', "%{$term}%")
                                ->orWhere('phone', 'like', "%{$term}%");
                        })
                        ->orWhereHas('provider', function ($pq) use ($term) {
                            $pq->where('business_name', 'like', "%{$term}%");
                        });
                });
            }
        }

        $complaints = $query->latest()->get();

        return response()->json([
            'data' => $complaints,
        ]);
    }

    /**
     * Update the status of a specific complaint (pending, resolved, dismissed).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $complaint = Complaint::find($id);

        if (! $complaint) {
            return response()->json([
                'message' => 'Complaint not found.',
            ], 404);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:pending,resolved,dismissed'],
        ]);

        $complaint->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'message' => 'Complaint status updated successfully.',
            'data' => $complaint->fresh(self::COMPLAINT_RELATIONS),
        ]);
    }
}

