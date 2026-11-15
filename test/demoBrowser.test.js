const { test, describe, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { app, createHttpServer } = require("../server/server");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

describe("Homezy M8: Automated Full Demonstration Browser Verification", () => {
  let server;
  let baseUrl;
  let browser;

  before(async () => {
    // 1. Start combined HTTP + Socket.IO server on an ephemeral port
    const serverObj = createHttpServer(app);
    server = serverObj.server;

    await new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // 2. Reset and seed canonical demo dataset
    await fetch(`${baseUrl}/api/demo/seed`, { method: "POST" });

    // 3. Launch headless Chrome via puppeteer-core
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("1. Landing Page Load, Title, and Navbar Verification", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle0" });

    const title = await page.title();
    assert.match(title, /homezy/i);

    // Verify brand element
    const brandText = await page.$eval("header a, nav a", (el) => el.textContent);
    assert.match(brandText, /Homezy/i);

    await page.close();
  });

  test("2. Catalog Browsing & Search/Category Filter Interaction", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(`${baseUrl}/properties`, { waitUntil: "networkidle0" });

    // Verify property cards are rendered
    await page.waitForSelector("h2, h3");
    const headings = await page.$$eval("h2, h3", (elements) =>
      elements.map((e) => e.textContent)
    );
    assert.ok(headings.length >= 1);

    // Click Category Chip "Apartment" if available
    const chipButtons = await page.$$("button");
    for (const btn of chipButtons) {
      const text = await (await btn.getProperty("textContent")).jsonValue();
      if (text && text.trim().startsWith("Apartment")) {
        await btn.click();
        break;
      }
    }

    await page.close();
  });

  test("3. 1-Click Demo Tenant Login & Session Display", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle0" });

    // Click 1-Click Demo Tenant Shortcut
    const demoTenantBtn = await page.waitForSelector("button::-p-text(Demo Tenant)");
    assert.ok(demoTenantBtn);
    await demoTenantBtn.click();

    // Verify email input was pre-filled
    const emailVal = await page.$eval('input[type="email"]', (el) => el.value);
    assert.equal(emailVal, "tenant@homezy.com");

    // Click Sign In button
    const submitBtn = await page.waitForSelector('button[type="submit"]');
    await submitBtn.click();

    // Wait for redirection and navbar session update
    await page.waitForSelector("nav");
    const navText = await page.$eval("nav", (el) => el.textContent);
    assert.match(navText, /tenant/i);

    await page.close();
  });

  test("4. Complete Demonstration Rental Application & Admin Approval Flow", async () => {
    // Session A: Tenant Context
    const tenantContext = await browser.createBrowserContext();
    const tenantPage = await tenantContext.newPage();
    await tenantPage.setViewport({ width: 1280, height: 800 });

    // Tenant logs in
    await tenantPage.goto(`${baseUrl}/login`, { waitUntil: "networkidle0" });
    const tenantBtn = await tenantPage.waitForSelector("button::-p-text(Demo Tenant)");
    await tenantBtn.click();
    await (await tenantPage.waitForSelector('button[type="submit"]')).click();
    await tenantPage.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});

    // Tenant navigates to Property Request page
    await tenantPage.goto(`${baseUrl}/property-request`, { waitUntil: "networkidle0" });

    // Click 1-Click Autofill sample button
    const autofillBtn = await tenantPage.waitForSelector("button::-p-text(Sample Data)");
    await autofillBtn.click();

    // Submit rental application
    const submitAppBtn = await tenantPage.waitForSelector('button[type="submit"]');
    await submitAppBtn.click();

    // Await submission confirmation and navigate to rental requests
    await tenantPage.waitForFunction(
      () =>
        document.body.innerText.includes("Application Submitted") ||
        document.body.innerText.includes("View My Applications")
    );
    await tenantPage.goto(`${baseUrl}/rental-requests`, { waitUntil: "networkidle0" });
    await tenantPage.waitForFunction(() => document.body.innerText.includes("Pending"));
    const tenantBodyText = await tenantPage.evaluate(() => document.body.innerText);
    assert.match(tenantBodyText, /Pending/i);

    // Session B: Admin Context (independent isolated session)
    const adminContext = await browser.createBrowserContext();
    const adminPage = await adminContext.newPage();
    await adminPage.setViewport({ width: 1280, height: 800 });

    // Admin logs in
    await adminPage.goto(`${baseUrl}/login`, { waitUntil: "networkidle0" });
    const adminBtn = await adminPage.waitForSelector("button::-p-text(Demo Admin)");
    await adminBtn.click();
    await (await adminPage.waitForSelector('button[type="submit"]')).click();
    await adminPage.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});

    // Admin visits Admin Dashboard
    await adminPage.goto(`${baseUrl}/admin`, { waitUntil: "networkidle0" });
    await adminPage.waitForSelector("h1");
    const adminDashText = await adminPage.evaluate(() => document.body.innerText);
    assert.match(adminDashText, /Admin Dashboard/i);

    // Admin visits Rental Requests
    await adminPage.goto(`${baseUrl}/rental-requests`, { waitUntil: "networkidle0" });
    await adminPage.waitForSelector("button");

    // Click Approve... button on pending application
    const approveBtn = await adminPage.waitForSelector("button::-p-text(Approve...)");
    await approveBtn.click();

    // Fill feedback and confirm modal
    await adminPage.waitForSelector("textarea");
    const confirmApproveBtn = await adminPage.waitForSelector('button[type="submit"]::-p-text(Confirm Approved)');
    await confirmApproveBtn.click();

    // Verify status update in Admin page
    await adminPage.waitForFunction(() => document.body.innerText.includes("Approved"));

    // Switch back to Tenant page and verify status is Approved
    await tenantPage.reload({ waitUntil: "networkidle0" });
    await tenantPage.waitForFunction(() => document.body.innerText.includes("Approved"));
    const refreshedTenantText = await tenantPage.evaluate(() => document.body.innerText);
    assert.match(refreshedTenantText, /Approved/i);

    // Notification Bell check on Tenant page
    const bellBtn = await tenantPage.$('button[aria-label*="notification" i], button:has(svg)');
    if (bellBtn) {
      await bellBtn.click();
    }

    await tenantContext.close();
    await adminContext.close();
  });

  test("5. Mobile Responsive Viewport & Hamburger Menu Interaction", async () => {
    const page = await browser.newPage();
    // Simulate iPhone 375x667 viewport
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle0" });

    // Verify Hamburger Toggle button is present on mobile
    const hamburgerBtn = await page.waitForSelector('button[aria-label="Toggle mobile menu"]');
    assert.ok(hamburgerBtn);

    // Open mobile menu
    await hamburgerBtn.click();

    // Verify mobile drawer navigation links
    const mobileCatalogLink = await page.waitForSelector('a[href="/properties"]');
    assert.ok(mobileCatalogLink);

    // Close mobile menu
    await hamburgerBtn.click();

    await page.close();
  });
});
