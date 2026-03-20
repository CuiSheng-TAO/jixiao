import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create demo admin user
  const admin = await prisma.user.upsert({
    where: { feishuOpenId: "demo_admin" },
    update: {},
    create: {
      feishuOpenId: "demo_admin",
      name: "管理员",
      email: "admin@company.com",
      department: "人力资源部",
      role: "ADMIN",
    },
  });

  // Create demo supervisor
  const supervisor = await prisma.user.upsert({
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

  // Create demo employees
  const employees = [];
  const demoData = [
    { name: "李明", dept: "产品部", title: "产品经理" },
    { name: "王芳", dept: "产品部", title: "产品设计师" },
    { name: "赵强", dept: "技术部", title: "前端工程师" },
    { name: "陈静", dept: "技术部", title: "后端工程师" },
    { name: "刘洋", dept: "运营部", title: "运营专员" },
  ];

  for (const d of demoData) {
    const emp = await prisma.user.upsert({
      where: { feishuOpenId: `demo_${d.name}` },
      update: {},
      create: {
        feishuOpenId: `demo_${d.name}`,
        name: d.name,
        email: `${d.name}@company.com`,
        department: d.dept,
        jobTitle: d.title,
        role: "EMPLOYEE",
        supervisorId: supervisor.id,
      },
    });
    employees.push(emp);
  }

  // Create review cycle
  await prisma.reviewCycle.upsert({
    where: { id: "demo_cycle" },
    update: {},
    create: {
      id: "demo_cycle",
      name: "2025年下半年绩效考核",
      selfEvalStart: new Date("2026-03-17T00:00:00Z"),
      selfEvalEnd: new Date("2026-03-24T00:00:00Z"),
      peerReviewStart: new Date("2026-03-24T00:00:00Z"),
      peerReviewEnd: new Date("2026-03-27T00:00:00Z"),
      supervisorStart: new Date("2026-03-24T00:00:00Z"),
      supervisorEnd: new Date("2026-03-27T00:00:00Z"),
      calibrationStart: new Date("2026-03-27T00:00:00Z"),
      calibrationEnd: new Date("2026-03-30T00:00:00Z"),
      meetingStart: new Date("2026-03-30T00:00:00Z"),
      meetingEnd: new Date("2026-04-01T00:00:00Z"),
      status: "SELF_EVAL",
    },
  });

  console.log("Seed complete!");
  console.log(`Admin: ${admin.name} (${admin.id})`);
  console.log(`Supervisor: ${supervisor.name} (${supervisor.id})`);
  console.log(`Employees: ${employees.map((e) => e.name).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
