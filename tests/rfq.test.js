const { describe, it, before, after } = require('zunit');
const { chromium } = require('playwright');

describe('Eurasan RFQ Workflow', () => {
  let browser;

  before(async () => {
    browser = await chromium.launch({ headless: true });
  });

  after(async () => {
    if (browser) await browser.close();
  });

  it('should navigate to RFQ creation page', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/rfq/create`);
    await page.waitForSelector('#rfq-form', { timeout: 10000 });
  });

  it('should validate RFQ form elements exist', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/rfq/create`);
    const form = await page.$('#rfq-form');
    if (!form) throw new Error('RFQ form not found');
    const addBtn = await page.$('#add-product-btn');
    if (!addBtn) throw new Error('Add product button not found');
  });

  it('should accept product line items', async () => {
    const page = await browser.newPage();
    const webUrl = process.env.EURASAN_WEB_URL || 'https://www.eurasan.com';
    await page.goto(`${webUrl}/rfq/create`);
    await page.click('#add-product-btn');
    await page.fill('#product-name', 'Test Product');
    await page.fill('#product-quantity', '100');
    await page.fill('#product-unit', 'pieces');
  });
});