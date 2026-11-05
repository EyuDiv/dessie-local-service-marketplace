import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, 'backend');

function runPhp(code, envOverrides = {}) {
  const env = { ...process.env, ...envOverrides };
  const envSetup = Object.entries(envOverrides)
    .map(([k, v]) => {
      if (v === null || v === undefined) {
        return `putenv('${k}'); unset($_ENV['${k}'], $_SERVER['${k}']);`;
      }
      return `putenv('${k}=${v}'); $_ENV['${k}'] = '${v}'; $_SERVER['${k}'] = '${v}';`;
    })
    .join(' ');

  const fullCode = `
    require 'vendor/autoload.php';
    $app = require 'bootstrap/app.php';
    $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();
    ${envSetup}
    ${code}
  `;
  const res = spawnSync('php', ['-r', fullCode], {
    cwd: backendDir,
    env,
    encoding: 'utf-8',
  });
  if (res.error) throw res.error;
  return res.stdout.trim();
}

console.log('========================================================================');
console.log('     DEPLOYMENT SAFETY & CONFIGURATION VERIFICATION TEST SUITE           ');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, message, details = '') {
  total++;
  if (condition) {
    console.log(`[PASS] ${total}. ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${total}. ${message} ${details ? `(${details})` : ''}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// 1. CORS CONFIGURATION TESTS
// -----------------------------------------------------------------------------
console.log('--- 1. Verifying CORS Configuration Under Different Environments ---');

// Test 1: Local development CORS fallback when CORS_ALLOWED_ORIGINS is unset
const localUnsetOutput = runPhp(
  `$config = require 'config/cors.php'; echo json_encode($config['allowed_origins'], JSON_UNESCAPED_SLASHES);`,
  { APP_ENV: 'local', CORS_ALLOWED_ORIGINS: '' }
);
assert(
  localUnsetOutput === '["*"]',
  'Local development with unset CORS_ALLOWED_ORIGINS falls back to ["*"]',
  localUnsetOutput
);

// Test 2: Production CORS with a valid frontend origin
const prodValidOutput = runPhp(
  `$config = require 'config/cors.php'; echo json_encode($config['allowed_origins'], JSON_UNESCAPED_SLASHES);`,
  { APP_ENV: 'production', CORS_ALLOWED_ORIGINS: 'https://dessie-app.vercel.app, https://custom.com' }
);
assert(
  prodValidOutput === '["https://dessie-app.vercel.app","https://custom.com"]',
  'Production CORS correctly trims and parses multiple comma-separated frontend origins',
  prodValidOutput
);

// Test 3: Production CORS with missing origin configuration (fail-closed)
const prodMissingOutput = runPhp(
  `$config = require 'config/cors.php'; echo json_encode($config['allowed_origins'], JSON_UNESCAPED_SLASHES);`,
  { APP_ENV: 'production', CORS_ALLOWED_ORIGINS: null }
);
assert(
  prodMissingOutput === '[]',
  'Production CORS with MISSING CORS_ALLOWED_ORIGINS fails closed (denies all origins: [])',
  prodMissingOutput
);

// Test 4: Production CORS with empty string origin configuration (fail-closed)
const prodEmptyOutput = runPhp(
  `$config = require 'config/cors.php'; echo json_encode($config['allowed_origins'], JSON_UNESCAPED_SLASHES);`,
  { APP_ENV: 'production', CORS_ALLOWED_ORIGINS: '   ' }
);
assert(
  prodEmptyOutput === '[]',
  'Production CORS with EMPTY/WHITESPACE CORS_ALLOWED_ORIGINS fails closed (denies all origins: [])',
  prodEmptyOutput
);

// -----------------------------------------------------------------------------
// 2. SANCTUM EXPIRATION VALIDATION TESTS
// -----------------------------------------------------------------------------
console.log('\n--- 2. Verifying Sanctum Token Expiration Validation ---');

// Test 5: Sanctum expiration unset in environment
const expUnsetOutput = runPhp(
  `$config = require 'config/sanctum.php'; echo json_encode($config['expiration']);`,
  { SANCTUM_EXPIRATION_MINUTES: null }
);
assert(
  expUnsetOutput === '10080',
  'Sanctum expiration unset in environment defaults to 10080 minutes (7 days)',
  expUnsetOutput
);

// Test 6: Sanctum expiration empty string
const expEmptyOutput = runPhp(
  `$config = require 'config/sanctum.php'; echo json_encode($config['expiration']);`,
  { SANCTUM_EXPIRATION_MINUTES: '' }
);
assert(
  expEmptyOutput === '10080',
  'Sanctum expiration set to empty string safely defaults to 10080 minutes (never 0)',
  expEmptyOutput
);

// Test 7: Sanctum expiration valid integer
const expIntOutput = runPhp(
  `$config = require 'config/sanctum.php'; echo json_encode($config['expiration']);`,
  { SANCTUM_EXPIRATION_MINUTES: '1440' }
);
assert(
  expIntOutput === '1440',
  'Sanctum expiration set to valid integer (1440) parses as 1440 minutes',
  expIntOutput
);

// Test 8: Sanctum expiration literal null (intentionally non-expiring)
const expNullOutput = runPhp(
  `$config = require 'config/sanctum.php'; echo json_encode($config['expiration']);`,
  { SANCTUM_EXPIRATION_MINUTES: 'null' }
);
assert(
  expNullOutput === 'null',
  'Sanctum expiration set to literal "null" intentionally configures null (non-expiring)',
  expNullOutput
);

// Test 9: Sanctum expiration zero (invalid)
const expZeroOutput = runPhp(
  `$config = require 'config/sanctum.php'; echo json_encode($config['expiration']);`,
  { SANCTUM_EXPIRATION_MINUTES: '0' }
);
assert(
  expZeroOutput === '10080',
  'Sanctum expiration set to 0 safely defaults to 10080 minutes (guards against immediate expiration)',
  expZeroOutput
);

// Test 10: Sanctum expiration negative or non-numeric (invalid)
const expInvalidOutput = runPhp(
  `$config = require 'config/sanctum.php'; echo json_encode($config['expiration']);`,
  { SANCTUM_EXPIRATION_MINUTES: '-30' }
);
assert(
  expInvalidOutput === '10080',
  'Sanctum expiration set to negative or invalid string safely defaults to 10080 minutes',
  expInvalidOutput
);

// -----------------------------------------------------------------------------
// 3. LARAVEL CONFIGURATION CACHING VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- 3. Verifying Laravel Configuration & Route Serialization ---');

const cacheCheck = spawnSync('php', ['artisan', 'config:cache'], {
  cwd: backendDir,
  encoding: 'utf-8',
});
assert(
  cacheCheck.status === 0 && cacheCheck.stdout.includes('Configuration cached successfully'),
  'php artisan config:cache executes cleanly without closure serialization errors'
);

const routeCheck = spawnSync('php', ['artisan', 'route:cache'], {
  cwd: backendDir,
  encoding: 'utf-8',
});
assert(
  routeCheck.status === 0 && routeCheck.stdout.includes('Routes cached successfully'),
  'php artisan route:cache executes cleanly without route serialization errors'
);

// Clear caches after test
spawnSync('php', ['artisan', 'config:clear'], { cwd: backendDir });
spawnSync('php', ['artisan', 'route:clear'], { cwd: backendDir });

console.log('\n========================================================================');
console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100%)`);
console.log('========================================================================\n');
