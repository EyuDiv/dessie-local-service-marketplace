<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => (function () {
        $isProduction = strtolower(trim((string) env('APP_ENV', 'local'))) === 'production';
        $rawOrigins = env('CORS_ALLOWED_ORIGINS');
        $trimmed = trim((string) $rawOrigins);

        if ($trimmed !== '') {
            return array_values(array_filter(array_map('trim', explode(',', $rawOrigins))));
        }

        // In production, fail-closed: never silently allow wildcard '*'
        if ($isProduction) {
            return [];
        }

        // Non-production (local/development/testing): allow wildcard for developer convenience
        return ['*'];
    })(),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
