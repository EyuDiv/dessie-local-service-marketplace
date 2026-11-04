// Test search functionality: backend and bilingual frontend matching
const SERVICE_SYNONYMS = {
  plumbing: ['plumb', 'pipe', 'leak', 'water', 'ቧንቧ', 'የቧንቧ', 'ውሃ', 'ፍሳሽ', 'ቧንቧ ውሃ'],
  electrical: ['electr', 'wire', 'light', 'breaker', 'volt', 'power', 'ኤሌክትሪክ', 'የኤሌክትሪክ', 'መብራት', 'ሽቦ', 'ኃይል'],
  cleaning: ['clean', 'sanitize', 'wash', 'housekeep', 'maid', 'ጽዳት', 'የጽዳት', 'ማጽዳት', 'ቤት ጽዳት'],
  carpentry: ['carpent', 'wood', 'furniture', 'door', 'table', 'chair', 'አናጺ', 'የአናጺ', 'እንጨት', 'የእንጨት', 'በር', 'ቁምሳጥን', 'ወንበር'],
  painting: ['paint', 'color', 'wall', 'ቀለም', 'የቀለም', 'ቅብ', 'የቀለም ቅብ', 'ግድግዳ'],
  tech: ['tech', 'comp', 'pc', 'repair', 'phone', 'software', 'laptop', 'ቴክ', 'ኮምፒውተር', 'ስልክ', 'ጥገና', 'የኮምፒውተር ጥገና', 'ላፕቶፕ'],
  photo: ['photo', 'camera', 'video', 'shoot', 'ፎቶ', 'ካሜራ', 'ቪዲዮ'],
  tutor: ['tutor', 'teach', 'learn', 'math', 'school', 'english', 'አስተማሪ', 'ትምህርት', 'ማስተማር', 'እንግሊዝኛ'],
};

const LOCATION_SYNONYMS = {
  piazza: ['piazza', 'piassa', 'ፒያሳ'],
  hotie: ['hotie', 'hote', 'ሆቴ'],
  menhariya: ['menhariya', 'መናኸሪያ', 'መናሀሪያ'],
  arada: ['arada', 'አራዳ'],
  robit: ['robit', 'ሮቢት'],
  buanbuawha: ['buanbuawha', 'buanbua', 'ቧንቧ ውሃ', 'ቧንቧውሃ'],
};

const matchesProviderSearch = (provider, rawQuery) => {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return true;
  if (provider.business_name?.toLowerCase().includes(q)) return true;
  if (provider.description?.toLowerCase().includes(q)) return true;
  if (provider.location?.toLowerCase().includes(q)) return true;
  if (provider.phone?.includes(q)) return true;
  if (provider.user?.name?.toLowerCase().includes(q)) return true;
  if (provider.services?.some((s) => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))) return true;

  for (const [key, synonyms] of Object.entries(SERVICE_SYNONYMS)) {
    const queryMatchesSynonym = synonyms.some((syn) => q.includes(syn) || syn.includes(q));
    if (queryMatchesSynonym) {
      const providerOffers =
        provider.services?.some((s) => s.name?.toLowerCase().includes(key) || key.includes(s.name?.toLowerCase())) ||
        provider.business_name?.toLowerCase().includes(key) ||
        (provider.description?.toLowerCase().includes(key) ?? false);
      if (providerOffers) return true;
    }
  }

  for (const [key, synonyms] of Object.entries(LOCATION_SYNONYMS)) {
    const queryMatchesLocation = synonyms.some((syn) => q.includes(syn) || syn.includes(q));
    if (queryMatchesLocation) {
      if (provider.location?.toLowerCase().includes(key)) return true;
    }
  }

  return false;
};

async function run() {
  console.log('Testing search verification...');
  const res = await fetch('http://127.0.0.1:8000/api/providers');
  const json = await res.json();
  const providers = json.data;
  console.log('Total verified providers loaded:', providers.length);

  const tests = [
    { q: 'plumbing', expectFound: true },
    { q: 'Plumbing', expectFound: true },
    { q: 'electrical', expectFound: true },
    { q: 'clean', expectFound: true },
    { q: 'ቧንቧ', expectFound: true },
    { q: 'የቧንቧ', expectFound: true },
    { q: 'ኤሌክትሪክ', expectFound: true },
    { q: 'የኤሌክትሪክ', expectFound: true },
    { q: 'ጽዳት', expectFound: true },
    { q: 'ፒያሳ', expectFound: true },
    { q: 'Piazza', expectFound: true },
    { q: 'Dessie Demo', expectFound: true },
    { q: 'nonexistent_trade_xyz', expectFound: false },
    { q: 'ዶክተር', expectFound: false },
    { q: 'unknown_service_test', expectFound: false },
  ];

  let passedCount = 0;
  for (const test of tests) {
    const matches = providers.filter((p) => matchesProviderSearch(p, test.q));
    const passed = test.expectFound ? matches.length > 0 : matches.length === 0;
    if (passed) passedCount++;
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`[${status}] Query "${test.q}" -> count: ${matches.length} (expected: ${test.expectFound ? '>0' : '0'})`);
  }

  // Also test backend direct search
  const backendPlumbing = await fetch('http://127.0.0.1:8000/api/providers?search=plumbing').then(r => r.json());
  const backendEmpty = await fetch('http://127.0.0.1:8000/api/providers?search=nonexistent_xyz_999').then(r => r.json());
  const b1Pass = backendPlumbing.data.length > 0;
  const b2Pass = backendEmpty.data.length === 0;

  console.log(`[${b1Pass ? 'PASS' : 'FAIL'}] Backend search "plumbing": ${backendPlumbing.data.length} providers`);
  console.log(`[${b2Pass ? 'PASS' : 'FAIL'}] Backend search "nonexistent_xyz_999": ${backendEmpty.data.length} providers`);

  if (passedCount === tests.length && b1Pass && b2Pass) {
    console.log('\n========================================');
    console.log(`ALL ${tests.length + 2} TESTS PASSED (100%)`);
    console.log('========================================');
    process.exit(0);
  } else {
    console.error('Some tests failed!');
    process.exit(1);
  }
}

run();
