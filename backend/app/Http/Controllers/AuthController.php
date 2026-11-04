<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user (customer or provider).
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', 'in:customer,provider'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'experience_years' => ['nullable', 'integer', 'min:0'],
            'location' => ['nullable', 'string', 'max:255'],
            'cv' => ['nullable', 'file', 'mimes:pdf', 'max:5120'], // Max 5MB, PDF only
            'certificate' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], // Max 5MB
        ]);

        $cvPath = null;
        $cvOriginalName = null;
        $certPath = null;
        $certOriginalName = null;

        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => Hash::make($validated['password']),
                'role' => $validated['role'],
            ]);

            // If the registered user is a provider, create their initial provider profile
            if ($user->isProvider()) {
                if ($request->hasFile('cv')) {
                    $cvFile = $request->file('cv');
                    $cvOriginalName = $cvFile->getClientOriginalName();
                    // Generate safe random filename; never trust client-supplied filename or path
                    $cvFilename = Str::random(40) . '.pdf';
                    $cvPath = $cvFile->storeAs('cvs', $cvFilename, 'local');
                }

                if ($request->hasFile('certificate')) {
                    $certFile = $request->file('certificate');
                    $certOriginalName = $certFile->getClientOriginalName();
                    $certExt = strtolower($certFile->getClientOriginalExtension() ?: 'pdf');
                    if (! in_array($certExt, ['pdf', 'jpg', 'jpeg', 'png'])) {
                        $certExt = 'pdf';
                    }
                    $certFilename = Str::random(40) . '.' . $certExt;
                    $certPath = $certFile->storeAs('certificates', $certFilename, 'local');
                }

                $user->providerProfile()->create([
                    'business_name' => $validated['business_name'] ?? $user->name,
                    'description' => $validated['description'] ?? null,
                    'experience_years' => $validated['experience_years'] ?? 0,
                    'location' => $validated['location'] ?? 'Piazza',
                    'availability_status' => 'offline',
                    'verification_status' => 'pending',
                    'cv_path' => $cvPath,
                    'cv_original_name' => $cvOriginalName,
                    'certificate_path' => $certPath,
                    'certificate_original_name' => $certOriginalName,
                ]);

                $user->load('providerProfile');
            }

            $token = $user->createToken('auth_token')->plainTextToken;

            DB::commit();

            return response()->json([
                'message' => 'Registration successful',
                'user' => $user,
                'token' => $token,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();

            // Clean up any uploaded files if registration transaction fails
            if ($cvPath && Storage::disk('local')->exists($cvPath)) {
                Storage::disk('local')->delete($cvPath);
            }
            if ($certPath && Storage::disk('local')->exists($certPath)) {
                Storage::disk('local')->delete($certPath);
            }

            throw $e;
        }
    }

    /**
     * Authenticate user and issue Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if ($user->isProvider()) {
            $user->load('providerProfile');
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    /**
     * Log out current user (revoke current access token).
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get details of currently authenticated user.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isProvider()) {
            $user->load('providerProfile');
        }

        return response()->json([
            'user' => $user,
        ]);
    }
}
