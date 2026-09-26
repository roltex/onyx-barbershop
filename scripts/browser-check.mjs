import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
    : {}),
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
    "--no-zygote",
  ],
});
await mkdir("test-results", { recursive: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base);
await page.getByRole("heading", { name: "Signature haircut" }).waitFor();
await page.screenshot({
  path: "test-results/landing-desktop.png",
  fullPage: true,
});
for (const [name, width, height] of [
  ["mobile", 390, 844],
  ["tablet", 768, 1024],
]) {
  await page.setViewportSize({ width, height });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Landing overflow " + name,
  );
  await page.screenshot({
    path: `test-results/landing-${name}.png`,
    fullPage: true,
  });
}
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(base + "/book");
await page.getByRole("button", { name: /^Signature haircut/ }).click();
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: /Alex Morgan/ }).click();
await page.getByRole("button", { name: "Continue" }).click();
const day = new Date();
day.setDate(day.getDate() + 3);
if (day.getDay() === 0) day.setDate(day.getDate() + 1);
const date = day.toISOString().slice(0, 10);
await page.getByLabel("Choose a date").fill(date);
await page.locator(".time-grid button").first().click();
await page.getByRole("button", { name: "Continue" }).click();
await page.getByLabel("Full name").fill("Browser Test Customer");
await page.getByLabel("Phone number").fill("+995555010203");
await page
  .getByLabel("Email address")
  .fill(`browser-${Date.now()}@example.com`);
await page.locator("input[name=consent]").check();
await page.getByRole("button", { name: "Confirm appointment" }).click();
await page.getByRole("heading", { name: "Your chair is waiting." }).waitFor();
await page.screenshot({ path: "test-results/booking-confirmed.png" });
await page.goto(base + "/login");
await page
  .getByLabel("Email address")
  .fill(process.env.TEST_EMAIL || "manager@onyx.local");
await page
  .getByLabel("Password", { exact: true })
  .fill(process.env.TEST_PASSWORD || "");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("heading", { name: /Hello,/ }).waitFor();
await page.locator(".stat-card").first().waitFor();
await page.screenshot({
  path: "test-results/dashboard-desktop.png",
  fullPage: true,
});
for (const [name, width, height] of [
  ["mobile", 390, 844],
  ["tablet", 768, 1024],
]) {
  await page.setViewportSize({ width, height });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Dashboard overflow " + name,
  );
  await page.screenshot({
    path: `test-results/dashboard-${name}.png`,
    fullPage: true,
  });
}
await page.setViewportSize({ width: 1440, height: 1000 });
for (const tab of [
  "Appointments",
  "Customers",
  "Services",
  "Team & schedules",
  "Inventory",
  "Reports",
  "Messages",
  "Settings",
  "Access control",
  "Audit trail",
]) {
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: tab, exact: true })
    .click();
  await page.getByRole("heading", { name: tab, exact: true }).waitFor();
  await page.locator(".skeleton").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".error").count(), 0, "Error in " + tab);
}
await page
  .locator(".sidebar nav")
  .getByRole("button", { name: "Customers", exact: true })
  .click();
await page.locator(".skeleton").waitFor({ state: "hidden" });
await page.getByRole("button", { name: "Add customer", exact: true }).click();
const dialog = page.getByRole("dialog");
await dialog.getByLabel("Name", { exact: true }).fill("UI Created Customer");
await dialog
  .getByLabel("Email", { exact: true })
  .fill(`ui-${Date.now()}@example.com`);
await dialog.getByLabel("Phone", { exact: true }).fill("555123456");
await dialog.getByRole("button", { name: "Save changes" }).click();
await dialog.waitFor({ state: "hidden" });
await page.getByText("UI Created Customer", { exact: true }).first().waitFor();
await page.goto(base + "/");
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await context.setOffline(true);
await page.goto(base + "/book?offline-check=1");
await page.getByRole("heading", { name: /A moment/ }).waitFor();
await context.setOffline(false);
assert.deepEqual(errors, []);
console.log(
  "PASS: booking confirmation, staff login, all dashboard modules, customer creation, PWA offline fallback, desktop/tablet/mobile overflow checks.",
);
await browser.close();
