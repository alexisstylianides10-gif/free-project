import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await p.setContent(`<html><body style="margin:0;background:transparent"><svg width="1024" height="1024" viewBox="0 0 100 100"><rect x="4" y="4" width="92" height="92" rx="20" fill="#0e131a"/><rect x="16" y="22" width="68" height="56" rx="3" fill="#13492d" stroke="#22d38b" stroke-width="2"/><line x1="50" y1="22" x2="50" y2="78" stroke="#22d38b" stroke-width="1.5"/><circle cx="50" cy="50" r="9" fill="none" stroke="#22d38b" stroke-width="1.5"/><circle cx="50" cy="50" r="3.5" fill="#f5c451"/></svg></body></html>`);
await p.screenshot({ path: process.argv[2], omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
await b.close();
