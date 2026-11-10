<?php

namespace App\Http\Controllers;

use App\Models\Complaint;
use App\Models\ProviderProfile;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    /**
     * Return platform-wide overview analytics and counts for the Admin Portal.
     */
    public function stats(): JsonResponse
    {
        $todayStart = now()->startOfDay();

        $totalProviders = ProviderProfile::count();
        $pendingProviders = ProviderProfile::where('verification_status', 'pending')->count();
        $verifiedProviders = ProviderProfile::where('verification_status', 'verified')->count();
        $rejectedProviders = ProviderProfile::where('verification_status', 'rejected')->count();

        $totalUsers = User::where('role', 'customer')->count();
        $suspendedUsersCount = User::where('role', 'customer')
            ->where('status', 'suspended')
            ->count();

        $activeUsersToday = User::where('role', 'customer')
            ->where(function ($query) use ($todayStart) {
                $query->where('last_login_at', '>=', $todayStart)
                    ->orWhere('created_at', '>=', $todayStart)
                    ->orWhereHas('serviceRequests', function ($reqQuery) use ($todayStart) {
                        $reqQuery->where('created_at', '>=', $todayStart);
                    });
            })
            ->count();

        $totalRequests = ServiceRequest::count();
        $requestsToday = ServiceRequest::where('created_at', '>=', $todayStart)->count();
        $pendingRequests = ServiceRequest::where('status', 'pending')->count();
        $inProgressRequests = ServiceRequest::whereIn('status', ['accepted', 'in_progress'])->count();
        $completedRequests = ServiceRequest::where('status', 'completed')->count();

        $pendingComplaintsCount = Complaint::where('status', 'pending')->count();
        $resolvedComplaintsCount = Complaint::where('status', 'resolved')->count();
        $totalComplaintsCount = Complaint::count();

        $recentRequests = ServiceRequest::with([
            'customer:id,name,email',
            'provider:id,business_name,location',
            'service:id,name',
        ])
            ->latest()
            ->limit(5)
            ->get(['id', 'customer_id', 'provider_id', 'service_id', 'status', 'requested_date', 'created_at']);

        $recentUsers = User::where('role', 'customer')
            ->withCount('serviceRequests as total_requests_count')
            ->latest()
            ->limit(5)
            ->get(['id', 'name', 'email', 'phone', 'status', 'created_at']);

        return response()->json([
            'data' => [
                'total_providers' => $totalProviders,
                'pending_providers' => $pendingProviders,
                'verified_providers' => $verifiedProviders,
                'rejected_providers' => $rejectedProviders,
                'total_users' => $totalUsers,
                'suspended_users_count' => $suspendedUsersCount,
                'active_users_today' => $activeUsersToday,
                'total_requests' => $totalRequests,
                'requests_today' => $requestsToday,
                'pending_requests' => $pendingRequests,
                'in_progress_requests' => $inProgressRequests,
                'completed_requests' => $completedRequests,
                'pending_complaints_count' => $pendingComplaintsCount,
                'resolved_complaints_count' => $resolvedComplaintsCount,
                'total_complaints_count' => $totalComplaintsCount,
                'recent_requests' => $recentRequests,
                'recent_users' => $recentUsers,
            ],
        ]);
    }
}

