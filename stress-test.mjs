/**
 * 压力测试脚本 - 模拟200个并发用户
 * 用法: node stress-test.mjs
 */

const BASE = "http://localhost:3000";
const TOTAL_USERS = 200;
const CONCURRENCY = 50; // 每批并发数

// ============ Step 1: 创建200个测试用户 ============
async function seedUsers() {
  console.log(`\n=== 第1步：创建 ${TOTAL_USERS} 个测试用户 ===\n`);

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const departments = ["技术部", "产品部", "运营部", "市场部", "人力资源部", "财务部", "设计部", "数据部"];
  const titles = ["工程师", "高级工程师", "产品经理", "运营专员", "设计师", "分析师", "主管", "专员"];

  // 确保有 supervisor
  let supervisor = await prisma.user.findFirst({ where: { role: "SUPERVISOR" } });
  if (!supervisor) {
    supervisor = await prisma.user.upsert({
      where: { feishuOpenId: "demo_supervisor" },
      update: {},
      create: {
        feishuOpenId: "demo_supervisor",
        name: "张经理",
        email: "zhang@company.com",
        department: "产品部",
        role: "SUPERVISOR",
      },
    });
  }

  const userIds = [];
  const batchSize = 50;

  for (let batch = 0; batch < Math.ceil(TOTAL_USERS / batchSize); batch++) {
    const start = batch * batchSize;
    const end = Math.min(start + batchSize, TOTAL_USERS);
    const promises = [];

    for (let i = start; i < end; i++) {
      const dept = departments[i % departments.length];
      const title = titles[i % titles.length];
      promises.push(
        prisma.user.upsert({
          where: { feishuOpenId: `stress_user_${i}` },
          update: {},
          create: {
            feishuOpenId: `stress_user_${i}`,
            name: `测试用户${i}`,
            email: `stress${i}@company.com`,
            department: dept,
            jobTitle: title,
            role: "EMPLOYEE",
            supervisorId: supervisor.id,
          },
        })
      );
    }

    const users = await Promise.all(promises);
    userIds.push(...users.map((u) => u.id));
    process.stdout.write(`  已创建 ${end}/${TOTAL_USERS} 个用户\r`);
  }

  console.log(`\n  完成！共 ${userIds.length} 个用户\n`);
  await prisma.$disconnect();
  return userIds;
}

