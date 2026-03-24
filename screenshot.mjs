import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3000";
const OUT = join(import.meta.dirname, "screenshots");

const pages = [
  { name: "01-login", url: "/login", desc: "登录页面" },
  { name: "02-dashboard-employee", url: "/dashboard?preview=EMPLOYEE", desc: "员工首页" },
  { name: "03-self-eval", url: "/self-eval?preview=EMPLOYEE", desc: "个人自评" },
  { name: "04-peer-review-nominate", url: "/peer-review?preview=EMPLOYEE", desc: "360环评-提名" },
  { name: "05-dashboard-supervisor", url: "/dashboard?preview=SUPERVISOR", desc: "主管首页" },
  { name: "06-team-eval", url: "/team?preview=SUPERVISOR", desc: "团队评估" },
  { name: "07-meetings", url: "/meetings?preview=SUPERVISOR", desc: "面谈记录" },
  { name: "08-dashboard-admin", url: "/dashboard?preview=ADMIN", desc: "管理员首页" },
  { name: "09-calibration", url: "/calibration?preview=ADMIN", desc: "绩效校准" },
  { name: "10-admin", url: "/admin?preview=ADMIN", desc: "系统管理" },
  { name: "11-appeal-employee", url: "/appeal?preview=EMPLOYEE", desc: "绩效申诉-员工" },
  { name: "12-appeal-admin", url: "/appeal?preview=ADMIN", desc: "绩效申诉-管理" },
];

async function main() {
  const { mkdirSync } = await import("fs");
  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "zh-CN",
  });

  // Need to set a session cookie or bypass auth. Since preview mode works on client side,
  // we need to be logged in first. Let's use dev-login.
  const page = await context.newPage();

  // First, try dev login
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(2000);

  // Take login screenshot first
  await page.screenshot({ path: join(OUT, "01-login.png"), fullPage: true });
  console.log("Screenshot: 01-login");

  // Try to click dev login button to get demo users
  // The login page has a "飞书登录" button that falls back to demo mode when no FEISHU_APP_ID
  try {
    await page.click("text=飞书登录");
    await page.waitForTimeout(2000);
    // Take screenshot of demo login
    await page.screenshot({ path: join(OUT, "01b-login-demo.png"), fullPage: true });
    console.log("Screenshot: 01b-login-demo");

    // Click the first user (admin) to login
    const userButtons = await page.$$("button.group");
    if (userButtons.length > 0) {
      // Find admin button
      for (const btn of userButtons) {
        const text = await btn.textContent();
        if (text.includes("管理员")) {
          await btn.click();
          break;
        }
      }
      await page.waitForTimeout(3000);
    }
  } catch (e) {
    console.log("Dev login not available, trying preview mode directly");
  }

  // Now take screenshots of each page in preview mode
  for (const p of pages.slice(1)) {
    try {
      await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);

      // For team eval page, click the first employee
      if (p.name === "06-team-eval") {
        const empButtons = await page.$$("button:has-text('李明')");
        if (empButtons.length > 0) {
          await empButtons[0].click();
          await page.waitForTimeout(1000);
        }
      }

      await page.screenshot({ path: join(OUT, `${p.name}.png`), fullPage: true });
      console.log(`Screenshot: ${p.name}`);
    } catch (e) {
      console.error(`Failed: ${p.name} - ${e.message}`);
    }
  }

  await browser.close();
  console.log("\nAll screenshots saved to:", OUT);
}

main().catch(console.error);
