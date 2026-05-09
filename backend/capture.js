import puppeteer from 'puppeteer';

(async () => {
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    console.log("Navigating to http://localhost:5173...");
    await page.goto('http://localhost:5173');
    await page.waitForSelector('input[placeholder="you@example.com"]', { timeout: 10000 }).catch(() => { });

    const isLogin = await page.$('input[placeholder="you@example.com"]');
    if (isLogin) {
      console.log("Logging in as utkarsh@example.com...");
      await page.type('input[placeholder="you@example.com"]', 'utkarsh@example.com');
      await page.type('input[placeholder="••••••••"]', 'password123');
      await page.click('button[type="submit"]');

      // Wait for navigation / sidebar
      await page.waitForSelector('aside', { timeout: 10000 });
      console.log("Logged in successfully.");
    } else {
      console.log("Already logged in or login form not found.");
    }

    // Wait for users to load in sidebar
    await new Promise(r => setTimeout(r, 2000));

    // Try to click on a user in the sidebar to open the chat window
    console.log("Clicking on a conversation...");
    // Find all buttons in the sidebar
    const userButtons = await page.$$('aside button');
    if (userButtons.length > 0) {
      await userButtons[0].click(); // Click the first user (likely Harsh or Pratikshya)
    }

    // Wait for messages to load and render
    await new Promise(r => setTimeout(r, 3000));

    console.log("Taking screenshot...");
    await page.screenshot({ path: '../frontend/public/preview.png' });

    await browser.close();
    console.log("Screenshot saved to frontend/public/preview.png");
  } catch (error) {
    console.error("Error capturing screenshot:", error);
    process.exit(1);
  }
})();
