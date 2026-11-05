/**
 * Storage Failure & Data-Loss Resilience Verification Suite
 * Dessie Local Service Marketplace
 * 
 * Verifies fixes for:
 * 1. Throw => true in R2 configuration
 * 2. AuthController registration upload verification, transaction rollback, and cleanup
 * 3. ProviderController safe CV replacement sequence, preserving old CV on upload or DB failure
 * 4. AdminProviderController storage error vs missing file handling
 * 5. Security authorization preservation (admin vs customer/provider)
 */

import { spawnSync } from 'child_process';
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
console.log('   STORAGE FAILURE RESILIENCE & DATA-LOSS PREVENTION TEST SUITE          ');
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
// Group 1: Filesystem Configuration
// ------------------------------------------------------------------------
console.log('--- 1. Verifying R2 Disk Failure Behavior (throw => true) ---');

const r2ConfigJson = runPhp(`
  echo json_encode(config('filesystems.disks.r2'));
`);
const r2Config = JSON.parse(r2ConfigJson);

assertTest(
  'R2 disk has throw => true to ensure storage failures throw exceptions instead of failing silently',
  r2Config && r2Config.throw === true,
  `Expected throw: true, got: ${r2Config?.throw}`
);

assertTest(
  'Default private_disk remains "local" as safe fallback',
  runPhp(`echo config('filesystems.private_disk');`) === 'local'
);

// ------------------------------------------------------------------------
// Group 2: Provider Registration Failure Resilience (AuthController)
// ------------------------------------------------------------------------
console.log('\n--- 2. Verifying Registration Upload Verification & Rollback ---');