// ============ Step 2: 登录获取 cookie ============
async function login(userId) {
  const res = await fetch(`${BASE}/api/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
    redirect: "manual",
  });
  const cookies = res.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find((c) => c.includes("session-token="));
  if (!sessionCookie) return null;
  const match = sessionCookie.match(/([^;]+session-token=[^;]+)/);
  return match ? match[1] : null;
}

// ============ Step 3: 执行API请求 ============
async function makeRequest(cookie, method, path, body) {
  const start = performance.now();
  try {
    const opts = {
      method,
      headers: { Cookie: cookie, "Content-Type": "application/json" },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const duration = performance.now() - start;
    return { status: res.status, duration, ok: res.ok };
  } catch (e) {
    const duration = performance.now() - start;
    return { status: 0, duration, ok: false, error: e.message };
  }
}

// ============ Step 4: 压力测试场景 ============
async function runScenario(name, cookies, fn) {
  console.log(`\n--- 场景: ${name} (${cookies.length} 并发) ---`);
  const start = performance.now();

  const results = await Promise.all(cookies.map((c, i) => fn(c, i)));

  const total = performance.now() - start;
  const durations = results.map((r) => r.duration);
  const successes = results.filter((r) => r.ok).length;
  const failures = results.length - successes;

  durations.sort((a, b) => a - b);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const max = durations[durations.length - 1];

  console.log(`  总耗时:    ${(total / 1000).toFixed(2)}s`);
  console.log(`  成功/失败: ${successes}/${failures}`);
  console.log(`  平均响应:  ${avg.toFixed(0)}ms`);
  console.log(`  P50:       ${p50.toFixed(0)}ms`);
  console.log(`  P95:       ${p95.toFixed(0)}ms`);
  console.log(`  P99:       ${p99.toFixed(0)}ms`);
  console.log(`  最大:      ${max.toFixed(0)}ms`);
  console.log(`  QPS:       ${(cookies.length / (total / 1000)).toFixed(1)}`);

  return { name, total, avg, p50, p95, p99, max, successes, failures };
}

// ============ 主流程 ============
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║   绩效系统压力测试 - 200并发用户       ║");
  console.log("╚════════════════════════════════════════╝");

  // 1. 创建用户
  const userIds = await seedUsers();

  // 2. 批量登录
  console.log("=== 第2步：批量登录获取会话 ===\n");
  const cookies = [];
  for (let batch = 0; batch < Math.ceil(userIds.length / CONCURRENCY); batch++) {
    const start = batch * CONCURRENCY;
    const end = Math.min(start + CONCURRENCY, userIds.length);
    const batchIds = userIds.slice(start, end);
    const batchCookies = await Promise.all(batchIds.map((id) => login(id)));
    cookies.push(...batchCookies.filter(Boolean));
    process.stdout.write(`  已登录 ${cookies.length}/${userIds.length}\r`);
  }
  console.log(`\n  完成！${cookies.length} 个会话\n`);

  if (cookies.length === 0) {
    console.error("无法获取任何会话，终止测试");
    process.exit(1);
  }

  // 3. 执行压测场景
  console.log("=== 第3步：执行压力测试场景 ===");
  const report = [];

  // 场景1: 全员同时加载首页
  report.push(
    await runScenario("GET /api/users?me=true (首页加载)", cookies, (c) =>
      makeRequest(c, "GET", "/api/users?me=true")
    )
  );

  // 场景2: 全员同时加载自评页
  report.push(
    await runScenario("GET /api/self-eval (个人自评)", cookies, (c) =>
      makeRequest(c, "GET", "/api/self-eval")
    )
  );

  // 场景3: 全员同时加载360环评
  report.push(
    await runScenario("GET /api/peer-review (360环评)", cookies, (c) =>
      makeRequest(c, "GET", "/api/peer-review")
    )
  );

  // 场景4: 全员同时加载用户列表(选人)
  report.push(
    await runScenario("GET /api/users (用户搜索)", cookies, (c) =>
      makeRequest(c, "GET", "/api/users")
    )
  );

  // 场景5: 全员同时加载申诉页
  report.push(
    await runScenario("GET /api/appeal (绩效申诉)", cookies, (c) =>
      makeRequest(c, "GET", "/api/appeal")
    )
  );

  // 场景6: 混合读写 - 模拟真实使用
  report.push(
    await runScenario("混合场景 (随机API调用)", cookies, (c, i) => {
      const endpoints = [
        () => makeRequest(c, "GET", "/api/users?me=true"),
        () => makeRequest(c, "GET", "/api/self-eval"),
        () => makeRequest(c, "GET", "/api/peer-review"),
        () => makeRequest(c, "GET", "/api/users"),
        () => makeRequest(c, "GET", "/api/appeal"),
        () => makeRequest(c, "GET", "/api/peer-review/nominate"),
      ];
      return endpoints[i % endpoints.length]();
    })
  );

  // 4. 汇总报告
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                    压测汇总报告                           ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log("║ 场景                          │ P95    │ 成功率  │ QPS    ║");
  console.log("╠═══════════════════════════════╪════════╪═════════╪════════╣");
  for (const r of report) {
    const name = r.name.padEnd(30).slice(0, 30);
    const p95 = `${r.p95.toFixed(0)}ms`.padStart(6);
    const rate = `${((r.successes / (r.successes + r.failures)) * 100).toFixed(0)}%`.padStart(5);
    const qps = ((r.successes + r.failures) / (r.total / 1000)).toFixed(1).padStart(6);
    console.log(`║ ${name} │ ${p95} │ ${rate}   │ ${qps} ║`);
  }
  console.log("╚═══════════════════════════════╧════════╧═════════╧════════╝");

  // 5. 清理测试用户
  console.log("\n=== 清理测试数据 ===");
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const deleted = await prisma.user.deleteMany({
    where: { feishuOpenId: { startsWith: "stress_user_" } },
  });
  console.log(`  已删除 ${deleted.count} 个测试用户`);
  await prisma.$disconnect();

  console.log("\n压力测试完成！");
}

main().catch((e) => {
  console.error("压测失败:", e);
  process.exit(1);
});
