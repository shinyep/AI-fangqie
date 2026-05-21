const pw = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
  // Connect to existing Chrome
  const browser = await pw.chromium.connectOverCDP('http://localhost:9223');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];
  
  console.log('Connected to Chrome. Current URL:', page.url());
  console.log('\nPlease scan QR code to login now...\n');

  // Wait for login
  let loggedIn = false;
  for (let i = 0; i < 180; i++) {
    await page.waitForTimeout(2000);
    const url = page.url();
    
    if (url.includes('/workspace') || url.includes('/creative') || url.includes('/write') || url.includes('/work')) {
      console.log('\n[OK] Login detected! URL:', url);
      loggedIn = true;
      break;
    }
    
    try {
      const text = await page.evaluate(() => document.body.innerText.substring(0, 200));
      if (text.includes('新建作品') || text.includes('我的作品') || text.includes('开始创作')) {
        console.log('\n[OK] Login detected! (content)');
        loggedIn = true;
        break;
      }
    } catch(e) {}
    
    if (i % 20 === 0 && i > 0) {
      console.log('  Waiting... (' + (i*2) + 's) URL:', url);
    }
  }

  if (!loggedIn) {
    console.log('Timeout waiting for login.');
    return;
  }

  // Save state
  const state = await page.context().storageState();
  fs.writeFileSync(path.join(__dirname, 'browser_state.json'), JSON.stringify(state, null, 2));
  console.log('[SAVED] browser_state.json');
  
  console.log('\nReady for scraping! Browser stays open.');
})();