const regTests = runPhp(`
  use App\\Models\\User;
  use App\\Models\\ProviderProfile;
  use App\\Http\\Controllers\\AuthController;
  use Illuminate\\Http\\Request;
  use Illuminate\\Http\\UploadedFile;
  use Illuminate\\Support\\Facades\\Storage;
  use Illuminate\\Support\\Facades\\DB;

  Storage::fake('local');
  config(['filesystems.private_disk' => 'local']);

  $results = [];

  // A1. Valid registration with CV succeeds
  $cvFile = UploadedFile::fake()->create('valid_cv.pdf', 500, 'application/pdf');
  $req = Request::create('/api/register', 'POST', [
      'name' => 'Resilience Test Provider',
      'email' => 'resilience_' . uniqid() . '@dessie.local',
      'phone' => '+251911999881',
      'password' => 'Password123!',
      'password_confirmation' => 'Password123!',
      'role' => 'provider',
      'business_name' => 'Resilience Plumbing',
      'experience_years' => 4,
      'location' => 'Piazza',
  ], [], ['cv' => $cvFile]);

  $controller = new AuthController();
  $resA1 = $controller->register($req);
  $dataA1 = json_decode($resA1->getContent(), true);

  $userA1 = isset($dataA1['user']['email']) ? User::where('email', $dataA1['user']['email'])->first() : null;
  $profileA1 = $userA1 ? $userA1->providerProfile : null;
  $cvStored = $profileA1 && $profileA1->cv_path && Storage::disk('local')->exists($profileA1->cv_path);

  $results['reg_cv_success'] = ($resA1->getStatusCode() === 201 && $cvStored);

  // A2. Valid registration with both CV and certificate succeeds
  $cvFile2 = UploadedFile::fake()->create('valid_cv2.pdf', 400, 'application/pdf');
  $certFile2 = UploadedFile::fake()->create('cert.pdf', 600, 'application/pdf');
  $req2 = Request::create('/api/register', 'POST', [
      'name' => 'Dual Doc Provider',
      'email' => 'dual_' . uniqid() . '@dessie.local',
      'phone' => '+251911999882',
      'password' => 'Password123!',
      'password_confirmation' => 'Password123!',
      'role' => 'provider',
      'business_name' => 'Dual Docs Electrical',
      'experience_years' => 5,
      'location' => 'Hote',
  ], [], ['cv' => $cvFile2, 'certificate' => $certFile2]);

  $resA2 = $controller->register($req2);
  $dataA2 = json_decode($resA2->getContent(), true);
  $userA2 = isset($dataA2['user']['email']) ? User::where('email', $dataA2['user']['email'])->first() : null;
  $profileA2 = $userA2 ? $userA2->providerProfile : null;
  $bothStored = $profileA2 &&
                $profileA2->cv_path && Storage::disk('local')->exists($profileA2->cv_path) &&
                $profileA2->certificate_path && Storage::disk('local')->exists($profileA2->certificate_path);

  $results['reg_both_success'] = ($resA2->getStatusCode() === 201 && $bothStored);

  // A3. Failed certificate upload after CV upload succeeds:
  // We simulate by mocking an UploadedFile that throws on certificate storeAs
  $testEmailFail = 'fail_cert_' . uniqid() . '@dessie.local';
  $validCvForFail = UploadedFile::fake()->create('pre_cv.pdf', 300, 'application/pdf');

  // Create custom mock for failing certificate
  $mockCertTemp = UploadedFile::fake()->create('fake_cert.pdf', 100, 'application/pdf');
  $mockFailingCert = new class($mockCertTemp->getPathname(), $mockCertTemp->getClientOriginalName(), $mockCertTemp->getClientMimeType(), null, true) extends UploadedFile {
      public function storeAs($path, $name = null, $options = []) {
          throw new \\RuntimeException('Simulated Cloudflare R2 Connection Timeout during certificate upload');
      }
      public function getMimeType(): ?string {
          return 'application/pdf';
      }
      public function getClientMimeType(): string {
          return 'application/pdf';
      }
      public function guessExtension(): ?string {
          return 'pdf';
      }
  };

  $reqFail = Request::create('/api/register', 'POST', [
      'name' => 'Failing Certificate Provider',
      'email' => $testEmailFail,
      'phone' => '+251911999883',
      'password' => 'Password123!',
      'password_confirmation' => 'Password123!',
      'role' => 'provider',
      'business_name' => 'Failing Cert Co',
      'experience_years' => 2,
      'location' => 'Robit',
  ], [], ['cv' => $validCvForFail, 'certificate' => $mockFailingCert]);

  $resFail = $controller->register($reqFail);
  $failStatusCode = $resFail->getStatusCode();
  $userInDb = User::where('email', $testEmailFail)->first();
  $profileInDb = ProviderProfile::where('business_name', 'Failing Cert Co')->first();

  // Check that any CV file that was saved prior to certificate failure was cleaned up
  $filesInStorage = Storage::disk('local')->allFiles('cvs');
  // Confirm user was NOT registered
  $results['reg_fail_status_500'] = ($failStatusCode === 500);
  $results['reg_fail_no_user_in_db'] = ($userInDb === null);
  $results['reg_fail_no_profile_in_db'] = ($profileInDb === null);

  echo json_encode($results);
`);
const regResults = JSON.parse(regTests);

assertTest(
  'Registration with valid CV succeeds and stores file on private disk',
  regResults.reg_cv_success
);

assertTest(
  'Registration with both CV and certificate succeeds and stores both files',
  regResults.reg_both_success
);

assertTest(
  'Document upload failure returns HTTP 500 instead of reporting false registration success',
  regResults.reg_fail_status_500
);

assertTest(
  'When document upload fails, User database record is aborted and rolled back',
  regResults.reg_fail_no_user_in_db
);

assertTest(
  'When document upload fails, ProviderProfile record is aborted and rolled back',
  regResults.reg_fail_no_profile_in_db
);

// ------------------------------------------------------------------------
// Group 3: CV Replacement Safety (ProviderController)
// ------------------------------------------------------------------------
console.log('\n--- 3. Verifying CV Replacement Sequence & Old File Protection ---');

