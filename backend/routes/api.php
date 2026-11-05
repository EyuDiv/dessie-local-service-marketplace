<?php

use App\Http\Controllers\AdminProviderController;
use App\Http\Controllers\AdminRequestController;
use App\Http\Controllers\AdminReviewController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\ProviderRequestController;
use App\Http\Controllers\ProviderReviewController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServiceRequestController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/
// Authentication (Rate-limited to protect against brute-force attacks)
Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// Services (Catalog Browsing)
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/services/{service}', [ServiceController::class, 'show']);

// Public Provider Discovery & Reviews
Route::get('/providers', [ProviderController::class, 'publicIndex']);
Route::get('/providers/{provider}/reviews', [ReviewController::class, 'publicProviderReviews']);

/*
|--------------------------------------------------------------------------
| Protected Authenticated Routes (auth:sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    /*
    |----------------------------------------------------------------------
    | Customer-Only Routes
    |----------------------------------------------------------------------
    */
    Route::middleware('customer')->group(function () {
        // Service Requests
        Route::post('/requests', [ServiceRequestController::class, 'store']);
        Route::get('/requests', [ServiceRequestController::class, 'index']);
        Route::get('/requests/{request}', [ServiceRequestController::class, 'show']);
        Route::put('/requests/{request}/cancel', [ServiceRequestController::class, 'cancel']);

        // Reviews Management
        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::get('/reviews', [ReviewController::class, 'index']);
        Route::get('/reviews/{review}', [ReviewController::class, 'show']);
        Route::put('/reviews/{review}', [ReviewController::class, 'update']);
        Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);
    });

    /*
    |----------------------------------------------------------------------
    | Provider-Only Routes
    |----------------------------------------------------------------------
    */
    Route::middleware('provider')->prefix('provider')->group(function () {
        // Profile & Availability
        Route::get('/profile', [ProviderController::class, 'profile']);
        Route::put('/profile', [ProviderController::class, 'updateProfile']);
        Route::put('/availability', [ProviderController::class, 'updateAvailability']);
        Route::post('/cv', [ProviderController::class, 'uploadCv']);

        // Offered Services
        Route::get('/services', [ProviderController::class, 'services']);
        Route::post('/services', [ProviderController::class, 'addService']);
        Route::delete('/services/{service}', [ProviderController::class, 'removeService']);

        // Service Requests Workflow
        Route::get('/requests', [ProviderRequestController::class, 'index']);
        Route::get('/requests/{request}', [ProviderRequestController::class, 'show']);
        Route::put('/requests/{request}/accept', [ProviderRequestController::class, 'accept']);
        Route::put('/requests/{request}/reject', [ProviderRequestController::class, 'reject']);
        Route::put('/requests/{request}/start', [ProviderRequestController::class, 'start']);
        Route::put('/requests/{request}/complete', [ProviderRequestController::class, 'complete']);

        // Reviews (Read-Only)
        Route::get('/reviews', [ProviderReviewController::class, 'index']);
        Route::get('/reviews/{review}', [ProviderReviewController::class, 'show']);
    });

    /*
    |----------------------------------------------------------------------
    | Admin-Only Routes
    |----------------------------------------------------------------------
    */
    Route::middleware('admin')->group(function () {
        // Services Management
        Route::post('/services', [ServiceController::class, 'store']);
        Route::put('/services/{service}', [ServiceController::class, 'update']);
        Route::delete('/services/{service}', [ServiceController::class, 'destroy']);

        // Provider Management & Verification
        Route::get('/admin/providers', [AdminProviderController::class, 'index']);
        Route::put('/admin/providers/{provider}/verification', [AdminProviderController::class, 'updateVerification']);
        Route::get('/admin/providers/{provider}/cv', [AdminProviderController::class, 'downloadCv']);
        Route::get('/admin/providers/{provider}/certificate', [AdminProviderController::class, 'downloadCertificate']);

        // Service Requests Oversight
        Route::get('/admin/requests', [AdminRequestController::class, 'index']);
        Route::get('/admin/requests/{request}', [AdminRequestController::class, 'show']);

        // Reviews Oversight (Read-Only)
        Route::get('/admin/reviews', [AdminReviewController::class, 'index']);
        Route::get('/admin/reviews/{review}', [AdminReviewController::class, 'show']);
    });
});
