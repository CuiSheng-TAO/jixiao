"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Users,
  UserCheck,
  BarChart3,
  MessageSquare,
  MessageSquareWarning,
  Settings,
  LogOut,
  Home,
  Eye,
  EyeOff,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreview } from "@/hooks/use-preview";
import type { PreviewRole } from "@/lib/preview";

type NavProps = {
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
    role: string;
  };
};

const navItems = [
  { href: "/guide", label: "使用指南", icon: BookOpen, roles: ["EMPLOYEE", "SUPERVISOR", "HRBP", "ADMIN"] },
  { href: "/dashboard", label: "首页", icon: Home, roles: ["EMPLOYEE", "SUPERVISOR", "HRBP", "ADMIN"] },
  { href: "/self-eval", label: "个人自评", icon: ClipboardList, roles: ["EMPLOYEE", "SUPERVISOR", "HRBP", "ADMIN"] },
  { href: "/peer-review", label: "360环评", icon: Users, roles: ["EMPLOYEE", "SUPERVISOR", "HRBP", "ADMIN"] },
  { href: "/team", label: "团队评估", icon: UserCheck, roles: ["SUPERVISOR", "HRBP", "ADMIN"] },
  { href: "/calibration", label: "绩效校准", icon: BarChart3, roles: ["HRBP", "ADMIN"] },
  { href: "/meetings", label: "面谈记录", icon: MessageSquare, roles: ["SUPERVISOR", "HRBP", "ADMIN"] },
  { href: "/appeal", label: "绩效申诉", icon: MessageSquareWarning, roles: ["EMPLOYEE", "SUPERVISOR", "HRBP", "ADMIN"] },
  { href: "/admin", label: "系统管理", icon: Settings, roles: ["ADMIN"] },
];

const previewRoles: { role: PreviewRole; label: string }[] = [
  { role: "EMPLOYEE", label: "员工视角" },
  { role: "SUPERVISOR", label: "主管视角" },
  { role: "ADMIN", label: "管理员视角" },
];

export function Nav({ user }: NavProps) {
  const pathname = usePathname();
  const { preview, previewRole, enterPreview, exitPreview } = usePreview();

  // 预览模式下用预览角色过滤菜单，否则用真实角色
  const activeRole = previewRole ?? user.role;
  const visibleItems = navItems.filter((item) => item.roles.includes(activeRole));

  // 构造带preview参数的链接
  function buildHref(href: string): string {
    if (!preview) return href;
    return `${href}?preview=${previewRole}`;
  }

  return (
    <nav className="flex h-screen w-56 flex-col border-r bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <BarChart3 className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">绩效系统</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const classes = cn(
            "flex items-center gap-3 mx-2 rounded-md px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          );
          return preview ? (
            <a key={item.href} href={buildHref(item.href)} className={classes}>
              <Icon className="h-4 w-4" />
              {item.label}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={classes}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* 角色预览区域 */}
      <div className="border-t px-3 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {preview ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          <span>角色预览</span>
        </div>
        <div className="space-y-1">
          {previewRoles.map(({ role, label }) => (
            <button
              key={role}
              onClick={() => enterPreview(role)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                previewRole === role
                  ? "bg-amber-100 text-amber-800 font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full border",
                  previewRole === role
                    ? "border-amber-600 bg-amber-500"
                    : "border-border"
                )}
              />
              {label}
            </button>
          ))}
        </div>
        {preview && (
          <button
            onClick={exitPreview}
            className="mt-2 w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
          >
            退出预览
          </button>
        )}
      </div>

      <div className="border-t p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 hover:bg-muted">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback>{user.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {{ ADMIN: "管理员", HRBP: "HRBP", SUPERVISOR: "主管", EMPLOYEE: "员工" }[user.role]}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <a href="/api/auth/signout" className="flex items-center">
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