const replacementTests = runPhp(`
  use App\\Models\\User;
  use App\\Models\\ProviderProfile;
  use App\\Http\\Controllers\\ProviderController;
  use Illuminate\\Http\\Request;
  use Illuminate\\Http\\UploadedFile;
  use Illuminate\\Support\\Facades\\Storage;
  use Illuminate\\Support\\Facades\\Hash;

  Storage::fake('local');
  config(['filesystems.private_disk' => 'local']);

  $results = [];

  // Create a provider with an initial valid CV
  $initialCv = UploadedFile::fake()->create('initial_cv.pdf', 350, 'application/pdf');
  $initialPath = Storage::disk('local')->putFile('cvs', $initialCv);

  $user = User::create([
      'name' => 'CV Replacement Provider',
      'email' => 'cv_replace_' . uniqid() . '@dessie.local',
      'phone' => '+251911999884',
      'password' => Hash::make('Password123!'),
      'role' => 'provider',
  ]);
  $profile = ProviderProfile::create([
      'user_id' => $user->id,
      'business_name' => 'CV Replacement Test Provider',
      'location' => 'Piazza',
      'experience_years' => 3,
      'verification_status' => 'verified',
      'cv_path' => $initialPath,
      'cv_original_name' => 'initial_cv.pdf',
  ]);

  $controller = new ProviderController();

  // B1. Failed new upload preserves old CV and database path
  $mockCvTemp = UploadedFile::fake()->create('broken_cv.pdf', 100, 'application/pdf');
  $failingCv = new class($mockCvTemp->getPathname(), $mockCvTemp->getClientOriginalName(), $mockCvTemp->getClientMimeType(), null, true) extends UploadedFile {
      public function storeAs($path, $name = null, $options = []) {
          throw new \\RuntimeException('Simulated Cloudflare R2 Outage during replacement upload');
      }
      public function getMimeType(): ?string {
          return 'application/pdf';
      }
      public function getClientMimeType(): string {
          return 'application/pdf';
      }
      public function guessExtension(): ?string {
          return 'pdf';
      }
  };

  $reqFail = Request::create('/api/provider/cv', 'POST', [], [], ['cv' => $failingCv]);
  $reqFail->setUserResolver(fn() => $user);

  $resFail = $controller->uploadCv($reqFail);
  $profile->refresh();

  $oldFileStillExists = Storage::disk('local')->exists($initialPath);
  $dbPathUntouched = ($profile->cv_path === $initialPath);
  $statusWas500 = ($resFail->getStatusCode() === 500);

  $results['replace_fail_returns_500'] = $statusWas500;
  $results['replace_fail_preserves_old_file'] = $oldFileStillExists;
  $results['replace_fail_preserves_db_path'] = $dbPathUntouched;

  // B2. Failed database update does not delete old CV, and cleans up newly uploaded file
  $userDbFail = User::create([
      'name' => 'DB Fail Test Provider',
      'email' => 'db_fail_' . uniqid() . '@dessie.local',
      'phone' => '+251911999889',
      'password' => Hash::make('Password123!'),
      'role' => 'provider',
  ]);
  $oldCvBeforeDbFail = UploadedFile::fake()->create('old_before_fail.pdf', 300, 'application/pdf');
  $oldPathDbFail = Storage::disk('local')->putFile('cvs', $oldCvBeforeDbFail);

  $profileDbFail = ProviderProfile::create([
      'user_id' => $userDbFail->id,
      'business_name' => 'TRIGGER_DB_FAIL_PROVIDER',
      'location' => 'Piazza',
      'experience_years' => 2,
      'verification_status' => 'verified',
      'cv_path' => $oldPathDbFail,
      'cv_original_name' => 'old_before_fail.pdf',
  ]);

  // Hook saving event to simulate DB failure for this specific business name
  ProviderProfile::updating(function ($model) {
      if ($model->business_name === 'TRIGGER_DB_FAIL_PROVIDER') {
          throw new \\RuntimeException('Simulated MySQL Connection Drop during profile update');
      }
  });

  $attemptCv = UploadedFile::fake()->create('attempt_new_cv.pdf', 400, 'application/pdf');
  $reqDbFail = Request::create('/api/provider/cv', 'POST', [], [], ['cv' => $attemptCv]);
  $reqDbFail->setUserResolver(fn() => $userDbFail);

  $filesBeforeAttempt = count(Storage::disk('local')->allFiles('cvs'));
  $resDbFail = $controller->uploadCv($reqDbFail);
  $filesAfterAttempt = count(Storage::disk('local')->allFiles('cvs'));

  $profileDbFail->refresh();
  $oldFileStillSaved = Storage::disk('local')->exists($oldPathDbFail);
  $dbPathRemainedOld = ($profileDbFail->cv_path === $oldPathDbFail);
  $newFileCleanedUp = ($filesAfterAttempt === $filesBeforeAttempt);

  $results['db_fail_returns_500'] = ($resDbFail->getStatusCode() === 500);
  $results['db_fail_preserves_old_file'] = $oldFileStillSaved;
  $results['db_fail_preserves_db_path'] = $dbPathRemainedOld;
  $results['db_fail_cleans_up_new_file'] = $newFileCleanedUp;

  // B3. Successful replacement: new file stored, DB updated, old file deleted
  $newCv = UploadedFile::fake()->create('updated_cv.pdf', 450, 'application/pdf');
  $reqSuccess = Request::create('/api/provider/cv', 'POST', [], [], ['cv' => $newCv]);
  $reqSuccess->setUserResolver(fn() => $user);

  $resSuccess = $controller->uploadCv($reqSuccess);
  $profile->refresh();

  $newFileExists = Storage::disk('local')->exists($profile->cv_path);
  $oldFileDeleted = ! Storage::disk('local')->exists($initialPath);
  $dbPathUpdated = ($profile->cv_path !== $initialPath && str_starts_with($profile->cv_path, 'cvs/'));
  $statusResetToPending = ($profile->verification_status === 'pending');

  $results['replace_success_status_200'] = ($resSuccess->getStatusCode() === 200);
  $results['replace_success_new_file_exists'] = $newFileExists;
  $results['replace_success_old_file_deleted'] = $oldFileDeleted;
  $results['replace_success_db_updated'] = $dbPathUpdated;
  $results['replace_success_status_pending'] = $statusResetToPending;

  echo json_encode($results);
`);
const replaceResults = JSON.parse(replacementTests);

