import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BASE_URL = process.env.SCREENSHOT_URL || 'http://localhost:5173';
const EMAIL = process.env.SCREENSHOT_EMAIL || 'utkarsh@example.com';
const PASSWORD = process.env.SCREENSHOT_PASSWORD || 'password123';
const OUTPUT = process.env.SCREENSHOT_OUTPUT || '../frontend/public/preview.png';

(async () => {
  let browser;
  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

    await page.waitForSelector('input[placeholder="you@example.com"]', { timeout: 10000 }).catch(() => {});

    const isLogin = await page.$('input[placeholder="you@example.com"]');
    if (isLogin) {
      console.log(`Logging in as ${EMAIL}...`);
      await page.type('input[placeholder="you@example.com"]', EMAIL);
      await page.type('input[placeholder="••••••••"]', PASSWORD);
      await page.click('button[type="submit"]');

      const sidebar = await page.waitForSelector('aside', { timeout: 10000 }).catch(() => null);
      if (!sidebar) {
        throw new Error("Login failed — sidebar did not appear. Check credentials or selectors.");
      }
      console.log("Logged in successfully.");
    } else {
      console.log("Already logged in or login form not found.");
    }

    console.log("Waiting for sidebar users...");
    const firstUser = await page.waitForSelector('aside button', { timeout: 10000 }).catch(() => null);

    if (firstUser) {
      console.log("Clicking on a conversation...");
      await firstUser.click();
      await page.waitForSelector('[class*="chat"]', { timeout: 8000 }).catch(() => {
        console.warn("Chat window not detected — screenshot may show empty state.");
      });
    } else {
      console.warn("No sidebar users found — screenshot will show empty sidebar.");
    }

    const dir = path.dirname(OUTPUT);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    console.log("Taking screenshot...");
    await page.screenshot({ path: OUTPUT });
    console.log(`Screenshot saved to ${OUTPUT}`);
  } catch (error) {
    console.error("Error capturing screenshot:", error.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();