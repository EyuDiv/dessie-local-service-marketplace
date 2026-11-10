<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsProvider
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Unauthenticated.',
            ], 401);
        }

        if (! $user->isProvider()) {
            return response()->json([
                'message' => 'Forbidden.',
            ], 403);
        }

        if ($user->isSuspended()) {
            return response()->json([
                'message' => 'Your account has been suspended.',
            ], 403);
        }

        return $next($request);
    }
}
