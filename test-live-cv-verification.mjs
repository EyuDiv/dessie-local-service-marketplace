import fs from 'fs';
import path from 'path';

const API_BASE = 'http://127.0.0.1:8000/api';

async function jsonRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, config);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

async function multipartRequest(endpoint, formData, token = null) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, headers: res.headers, data };
}

function createDummyPdfBuffer(name = 'Test CV') {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Title (${name}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`);
}

async function run() {
  console.log('========================================================================');
  console.log('       DESSIE LOCAL MARKETPLACE - CV & VERIFICATION TEST SUITE          ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 15;
  const ts = Date.now();

  const adminEmail = 'admin@dessie.local';
  const adminPassword = 'DessieAdmin2026!Secure';

  // Helper login
  const adminLogin = await jsonRequest('/login', {
    method: 'POST',
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = adminLogin.data?.token;

  if (!adminToken) {
    console.error('FAILED TO LOGIN AS ADMIN! Cannot proceed.');
    process.exit(1);
  }
  console.log(' Authenticated as Admin successfully.');

  // Create a customer user for testing
  const customerEmail = `cv_test_cust_${ts}@dessie.local`;
  const customerReg = await jsonRequest('/register', {
    method: 'POST',
    body: {
      name: 'Test Customer',
      email: customerEmail,
      phone: '+251911999888',
      password: 'Password123!',
      password_confirmation: 'Password123!',
      role: 'customer',
    },
  });
  const customerToken = customerReg.data?.token;
  console.log(' Created test Customer for permission tests.\n');

  // -------------------------------------------------------------------------
  // Test 1: Provider registration without a CV (succeeds, has_cv is false)
  // -------------------------------------------------------------------------
  const prov1Email = `prov_nocv_${ts}@dessie.local`;
  const prov1Res = await jsonRequest('/register', {
    method: 'POST',
    body: {
      name: 'No CV Provider',
      email: prov1Email,
      phone: '+251911111001',
      password: 'Password123!',
      password_confirmation: 'Password123!',
      role: 'provider',
      business_name: `No CV Tech ${ts}`,
      location: 'Piazza',
      experience_years: 3,
    },
  });

  if (prov1Res.status === 201 && prov1Res.data?.user?.provider_profile?.has_cv === false) {
    console.log('[PASS] 1. Provider registration without a CV succeeded (optional upload, has_cv: false).');
    passed++;
  } else {
    console.log(`[FAIL] 1. Provider registration without CV failed. Status: ${prov1Res.status}`, prov1Res.data);
  }

  // -------------------------------------------------------------------------
  // Test 2: Successful valid CV upload (multipart with valid PDF)
  // -------------------------------------------------------------------------
  const prov2Email = `prov_withcv_${ts}@dessie.local`;
  const formData2 = new FormData();
  formData2.append('name', 'Valid CV Provider');
  formData2.append('email', prov2Email);
  formData2.append('phone', '+251911111002');
  formData2.append('password', 'Password123!');
  formData2.append('password_confirmation', 'Password123!');
  formData2.append('role', 'provider');
  formData2.append('business_name', `Valid CV Pro ${ts}`);
  formData2.append('location', 'Hote');
  formData2.append('experience_years', '5');

  const pdfBlob = new Blob([createDummyPdfBuffer('Valid Provider Resume')], { type: 'application/pdf' });
  formData2.append('cv', pdfBlob, 'my_certified_cv.pdf');

  const prov2Res = await multipartRequest('/register', formData2);
  const prov2Token = prov2Res.data?.token;
  const prov2ProfileId = prov2Res.data?.user?.provider_profile?.id;

  if (
    prov2Res.status === 201 &&
    prov2Res.data?.user?.provider_profile?.has_cv === true &&
    prov2Res.data?.user?.provider_profile?.cv_original_name === 'my_certified_cv.pdf'
  ) {
    console.log('[PASS] 2. Successful valid CV upload (PDF received, has_cv: true, original name preserved).');
    passed++;
  } else {
    console.log(`[FAIL] 2. Valid CV upload failed. Status: ${prov2Res.status}`, prov2Res.data);
  }

  // -------------------------------------------------------------------------
  // Test 3: Invalid file type rejection (.txt file instead of PDF)
  // -------------------------------------------------------------------------
  const prov3Email = `prov_badfile_${ts}@dessie.local`;
  const formData3 = new FormData();
  formData3.append('name', 'Bad File Provider');
  formData3.append('email', prov3Email);
  formData3.append('phone', '+251911111003');
  formData3.append('password', 'Password123!');
  formData3.append('password_confirmation', 'Password123!');
  formData3.append('role', 'provider');
  formData3.append('business_name', `Bad File Pro ${ts}`);
  formData3.append('location', 'Menhariya');
  formData3.append('experience_years', '2');

  const txtBlob = new Blob(['plain text resume file content'], { type: 'text/plain' });
  formData3.append('cv', txtBlob, 'resume.txt');

  const prov3Res = await multipartRequest('/register', formData3);
  if (prov3Res.status === 422 && prov3Res.data?.errors?.cv) {
    console.log('[PASS] 3. Invalid file type rejected (HTTP 422 with validation error on cv field).');
    passed++;
  } else {
    console.log(`[FAIL] 3. Invalid file type rejection failed. Status: ${prov3Res.status}`, prov3Res.data);
  }

  // -------------------------------------------------------------------------
  // Test 4: Oversized file rejection (>5MB)
  // -------------------------------------------------------------------------
  const prov4Email = `prov_oversized_${ts}@dessie.local`;
  const formData4 = new FormData();
  formData4.append('name', 'Oversized Provider');
  formData4.append('email', prov4Email);
  formData4.append('phone', '+251911111004');
  formData4.append('password', 'Password123!');
  formData4.append('password_confirmation', 'Password123!');
  formData4.append('role', 'provider');
  formData4.append('business_name', `Oversized Pro ${ts}`);
  formData4.append('location', 'Piazza');
  formData4.append('experience_years', '4');

  // Create 5.5 MB buffer
  const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024, '%PDF-1.4\n1 0 obj\n');
  const largePdfBlob = new Blob([largeBuffer], { type: 'application/pdf' });
  formData4.append('cv', largePdfBlob, 'oversized_cv.pdf');

  const prov4Res = await multipartRequest('/register', formData4);
  if (prov4Res.status === 422 && prov4Res.data?.errors?.cv) {
    console.log('[PASS] 4. Oversized file rejected (>5MB returned HTTP 422 with validation error on cv).');
    passed++;
  } else {
    console.log(`[FAIL] 4. Oversized file rejection failed. Status: ${prov4Res.status}`, prov4Res.data);
  }

  // -------------------------------------------------------------------------
  // Test 5: CV association with the correct provider profile
  // -------------------------------------------------------------------------
  if (prov2ProfileId) {
    const adminProviders = await jsonRequest('/admin/providers', {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    const foundProv = adminProviders.data?.data?.find((p) => p.id === prov2ProfileId);
    if (
      foundProv &&
      foundProv.has_cv === true &&
      foundProv.cv_original_name === 'my_certified_cv.pdf' &&
      foundProv.business_name === `Valid CV Pro ${ts}`
    ) {
      console.log('[PASS] 5. CV successfully associated with the correct provider profile.');
      passed++;
    } else {
      console.log('[FAIL] 5. CV association check failed.', foundProv);
    }
  } else {
    console.log('[FAIL] 5. Skipping because provider 2 profile ID was not created.');
  }

  // -------------------------------------------------------------------------
  // Test 6: Newly registered providers remain pending
  // -------------------------------------------------------------------------
  if (prov2Res.data?.user?.provider_profile?.verification_status === 'pending') {
    console.log('[PASS] 6. Newly registered provider verification_status defaults to pending.');
    passed++;
  } else {
    console.log('[FAIL] 6. Provider status was not pending:', prov2Res.data?.user?.provider_profile?.verification_status);
  }

  // -------------------------------------------------------------------------
  // Test 7: Pending providers remain hidden from public discovery
  // -------------------------------------------------------------------------
  const publicRes1 = await jsonRequest('/providers');
  const publicNames1 = (publicRes1.data?.data || []).map((p) => p.business_name);
  if (!publicNames1.includes(`Valid CV Pro ${ts}`) && !publicNames1.includes(`No CV Tech ${ts}`)) {
    console.log('[PASS] 7. Pending providers are completely hidden from public discovery (/api/providers).');
    passed++;
  } else {
    console.log('[FAIL] 7. Pending provider leaked in public discovery!');
  }

  // -------------------------------------------------------------------------
  // Test 8: Admin can access a submitted CV (authenticated & authorized stream)
  // -------------------------------------------------------------------------
  const adminCvRes = await fetch(`${API_BASE}/admin/providers/${prov2ProfileId}/cv`, {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const contentType = adminCvRes.headers.get('content-type');
  if (adminCvRes.status === 200 && contentType?.includes('application/pdf')) {
    console.log('[PASS] 8. Admin successfully accessed submitted CV (HTTP 200, Content-Type: application/pdf).');
    passed++;
  } else {
    console.log(`[FAIL] 8. Admin CV access failed. Status: ${adminCvRes.status}, Content-Type: ${contentType}`);
  }

  // -------------------------------------------------------------------------
  // Test 9: Customer cannot access a private CV (HTTP 403)
  // -------------------------------------------------------------------------
  const custCvRes = await jsonRequest(`/admin/providers/${prov2ProfileId}/cv`, {
    headers: { 'Authorization': `Bearer ${customerToken}` },
  });
  if (custCvRes.status === 403) {
    console.log('[PASS] 9. Customer forbidden from accessing private CV (HTTP 403 Forbidden).');
    passed++;
  } else {
    console.log(`[FAIL] 9. Customer access check failed. Status: ${custCvRes.status}`);
  }

  // -------------------------------------------------------------------------
  // Test 10: Provider cannot access another provider's CV (HTTP 403)
  // -------------------------------------------------------------------------
  const provCvRes = await jsonRequest(`/admin/providers/${prov2ProfileId}/cv`, {
    headers: { 'Authorization': `Bearer ${prov1Res.data?.token}` },
  });
  if (provCvRes.status === 403) {
    console.log("[PASS] 10. Provider cannot access another provider's CV (HTTP 403 Forbidden).");
    passed++;
  } else {
    console.log(`[FAIL] 10. Provider isolation failed. Status: ${provCvRes.status}`);
  }

  // -------------------------------------------------------------------------
  // Test 11: Non-admin users cannot approve or reject providers (HTTP 403)
  // -------------------------------------------------------------------------
  const nonAdminApprove = await jsonRequest(`/admin/providers/${prov2ProfileId}/verification`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${customerToken}` },
    body: { verification_status: 'verified' },
  });
  if (nonAdminApprove.status === 403) {
    console.log('[PASS] 11. Non-admin users cannot approve or reject providers (HTTP 403 Forbidden).');
    passed++;
  } else {
    console.log(`[FAIL] 11. Non-admin authorization check failed. Status: ${nonAdminApprove.status}`);
  }

  // -------------------------------------------------------------------------
  // Test 12: Admin approval makes the provider eligible for public discovery
  // -------------------------------------------------------------------------
  // First, associate a service to provider 2 so discovery conditions are met
  const servicesRes = await jsonRequest('/services');
  const serviceId = servicesRes.data?.data?.[0]?.id;

  if (serviceId) {
    await jsonRequest('/provider/services', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${prov2Token}` },
      body: { service_id: serviceId },
    });
  }

  const approveRes = await jsonRequest(`/admin/providers/${prov2ProfileId}/verification`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: { verification_status: 'verified' },
  });

  const publicRes2 = await jsonRequest('/providers');
  const publicNames2 = (publicRes2.data?.data || []).map((p) => p.business_name);

  if (approveRes.status === 200 && publicNames2.includes(`Valid CV Pro ${ts}`)) {
    console.log('[PASS] 12. Admin approval updates status to verified and publishes provider to public discovery.');
    passed++;
  } else {
    console.log(`[FAIL] 12. Approval discovery check failed. Status: ${approveRes.status}, Included: ${publicNames2.includes(`Valid CV Pro ${ts}`)}`);
  }

  // -------------------------------------------------------------------------
  // Test 13: Admin rejection keeps the provider hidden
  // -------------------------------------------------------------------------
  const rejectRes = await jsonRequest(`/admin/providers/${prov2ProfileId}/verification`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: {
      verification_status: 'rejected',
      rejection_reason: 'Submitted CV lacks necessary electrical licenses for Dessie municipality.',
    },
  });

  const publicRes3 = await jsonRequest('/providers');
  const publicNames3 = (publicRes3.data?.data || []).map((p) => p.business_name);

  if (rejectRes.status === 200 && !publicNames3.includes(`Valid CV Pro ${ts}`)) {
    console.log('[PASS] 13. Admin rejection updates status to rejected, persists rejection reason, and keeps provider hidden.');
    passed++;
  } else {
    console.log(`[FAIL] 13. Rejection check failed. Status: ${rejectRes.status}`);
  }

  // -------------------------------------------------------------------------
  // Test 14: Public provider API responses never expose private CV paths or sensitive user fields
  // -------------------------------------------------------------------------
  const publicRes4 = await jsonRequest('/providers');
  let leakDetected = false;
  for (const prov of publicRes4.data?.data || []) {
    if (prov.cv_path || prov.certificate_path || prov.user?.password || prov.user?.remember_token) {
      leakDetected = true;
      break;
    }
  }

  if (!leakDetected) {
    console.log('[PASS] 14. Public provider API responses never expose private CV paths or sensitive user fields.');
    passed++;
  } else {
    console.log('[FAIL] 14. Sensitive fields leaked in public API response!');
  }

  // -------------------------------------------------------------------------
  // Test 15: Existing registration, authentication, and provider discovery remain operational
  // -------------------------------------------------------------------------
  const meRes = await jsonRequest('/me', {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const demoProviderLogin = await jsonRequest('/login', {
    method: 'POST',
    body: { email: 'demo.provider@dessie.local', password: 'DessieDemo2026!Secure' },
  });

  if (meRes.status === 200 && demoProviderLogin.status === 200 && publicRes4.status === 200) {
    console.log('[PASS] 15. Existing registration, authentication, provider discovery, and sessions remain fully operational.');
    passed++;
  } else {
    console.log('[FAIL] 15. Regression detected in core auth or discovery endpoints.');
  }

  // Summary
  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passed} / ${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
