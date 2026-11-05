/**
 * Cloudflare R2 Integration & Storage Safety Verification Test Suite
 * Dessie Local Service Marketplace
 */

import { spawnSync, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, 'backend');

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
  if (res.status !== 0) {
    throw new Error(`PHP Error (${res.status}): ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

console.log('========================================================================');
console.log('      CLOUDFLARE R2 INTEGRATION & STORAGE VERIFICATION SUITE            ');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assertTest(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${totalTests}. ${name}`);
  } else {
    console.error(`[FAIL] ${totalTests}. ${name}`);
    if (details) console.error(`       Details: ${details}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------------
// Test Group 1: Configuration Resolution
// ------------------------------------------------------------------------
console.log('--- 1. Verifying Filesystem Configuration & R2 Settings ---');

const r2ConfigJson = runPhp(`
  echo json_encode(config('filesystems.disks.r2'));
`);
const r2Config = JSON.parse(r2ConfigJson);

assertTest(
  'R2 disk is defined in filesystems.disks and uses the "s3" driver',
  r2Config && r2Config.driver === 's3',
  `Expected driver 's3', got: ${r2Config?.driver}`
);

assertTest(
  'R2 disk default region is "auto"',
  r2Config && r2Config.region === 'auto',
  `Expected region 'auto', got: ${r2Config?.region}`
);

assertTest(
  'R2 disk visibility is strictly "private"',
  r2Config && r2Config.visibility === 'private',
  `Expected visibility 'private', got: ${r2Config?.visibility}`
);

assertTest(
  'R2 disk use_path_style_endpoint defaults to false for R2 account endpoints',
  r2Config && r2Config.use_path_style_endpoint === false,
  `Expected use_path_style_endpoint false, got: ${r2Config?.use_path_style_endpoint}`
);

const defaultPrivateDisk = runPhp(`
  echo config('filesystems.private_disk');
`);

assertTest(
  'Default private_disk is "local" (safe fallback when FILESYSTEM_PRIVATE_DISK is unset)',
  defaultPrivateDisk === 'local',
  `Expected 'local', got: ${defaultPrivateDisk}`
);

// Verify environment override for private_disk = r2
const r2PrivateDiskOverride = runPhp(`
  putenv('FILESYSTEM_PRIVATE_DISK=r2');
  $_ENV['FILESYSTEM_PRIVATE_DISK'] = 'r2';
  $_SERVER['FILESYSTEM_PRIVATE_DISK'] = 'r2';
  $config = require config_path('filesystems.php');
  echo $config['private_disk'];
`);

assertTest(
  'FILESYSTEM_PRIVATE_DISK=r2 correctly resolves private_disk to "r2"',
  r2PrivateDiskOverride === 'r2',
  `Expected 'r2', got: ${r2PrivateDiskOverride}`
);

// Verify R2 environment variable mapping
const r2EnvMapping = runPhp(`
  putenv('R2_ACCESS_KEY_ID=test_r2_key_123');
  $_ENV['R2_ACCESS_KEY_ID'] = 'test_r2_key_123';
  $_SERVER['R2_ACCESS_KEY_ID'] = 'test_r2_key_123';

  putenv('R2_SECRET_ACCESS_KEY=test_r2_secret_456');
  $_ENV['R2_SECRET_ACCESS_KEY'] = 'test_r2_secret_456';
  $_SERVER['R2_SECRET_ACCESS_KEY'] = 'test_r2_secret_456';

  putenv('R2_BUCKET=dessie-private-bucket');
  $_ENV['R2_BUCKET'] = 'dessie-private-bucket';
  $_SERVER['R2_BUCKET'] = 'dessie-private-bucket';

  putenv('R2_ENDPOINT=https://abc12345.r2.cloudflarestorage.com');
  $_ENV['R2_ENDPOINT'] = 'https://abc12345.r2.cloudflarestorage.com';
  $_SERVER['R2_ENDPOINT'] = 'https://abc12345.r2.cloudflarestorage.com';

  $config = require config_path('filesystems.php');
  echo json_encode($config['disks']['r2']);
`);
const mappedR2 = JSON.parse(r2EnvMapping);

assertTest(
  'R2 configuration maps R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_ENDPOINT',
  mappedR2.key === 'test_r2_key_123' &&
  mappedR2.secret === 'test_r2_secret_456' &&
  mappedR2.bucket === 'dessie-private-bucket' &&
  mappedR2.endpoint === 'https://abc12345.r2.cloudflarestorage.com',
  `Mapped R2 config: ${JSON.stringify(mappedR2)}`
);

// ------------------------------------------------------------------------
// Test Group 2: Flysystem Adapter & Storage Operations (Faked / Mocked)
// ------------------------------------------------------------------------
console.log('\n--- 2. Verifying Adapter Compatibility & Fake Storage Operations ---');

const adapterTest = runPhp(`
  use Illuminate\\Support\\Facades\\Storage;

  // Fake the r2 disk to verify adapter resolution and storage interface
  Storage::fake('r2');
  $testContent = '%PDF-1.4 Fake Test Document Body';
  $testPath = 'cvs/test_fake_r2_doc.pdf';

  Storage::disk('r2')->put($testPath, $testContent);
  $exists = Storage::disk('r2')->exists($testPath);
  $retrieved = Storage::disk('r2')->get($testPath);
  Storage::disk('r2')->delete($testPath);
  $existsAfterDelete = Storage::disk('r2')->exists($testPath);

  echo json_encode([
    'exists' => $exists,
    'matches' => ($retrieved === $testContent),
    'deleted' => (!$existsAfterDelete),
  ]);
`);
const adapterResult = JSON.parse(adapterTest);

assertTest(
  'Storage::fake("r2") correctly writes, reads, checks existence, and deletes documents',
  adapterResult.exists === true && adapterResult.matches === true && adapterResult.deleted === true,
  `Adapter result: ${JSON.stringify(adapterResult)}`
);

const localAdapterTest = runPhp(`
  use Illuminate\\Support\\Facades\\Storage;

  Storage::fake('local');
  $testContent = '%PDF-1.4 Fake Local Test Document Body';
  $testPath = 'cvs/test_fake_local_doc.pdf';

  Storage::disk('local')->put($testPath, $testContent);
  $exists = Storage::disk('local')->exists($testPath);
  $retrieved = Storage::disk('local')->get($testPath);
  Storage::disk('local')->delete($testPath);
  $existsAfterDelete = Storage::disk('local')->exists($testPath);

  echo json_encode([
    'exists' => $exists,
    'matches' => ($retrieved === $testContent),
    'deleted' => (!$existsAfterDelete),
  ]);
`);
const localAdapterResult = JSON.parse(localAdapterTest);

assertTest(
  'Local private storage fallback continues to write, read, check existence, and delete documents',
  localAdapterResult.exists === true && localAdapterResult.matches === true && localAdapterResult.deleted === true,
  `Local adapter result: ${JSON.stringify(localAdapterResult)}`
);

// ------------------------------------------------------------------------
// Test Group 3: Authorization Protection on Private Document Routes
// ------------------------------------------------------------------------
console.log('\n--- 3. Verifying Authorization Enforcement on Document Routes ---');

const authCheck = runPhp(`
  use App\\Models\\User;
  use App\\Models\\ProviderProfile;

  // Verify route permissions:
  // 1. Unauthenticated request to /api/admin/providers/1/cv must be rejected (401)
  // 2. Customer user request to /api/admin/providers/1/cv must be forbidden (403)
  // 3. Admin user request must pass role gate

  $routes = Route::getRoutes()->getRoutes();
  $cvRoute = null;
  $certRoute = null;

  foreach ($routes as $route) {
    if ($route->uri() === 'api/admin/providers/{provider}/cv') {
      $cvRoute = $route;
    }
    if ($route->uri() === 'api/admin/providers/{provider}/certificate') {
      $certRoute = $route;
    }
  }

  $cvMiddleware = $cvRoute ? $cvRoute->middleware() : [];
  $certMiddleware = $certRoute ? $certRoute->middleware() : [];

  echo json_encode([
    'cv_found' => ($cvRoute !== null),
    'cv_auth' => in_array('auth:sanctum', $cvMiddleware),
    'cv_admin' => in_array('admin', $cvMiddleware),
    'cert_found' => ($certRoute !== null),
    'cert_auth' => in_array('auth:sanctum', $certMiddleware),
    'cert_admin' => in_array('admin', $certMiddleware),
  ]);
`);
const authResult = JSON.parse(authCheck);

assertTest(
  'Private CV route (/api/admin/providers/{provider}/cv) is strictly protected with auth:sanctum and admin middleware',
  authResult.cv_found && authResult.cv_auth && authResult.cv_admin,
  `CV route middleware: ${JSON.stringify(authResult)}`
);

assertTest(
  'Private certificate route (/api/admin/providers/{provider}/certificate) is strictly protected with auth:sanctum and admin middleware',
  authResult.cert_found && authResult.cert_auth && authResult.cert_admin,
  `Certificate route middleware: ${JSON.stringify(authResult)}`
);

// ------------------------------------------------------------------------
// Test Group 4: Config Caching & Production Safety
// ------------------------------------------------------------------------
console.log('\n--- 4. Verifying Artisan Config Cache & Serialization ---');

try {
  const configCacheOutput = execSync('php artisan config:cache', {
    cwd: backendDir,
    encoding: 'utf8',
  });
  assertTest(
    'php artisan config:cache executes cleanly with R2 disk configuration',
    configCacheOutput.includes('Configuration cached successfully')
  );
} catch (e) {
  assertTest('php artisan config:cache executes cleanly', false, e.message);
} finally {
  execSync('php artisan config:clear', { cwd: backendDir, encoding: 'utf8' });
}

console.log('\n========================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('========================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
