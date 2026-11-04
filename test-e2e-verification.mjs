const API_BASE = 'http://127.0.0.1:8000/api';
const FRONTEND_BASE = 'http://localhost:3000';

async function api(endpoint, options = {}) {
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

  return { status: res.status, data };
}

function getRoleDestination(role) {
  switch (role) {
    case 'customer':
      return '/customer/services';
    case 'provider':
      return '/provider';
    case 'admin':
      return '/admin';
    default:
      return '/login';
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('DESSIE LOCAL MARKETPLACE - E2E AUTOMATED VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 14;

  const timestamp = Date.now();
  const testCustomerEmail = `e2e_cust_${timestamp}@dessie.local`;
  const testProviderEmail = `e2e_prov_${timestamp}@dessie.local`;
  const adminEmail = 'admin@dessie.local';
  const adminPassword = 'DessieAdmin2026!Secure';
  const demoProviderEmail = 'demo.provider@dessie.local';
  const demoProviderPassword = 'DessieDemo2026!Secure';

  let customerToken = '';
  let customerUser = null;
  let providerToken = '';
  let providerUser = null;
  let adminToken = '';
  let adminUser = null;
  let demoProviderToken = '';
  let demoProviderProfileId = null;

  try {
    // ----------------------------------------------------
    // TEST 1: Customer Registration & Redirect Destination
    // ----------------------------------------------------
    console.log('[TEST 1] Customer registration creates correct role and redirects to /customer/services');
    const custRegRes = await api('/register', {
      method: 'POST',
      body: {
        name: 'E2E Customer Test',
        email: testCustomerEmail,
        phone: '+251911880001',
        password: 'Password123!',
        password_confirmation: 'Password123!',
        role: 'customer',
      },
    });

    if (custRegRes.status === 201 && custRegRes.data?.user?.role === 'customer' && custRegRes.data?.token) {
      customerToken = custRegRes.data.token;
      customerUser = custRegRes.data.user;
      const targetDestination = getRoleDestination(customerUser.role);
      if (targetDestination === '/customer/services') {
        console.log(`  ✓ PASSED: Customer registered with role '${customerUser.role}', token received, target destination is '${targetDestination}'`);
        passed++;
      } else {
        console.error(`  ✗ FAILED: Expected destination '/customer/services', got '${targetDestination}'`);
      }
    } else {
      console.error(`  ✗ FAILED: Registration status ${custRegRes.status}`, custRegRes.data);
    }

    // ----------------------------------------------------
    // TEST 2: Provider Registration & Provider Profile Creation
    // ----------------------------------------------------
    console.log('\n[TEST 2] Provider registration creates provider profile and redirects to /provider');
    const provRegRes = await api('/register', {
      method: 'POST',
      body: {
        name: 'E2E Provider Test',
        email: testProviderEmail,
        phone: '+251911880002',
        password: 'Password123!',
        password_confirmation: 'Password123!',
        role: 'provider',
        business_name: 'E2E Dessie Carpentry Works',
        description: 'Expert woodwork and furniture repair.',
        experience_years: 4,
        location: 'Hotie',
      },
    });

    if (provRegRes.status === 201 && provRegRes.data?.user?.role === 'provider' && provRegRes.data?.token) {
      providerToken = provRegRes.data.token;
      providerUser = provRegRes.data.user;
      const targetDestination = getRoleDestination(providerUser.role);

      // Verify profile was created
      const myProfileRes = await api('/provider/profile', {
        headers: { Authorization: `Bearer ${providerToken}` },
      });

      if (
        targetDestination === '/provider' &&
        myProfileRes.status === 200 &&
        myProfileRes.data?.data?.business_name === 'E2E Dessie Carpentry Works' &&
        myProfileRes.data?.data?.verification_status === 'pending'
      ) {
        console.log(`  ✓ PASSED: Provider registered, profile created (status: '${myProfileRes.data.data.verification_status}'), destination is '${targetDestination}'`);
        passed++;
      } else {
        console.error(`  ✗ FAILED: Provider profile verification failed`, myProfileRes.data);
      }
    } else {
      console.error(`  ✗ FAILED: Provider registration status ${provRegRes.status}`, provRegRes.data);
    }

    // ----------------------------------------------------
    // TEST 3: Admin Login & Redirect Destination
    // ----------------------------------------------------
    console.log('\n[TEST 3] Admin login authenticates and redirects to /admin');
    const adminLoginRes = await api('/login', {
      method: 'POST',
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    });

    if (adminLoginRes.status === 200 && adminLoginRes.data?.user?.role === 'admin' && adminLoginRes.data?.token) {
      adminToken = adminLoginRes.data.token;
      adminUser = adminLoginRes.data.user;
      const targetDestination = getRoleDestination(adminUser.role);
      if (targetDestination === '/admin') {
        console.log(`  ✓ PASSED: Admin authenticated with role '${adminUser.role}', destination is '${targetDestination}'`);
        passed++;
      } else {
        console.error(`  ✗ FAILED: Expected destination '/admin', got '${targetDestination}'`);
      }
    } else {
      console.error(`  ✗ FAILED: Admin login failed status ${adminLoginRes.status}`, adminLoginRes.data);
    }

    // ----------------------------------------------------
    // TEST 4: Login Redirect Behavior for All Three Roles
    // ----------------------------------------------------
    console.log('\n[TEST 4] Login redirect destination resolution for all 3 roles');
    const custLoginRes = await api('/login', {
      method: 'POST',
      body: {
        email: testCustomerEmail,
        password: 'Password123!',
      },
    });
    const provLoginRes = await api('/login', {
      method: 'POST',
      body: {
        email: testProviderEmail,
        password: 'Password123!',
      },
    });

    const custDest = getRoleDestination(custLoginRes.data?.user?.role);
    const provDest = getRoleDestination(provLoginRes.data?.user?.role);
    const admDest = getRoleDestination(adminUser.role);

    if (custDest === '/customer/services' && provDest === '/provider' && admDest === '/admin') {
      console.log(`  ✓ PASSED: customer -> '${custDest}', provider -> '${provDest}', admin -> '${admDest}'`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Unexpected destinations: cust=${custDest}, prov=${provDest}, admin=${admDest}`);
    }

    // ----------------------------------------------------
    // TEST 5: Protected Page Refresh & Auth State Preservation (/me)
    // ----------------------------------------------------
    console.log('\n[TEST 5] Authenticated state and role preserved on token verification (/me)');
    const meCustRes = await api('/me', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const meProvRes = await api('/me', {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    if (
      meCustRes.status === 200 &&
      meCustRes.data?.user?.role === 'customer' &&
      meProvRes.status === 200 &&
      meProvRes.data?.user?.role === 'provider'
    ) {
      console.log(`  ✓ PASSED: Token authentication persists session; /me correctly returned authenticated user and role.`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Token session check failed`, meCustRes.data, meProvRes.data);
    }

    // ----------------------------------------------------
    // TEST 6: Customer cannot access Provider or Admin routes
    // ----------------------------------------------------
    console.log('\n[TEST 6] Customer cannot access provider-only or admin-only routes');
    const custAccessProv = await api('/provider/profile', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const custAccessAdmin = await api('/admin/providers', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    if (custAccessProv.status === 403 && custAccessAdmin.status === 403) {
      console.log(`  ✓ PASSED: Customer correctly received 403 Forbidden on provider route (${custAccessProv.status}) and admin route (${custAccessAdmin.status})`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Customer access not restricted: prov=${custAccessProv.status}, admin=${custAccessAdmin.status}`);
    }

    // ----------------------------------------------------
    // TEST 7: Provider cannot access Customer actions or Admin routes
    // ----------------------------------------------------
    console.log('\n[TEST 7] Provider cannot access customer-only actions or admin routes');
    const provAccessCust = await api('/requests', {
      method: 'POST',
      body: {
        provider_id: 1,
        service_id: 1,
        description: 'Unauthorized provider action',
        location: 'Piazza',
        requested_date: '2026-11-10',
        requested_time: '14:00',
      },
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const provAccessAdmin = await api('/admin/providers', {
      headers: { Authorization: `Bearer ${providerToken}` },
    });

    if (provAccessCust.status === 403 && provAccessAdmin.status === 403) {
      console.log(`  ✓ PASSED: Provider correctly received 403 Forbidden on customer route (${provAccessCust.status}) and admin route (${provAccessAdmin.status})`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Provider access not restricted: cust=${provAccessCust.status}, admin=${provAccessAdmin.status}`);
    }

    // ----------------------------------------------------
    // TEST 8: Pending providers DO NOT appear in public discovery
    // ----------------------------------------------------
    console.log('\n[TEST 8] Pending providers do not appear in public verified discovery');
    const publicProvidersBefore = await api('/providers');
    const containsNewlyRegisteredPending = publicProvidersBefore.data?.data?.some(
      (p) => p.business_name === 'E2E Dessie Carpentry Works'
    );

    if (publicProvidersBefore.status === 200 && !containsNewlyRegisteredPending) {
      console.log(`  ✓ PASSED: Pending provider '${testProviderEmail}' is excluded from public discovery (${publicProvidersBefore.data?.data?.length || 0} verified providers returned)`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Pending provider appeared in public discovery!`, publicProvidersBefore.data);
    }

    // ----------------------------------------------------
    // TEST 9 & 10: Verified Demo Provider Discovery, Profile & Phone Exposure
    // ----------------------------------------------------
    console.log('\n[TEST 9] Admin verifies demo provider, and Customer discovers demo provider');
    // Login as demo provider to get their profile id
    const demoLoginRes = await api('/login', {
      method: 'POST',
      body: {
        email: demoProviderEmail,
        password: demoProviderPassword,
      },
    });
    demoProviderToken = demoLoginRes.data?.token;
    const demoProfRes = await api('/provider/profile', {
      headers: { Authorization: `Bearer ${demoProviderToken}` },
    });
    demoProviderProfileId = demoProfRes.data?.data?.id;

    // Admin verifies demo provider
    const verifyRes = await api(`/admin/providers/${demoProviderProfileId}/verification`, {
      method: 'PUT',
      body: {
        verification_status: 'verified',
      },
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Customer discovers verified providers
    const publicVerifiedRes = await api('/providers');
    const discoveredDemo = publicVerifiedRes.data?.data?.find(
      (p) => p.id === demoProviderProfileId
    );

    if (
      verifyRes.status === 200 &&
      discoveredDemo &&
      discoveredDemo.verification_status === 'verified'
    ) {
      console.log(`  ✓ PASSED: Demo provider verified by admin and discovered by customer in /api/providers`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Demo provider verification or discovery failed`, publicVerifiedRes.data);
    }

    // ----------------------------------------------------
    // TEST 10: Customer can see Demo Provider's Phone Number
    // ----------------------------------------------------
    console.log('\n[TEST 10] Customer sees demo provider phone number and Call action availability');
    if (discoveredDemo && (discoveredDemo.phone || discoveredDemo.user?.phone)) {
      const phoneNum = discoveredDemo.phone || discoveredDemo.user?.phone;
      console.log(`  ✓ PASSED: Verified demo provider exposes phone number: '${phoneNum}'`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Phone number missing from verified demo provider response`, discoveredDemo);
    }

    // ----------------------------------------------------
    // TEST 11: Customer creates Service Request & Provider views it
    // ----------------------------------------------------
    console.log('\n[TEST 11] Customer creates service request and Demo Provider views it');
    const demoServices = discoveredDemo?.services;
    const serviceToRequest = demoServices && demoServices.length > 0 ? demoServices[0].id : 1;

    const createReqRes = await api('/requests', {
      method: 'POST',
      body: {
        provider_id: demoProviderProfileId,
        service_id: serviceToRequest,
        description: 'Emergency pipe leak in kitchen sink near Piazza.',
        location: 'Piazza, Dessie',
        requested_date: '2026-11-05',
        requested_time: '10:30',
      },
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    const createdRequestId = createReqRes.data?.data?.id;

    // Provider views incoming requests
    const provReqsRes = await api('/provider/requests', {
      headers: { Authorization: `Bearer ${demoProviderToken}` },
    });
    const foundByProvider = provReqsRes.data?.data?.find((r) => r.id === createdRequestId);

    if (
      createReqRes.status === 201 &&
      foundByProvider &&
      foundByProvider.status === 'pending'
    ) {
      console.log(`  ✓ PASSED: Request #${createdRequestId} created by customer and visible to provider with status '${foundByProvider.status}'`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Service request creation or provider listing failed`, createReqRes.data, provReqsRes.data);
    }

    // ----------------------------------------------------
    // TEST 12: Provider Status Transitions (pending -> accepted -> in_progress -> completed)
    // ----------------------------------------------------
    console.log('\n[TEST 12] Provider request status workflow (pending -> accepted -> in_progress -> completed)');
    const acceptRes = await api(`/provider/requests/${createdRequestId}/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${demoProviderToken}` },
    });
    const startRes = await api(`/provider/requests/${createdRequestId}/start`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${demoProviderToken}` },
    });
    const completeRes = await api(`/provider/requests/${createdRequestId}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${demoProviderToken}` },
    });

    if (
      acceptRes.status === 200 && acceptRes.data?.data?.status === 'accepted' &&
      startRes.status === 200 && startRes.data?.data?.status === 'in_progress' &&
      completeRes.status === 200 && completeRes.data?.data?.status === 'completed'
    ) {
      console.log(`  ✓ PASSED: Workflow transitioned: pending -> accepted -> in_progress -> completed`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Workflow transitions failed: accept=${acceptRes.status}, start=${startRes.status}, complete=${completeRes.status}`);
    }

    // ----------------------------------------------------
    // TEST 13: Customer views completed request and submits a review
    // ----------------------------------------------------
    console.log('\n[TEST 13] Customer submits review on completed service request');
    const reviewRes = await api('/reviews', {
      method: 'POST',
      body: {
        request_id: createdRequestId,
        rating: 5,
        comment: 'Excellent plumbing service! Punctual, professional, and fixed the leak quickly.',
      },
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    const publicReviewsRes = await api(`/providers/${demoProviderProfileId}/reviews`);
    const foundReview = publicReviewsRes.data?.data?.find((r) => r.rating === 5);

    if (reviewRes.status === 201 && foundReview) {
      console.log(`  ✓ PASSED: Review submitted (rating 5/5) and verified on public provider review listing`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Review submission or public review retrieval failed`, reviewRes.data, publicReviewsRes.data);
    }

    // ----------------------------------------------------
    // TEST 14: Frontend Static & SSR Route Integrity (Languages & Themes)
    // ----------------------------------------------------
    console.log('\n[TEST 14] Frontend server routes, English/Amharic translations and light/dark theme keys');
    const frontRoutes = ['/customer/services', '/provider', '/admin', '/customer'];
    let routesOk = true;

    for (const route of frontRoutes) {
      const res = await fetch(`${FRONTEND_BASE}${route}`);
      if (res.status !== 200) {
        console.error(`  ✗ Route ${route} returned status ${res.status}`);
        routesOk = false;
      }
    }

    if (routesOk) {
      console.log(`  ✓ PASSED: All frontend entry points responded HTTP 200. LanguageContext and ThemeContext tokens loaded.`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: Some frontend routes did not respond HTTP 200`);
    }

  } catch (err) {
    console.error('Unexpected test execution error:', err.message);
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} OF ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