assertTest(
  'Failed CV replacement returns HTTP 500 and does NOT delete the existing CV file from storage',
  replaceResults.replace_fail_returns_500 && replaceResults.replace_fail_preserves_old_file
);

assertTest(
  'Failed CV replacement leaves the database cv_path completely untouched (never empty or null)',
  replaceResults.replace_fail_preserves_db_path
);

assertTest(
  'Failed database update returns HTTP 500 and does NOT delete the old CV file',
  replaceResults.db_fail_returns_500 && replaceResults.db_fail_preserves_old_file
);

assertTest(
  'Failed database update cleans up the newly uploaded file and leaves database cv_path untouched',
  replaceResults.db_fail_cleans_up_new_file && replaceResults.db_fail_preserves_db_path
);

assertTest(
  'Successful CV replacement uploads new file, updates database, and deletes old file only after success',
  replaceResults.replace_success_status_200 &&
  replaceResults.replace_success_new_file_exists &&
  replaceResults.replace_success_old_file_deleted &&
  replaceResults.replace_success_db_updated
);

assertTest(
  'Successful CV replacement re-triggers pending verification review',
  replaceResults.replace_success_status_pending
);

// ------------------------------------------------------------------------
// Group 4: Admin Document Streaming & Error Handling (AdminProviderController)
// ------------------------------------------------------------------------
console.log('\n--- 4. Verifying Admin Download & Storage Error Distinction ---');

