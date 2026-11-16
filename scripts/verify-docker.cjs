// Runs against the real, already-seeded Docker demo; creates one application
// and restarts its containers. Never seeds or resets data implicitly.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const puppeteer = require('puppeteer-core');

const frontend = process.env.DOCKER_CLIENT_URL || 'http://localhost:8080';
const api = process.env.DOCKER_API_URL || 'http://localhost:5000/api';
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const compose = ['compose', '--env-file', '.env.docker'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function json(path, token) {
  const response = await fetch(`${api}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200, path);
  return response.json();
}

async function login(page, role) {
  await page.goto(`${frontend}/login`, { waitUntil: 'networkidle0' });
  await page.click(`button::-p-text(Demo ${role})`);
  await page.click('button[type="submit"]');
  await page.waitForFunction(expected => {
    const user = JSON.parse(sessionStorage.getItem('user') || 'null');
    return user?.role === expected;
  }, {}, role.toLowerCase());
  await page.waitForSelector('[title="Real-time notifications: connected"]');
  return page.evaluate(() => sessionStorage.getItem('token'));
}

async function captureEvents(page) {
  const events = [];
  const cdp = await page.createCDPSession();
  await cdp.send('Network.enable');
  cdp.on('Network.webSocketFrameReceived', ({ response }) => {
    if (!response.payloadData.startsWith('42')) return;
    try {
      const [event, payload] = JSON.parse(response.payloadData.slice(2));
      if (event === 'notification') events.push(payload);
    } catch { /* Ignore non-JSON protocol frames. */ }
  });
  return events;
}

async function waitForEvent(events, type, id) {
  for (let i = 0; i < 100; i++) {
    if (events.some(event => event.type === type && String(event.relatedId) === id)) return;
    await delay(100);
  }
  assert.fail(`No real WebSocket ${type} event for ${id}`);
}

async function main() {
  assert.equal((await json('/health/live')).live, true);
  assert.equal((await json('/health/ready')).ready, true);
  const allowed = await fetch(`${api}/health/live`, { headers: { Origin: frontend } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), frontend);
  const denied = await fetch(`${api}/health/live`, { headers: { Origin: 'https://untrusted.invalid' } });
  assert.notEqual(denied.headers.get('access-control-allow-origin'), 'https://untrusted.invalid');
  assert.equal((await fetch(`${api}/demo/seed`, { method: 'POST' })).status, 403);
  assert.equal((await fetch(`${api}/rental-requests`)).status, 401);
  console.log('PASS health/readiness, explicit CORS, production seed guard, authentication');

  const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
  try {
    const tenantContext = await browser.createBrowserContext();
    const adminContext = await browser.createBrowserContext();
    const tenant = await tenantContext.newPage();
    const admin = await adminContext.newPage();
    for (const page of [tenant, admin]) {
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);
    }
    await tenant.goto(`${frontend}/`, { waitUntil: 'networkidle0' });
    assert.match(await tenant.title(), /homezy/i);
    const tenantEvents = await captureEvents(tenant);
    const adminEvents = await captureEvents(admin);
    const tenantToken = await login(tenant, 'Tenant');
    const adminToken = await login(admin, 'Admin');
    assert.notEqual(tenantToken, adminToken);
    assert.equal((await fetch(`${api}/rental-requests`, { headers: { Authorization: `Bearer ${tenantToken}` } })).status, 403);
    console.log('PASS isolated tenant/admin browser logins and tenant authorization');

    await admin.goto(`${frontend}/rental-requests`, { waitUntil: 'networkidle0' });
    await admin.waitForSelector('[title="Real-time notifications: connected"]');
    await admin.click('[aria-label="View notifications"]');
    await tenant.goto(`${frontend}/property-request`, { waitUntil: 'networkidle0' });
    await tenant.waitForSelector('[title="Real-time notifications: connected"]');
    await tenant.click('button::-p-text(Sample Data)');
    const submitted = tenant.waitForResponse(r => r.url() === `${api}/rental-requests` && r.request().method() === 'POST');
    await tenant.click('button[type="submit"]');
    const response = await submitted;
    assert.equal(response.status(), 201);
    const { request } = await response.json();
    assert.ok(request?._id, 'MongoDB-backed request ID');
    await waitForEvent(adminEvents, 'application_submitted', request._id);
    await admin.waitForFunction(title => document.body.innerText.includes(title), {}, request.propertyTitle);
    console.log('PASS Nginx SPA direct routes, UI submission, live admin WebSocket notification');

    // Load the new application, then approve its exact property card.
    await admin.reload({ waitUntil: 'networkidle0' });
    await admin.waitForSelector('[title="Real-time notifications: connected"]');
    const approve = await admin.evaluateHandle(title => {
      const buttons = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Approve...');
      return buttons.find(button => {
        let card = button.parentElement;
        while (card && !card.querySelector('h2')) card = card.parentElement;
        return card?.querySelector('h2')?.textContent.includes(title);
      });
    }, request.propertyTitle);
    assert.ok(approve.asElement(), 'Approve button for the submitted property');
    await approve.asElement().click();
    await admin.waitForSelector('textarea');
    await tenant.click('[aria-label="View notifications"]');
    const updated = admin.waitForResponse(r => r.url().includes(`/rental-requests/${request._id}`) && r.request().method() === 'PATCH');
    await admin.click('button[type="submit"]::-p-text(Confirm Approved)');
    assert.equal((await updated).status(), 200);
    await waitForEvent(tenantEvents, 'application_approved', request._id);
    await tenant.waitForFunction(() => document.body.innerText.includes('Application Approved!'));
    const history = await json('/rental-requests/my', tenantToken);
    assert.equal(history.requests.find(r => r._id === request._id)?.status, 'Approved');
    console.log('PASS admin UI approval and live tenant WebSocket notification without refresh');

    // A simultaneous `restart` does not wait for dependency health. The existing
    // API falls back to memory after an initial DB connection failure, so stop
    // then start with `up --wait` to reapply MongoDB readiness ordering.
    execFileSync('docker', [...compose, 'stop'], { stdio: 'inherit', timeout: 120000 });
    execFileSync('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '180'], { stdio: 'inherit', timeout: 210000 });
    assert.equal((await json('/health/ready')).ready, true);
    const persisted = await json('/rental-requests/my', tenantToken);
    assert.equal(persisted.requests.find(r => r._id === request._id)?.status, 'Approved');
    const notifications = await json('/notifications', tenantToken);
    assert.ok(notifications.notifications.some(n => n.type === 'application_approved' && String(n.relatedId) === request._id));
    await tenant.goto(`${frontend}/rental-requests`, { waitUntil: 'networkidle0' });
    await tenant.waitForFunction(() => document.body.innerText.includes('Approved'));
    console.log('PASS request, approval, notification, and JWT session persisted after all-container restart');
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
