const { describe, it, before, after } = require('zunit');
const { chromium } = require('playwright');

describe('Eurasan Auth Workflow', () => {
  let browser;

  before(async () => {
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('should navigate to login page', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/login`);
    await page.waitForSelector('#username', { timeout: 10000 });
  });

  it('should validate username field exists', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/login`);
    const usernameField = await page.$('#username');
    if (!usernameField) throw new Error('Username field not found');
  });

  it('should validate password field exists', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/login`);
    const passwordField = await page.$('#password');
    if (!passwordField) throw new Error('Password field not found');
  });
});