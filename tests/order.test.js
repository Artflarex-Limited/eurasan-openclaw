const { describe, it, before, after } = require('zunit');
const { chromium } = require('playwright');

describe('Eurasan Order Tracking Workflow', () => {
  let browser;

  before(async () => {
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('should navigate to orders page', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/orders`);
    await page.waitForSelector('#order-search', { timeout: 10000 });
  });

  it('should validate search input exists', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/orders`);
    const searchInput = await page.$('#order-search');
    if (!searchInput) throw new Error('Order search input not found');
  });

  it('should accept confirmation number in search', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/orders`);
    await page.fill('#order-search', 'TEST-12345');
    const value = await page.$eval('#order-search', el => el.value);
    if (value !== 'TEST-12345') throw new Error('Search input value mismatch');
  });
});