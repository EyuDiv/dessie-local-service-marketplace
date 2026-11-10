<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    /**
     * Store a new user complaint or dispute ticket (authenticated users).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'provider_id' => ['nullable', 'integer', 'exists:provider_profiles,id'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $complaint = Complaint::create([
            'user_id' => $request->user()->id,
            'provider_id' => $validated['provider_id'] ?? null,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Complaint submitted successfully.',
            'data' => $complaint->load('provider:id,business_name,location'),
        ], 201);
    }
}

