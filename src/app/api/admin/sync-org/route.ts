import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getTenantAccessToken, fetchFeishuDepartments, fetchFeishuDepartmentUsers } from "@/lib/feishu";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const maxDuration = 300;

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["ADMIN"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenantToken = await getTenantAccessToken();

    // Step 1: Fetch all departments
    const allDepartments: any[] = [];
    const queue = ["0"];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const depts = await fetchFeishuDepartments(tenantToken, parentId);
      for (const dept of depts as any[]) {
        allDepartments.push(dept);
        queue.push(dept.open_department_id);
      }
    }

    // Step 2: Collect all users (deduplicated)
    const uniqueUsers = new Map<string, { user: any; deptName: string }>();
    for (const dept of allDepartments) {
      const users = await fetchFeishuDepartmentUsers(tenantToken, dept.open_department_id);
      for (const u of users as any[]) {
        if (!uniqueUsers.has(u.open_id)) {
          uniqueUsers.set(u.open_id, { user: u, deptName: dept.name });
        }
      }
    }

    // Step 3: Upsert users sequentially (reliable)
    let syncCount = 0;
    for (const [, { user: u, deptName }] of uniqueUsers) {
      try {
        await prisma.user.upsert({
          where: { feishuOpenId: u.open_id },
          update: {
            name: u.name,
            email: u.email || null,
            avatarUrl: u.avatar?.avatar_origin || null,
            department: deptName,
            jobTitle: u.job_title || null,
          },
          create: {
            feishuOpenId: u.open_id,
            feishuUnionId: u.union_id || null,
            name: u.name,
            email: u.email || null,
            avatarUrl: u.avatar?.avatar_origin || null,
            department: deptName,
            jobTitle: u.job_title || null,
            role: "EMPLOYEE",
          },
        });
        syncCount++;
      } catch (e) {
        console.error(`Failed to sync user ${u.name}:`, e);
      }
    }

    // Step 4: Update supervisor relationships
    for (const [, { user: u }] of uniqueUsers) {
      if (u.leader_user_id) {
        try {
          const leader = await prisma.user.findFirst({
            where: { feishuOpenId: u.leader_user_id },
          });
          if (leader) {
            await prisma.user.update({
              where: { feishuOpenId: u.open_id },
              data: { supervisorId: leader.id },
            });
            if (leader.role === "EMPLOYEE") {
              await prisma.user.update({
                where: { id: leader.id },
                data: { role: "SUPERVISOR" },
              });
            }
          }
        } catch (e) {
          console.error(`Failed to set supervisor for ${u.name}:`, e);
        }
      }
    }

    // Preserve current user's ADMIN role
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    return NextResponse.json({ success: true, syncCount });
  } catch (error) {
    console.error("Sync org error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