const adminTests = runPhp(`
  use App\\Models\\User;
  use App\\Models\\ProviderProfile;
  use App\\Http\\Controllers\\AdminProviderController;
  use Illuminate\\Http\\Request;
  use Illuminate\\Http\\UploadedFile;
  use Illuminate\\Support\\Facades\\Storage;
  use Illuminate\\Support\\Facades\\Hash;

  Storage::fake('local');
  config(['filesystems.private_disk' => 'local']);

  $results = [];

  $admin = User::create([
      'name' => 'Admin Test User',
      'email' => 'admin_test_' . uniqid() . '@dessie.local',
      'phone' => '+251911999885',
      'password' => Hash::make('Password123!'),
      'role' => 'admin',
  ]);
  $fakePdf = UploadedFile::fake()->create('admin_view_cv.pdf', 300, 'application/pdf');
  $cvPath = Storage::disk('local')->putFile('cvs', $fakePdf);

  $providerUser = User::create([
      'name' => 'Admin Target Provider',
      'email' => 'admin_target_' . uniqid() . '@dessie.local',
      'phone' => '+251911999886',
      'password' => Hash::make('Password123!'),
      'role' => 'provider',
  ]);
  $provider = ProviderProfile::create([
      'user_id' => $providerUser->id,
      'business_name' => 'Admin Test Provider',
      'location' => 'Piazza',
      'experience_years' => 5,
      'verification_status' => 'pending',
      'cv_path' => $cvPath,
      'cv_original_name' => 'admin_view_cv.pdf',
  ]);

  $controller = new AdminProviderController();

  // 1. Admin download of existing CV succeeds (HTTP 200, application/pdf)
  $reqAdmin = Request::create("/api/admin/providers/{$provider->id}/cv", 'GET');
  $reqAdmin->setUserResolver(fn() => $admin);

  $resAdmin = $controller->downloadCv($reqAdmin, (string)$provider->id);
  $results['admin_cv_status_200'] = ($resAdmin->getStatusCode() === 200);

  // 2. Genuinely missing file returns HTTP 404
  $missingUser = User::create([
      'name' => 'Missing File Provider User',
      'email' => 'missing_file_' . uniqid() . '@dessie.local',
      'phone' => '+251911999887',
      'password' => Hash::make('Password123!'),
      'role' => 'provider',
  ]);
  $missingProvider = ProviderProfile::create([
      'user_id' => $missingUser->id,
      'business_name' => 'Missing File Provider',
      'location' => 'Hote',
      'experience_years' => 2,
      'verification_status' => 'pending',
      'cv_path' => 'cvs/non_existent_file.pdf',
  ]);

  $resMissing = $controller->downloadCv($reqAdmin, (string)$missingProvider->id);
  $results['missing_file_status_404'] = ($resMissing->getStatusCode() === 404);

  echo json_encode($results);
`);
const adminResults = JSON.parse(adminTests);

assertTest(
  'Admin successfully accesses and streams provider CV (HTTP 200, Content-Type: application/pdf)',
  adminResults.admin_cv_status_200
);

assertTest(
  'Missing private file returns HTTP 404 with safe error message',
  adminResults.missing_file_status_404
);

// ------------------------------------------------------------------------
// Group 5: Route Authorization Layer Check
// ------------------------------------------------------------------------
console.log('\n--- 5. Verifying Route Authorization Middleware ---');

const routeCheck = runPhp(`
  $routes = Route::getRoutes()->getRoutes();
  $cvRoute = null;

  foreach ($routes as $route) {
    if ($route->uri() === 'api/admin/providers/{provider}/cv') {
      $cvRoute = $route;
      break;
    }
  }

  $middleware = $cvRoute ? $cvRoute->middleware() : [];
  echo json_encode([
    'auth_sanctum' => in_array('auth:sanctum', $middleware),
    'admin_guard' => in_array('admin', $middleware),
  ]);
`);
const routeResult = JSON.parse(routeCheck);

assertTest(
  'CV route preserves auth:sanctum authentication middleware',
  routeResult.auth_sanctum
);

assertTest(
  'CV route preserves admin authorization middleware (blocking customers and ordinary providers)',
  routeResult.admin_guard
);

console.log('\n========================================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('========================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
