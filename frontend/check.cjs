const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => {
    console.log('PAGE ERROR message:', err.message);
    console.log('PAGE ERROR stack:', err.stack);
  });
  await page.goto('http://localhost:5174');
  await page.screenshot({ path: 'screenshot2.png' });
  console.log('screenshot taken');
  await browser.close();
})();