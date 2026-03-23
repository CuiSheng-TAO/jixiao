"use client";

import { useEffect, useState, Suspense } from "react";
import { PageSkeleton } from "@/components/page-skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import { usePreview } from "@/hooks/use-preview";

type ImportItem = {
  name: string;
  content: string;
  sourceUrl?: string;
};

type ImportResult = {
  total: number;
  successCount: number;
  failureCount: number;
  successes: string[];
  failures: { name: string; reason: string }[];
};

type Cycle = {
  id: string;
  name: string;
  status: string;
  selfEvalStart: string;
  selfEvalEnd: string;
  peerReviewStart: string;
  peerReviewEnd: string;
  supervisorStart: string;
  supervisorEnd: string;
  calibrationStart: string;
  calibrationEnd: string;
  meetingStart: string;
  meetingEnd: string;
  appealStart: string | null;
  appealEnd: string | null;
};

type UserItem = {
  id: string;
  name: string;
  email: string | null;
  department: string;
  jobTitle: string | null;
  role: string;
  supervisor: { id: string; name: string } | null;
};

const statusFlow = ["DRAFT", "SELF_EVAL", "PEER_REVIEW", "SUPERVISOR_EVAL", "CALIBRATION", "MEETING", "APPEAL", "ARCHIVED"];
const statusLabels: Record<string, string> = {
  DRAFT: "未开始",
  SELF_EVAL: "个人自评",
  PEER_REVIEW: "360环评",
  SUPERVISOR_EVAL: "上级评估",
  CALIBRATION: "绩效校准",
  MEETING: "面谈",
  APPEAL: "申诉",
  ARCHIVED: "已归档",
};

function AdminContent() {
  const { preview, previewRole, getData } = usePreview();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [importText, setImportText] = useState("");
  const [importParsed, setImportParsed] = useState<ImportItem[]>([]);
  const [importParseError, setImportParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [newCycle, setNewCycle] = useState({
    name: "2025年下半年绩效考核",
    selfEvalStart: "2026-03-17",
    selfEvalEnd: "2026-03-24",
    peerReviewStart: "2026-03-24",
    peerReviewEnd: "2026-03-27",
    supervisorStart: "2026-03-24",
    supervisorEnd: "2026-03-27",
    calibrationStart: "2026-03-27",
    calibrationEnd: "2026-03-30",
    meetingStart: "2026-03-30",
    meetingEnd: "2026-04-01",
    appealStart: "2026-04-01",
    appealEnd: "2026-04-04",
  });

  useEffect(() => {
    if (preview && previewRole) {
      const previewData = getData("admin") as Record<string, unknown>;
      setCycles((previewData.cycles as Cycle[]) || []);
      setUsers((previewData.users as UserItem[]) || []);
      return;
    }

    fetch("/api/admin/cycle").then((r) => r.json()).then((d) => Array.isArray(d) ? setCycles(d) : null);
    fetch("/api/admin/users").then((r) => r.json()).then((d) => Array.isArray(d) ? setUsers(d) : null);
  }, [preview, previewRole, getData]);

  const createCycle = async () => {
    if (preview) return;
    try {
      await fetch("/api/admin/cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCycle),
      });
      toast.success("考核周期已创建");
      setShowCreate(false);
      const data = await fetch("/api/admin/cycle").then((r) => r.json());
      setCycles(data);
    } catch {
      toast.error("创建失败");
    }
  };

  const updateCycleStatus = async (cycleId: string, status: string) => {
    if (preview) return;
    if (!confirm(`确认将考核周期推进到「${statusLabels[status]}」阶段？`)) return;
    try {
      await fetch("/api/admin/cycle", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cycleId, status }),
      });
      toast.success("状态已更新");
      const data = await fetch("/api/admin/cycle").then((r) => r.json());
      setCycles(data);
    } catch {
      toast.error("更新失败");
    }
  };

  const syncOrg = async () => {
    if (preview) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/sync-org", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`同步成功，共同步 ${data.syncCount} 名员工`);
      const usersData = await fetch("/api/admin/users").then((r) => r.json());
      setUsers(usersData);
    } catch (e) {
      toast.error("同步失败: " + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setSyncing(false);
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    if (preview) return;
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role }),
      });
      toast.success("角色已更新");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch {
      toast.error("更新失败");
    }
  };

  const parseImportData = (text: string) => {
    setImportText(text);
    setImportParseError("");
    setImportParsed([]);
    setImportResult(null);

    if (!text.trim()) return;

    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        setImportParseError("数据必须是JSON数组格式");
        return;
      }
      const valid = parsed.every(
        (item: Record<string, unknown>) => typeof item.name === "string" && typeof item.content === "string"
      );
      if (!valid) {
        setImportParseError("每条记录必须包含 name 和 content 字段");
        return;
      }
      setImportParsed(parsed as ImportItem[]);
    } catch {
      // Try CSV parsing: name,content per line
      try {
        const lines = text.trim().split("\n").filter((l) => l.trim());
        if (lines.length === 0) return;

        const firstLine = lines[0].toLowerCase();
        const startIdx = firstLine.includes("姓名") || firstLine.includes("name") ? 1 : 0;

        const items: ImportItem[] = [];
        for (let i = startIdx; i < lines.length; i++) {
          const commaIdx = lines[i].indexOf(",");
          if (commaIdx === -1) {
            setImportParseError(`第 ${i + 1} 行格式错误，缺少逗号分隔符`);
            return;
          }
          const name = lines[i].slice(0, commaIdx).trim();
          const content = lines[i].slice(commaIdx + 1).trim();
          if (name && content) {
            items.push({ name, content });
          }
        }
        if (items.length === 0) {
          setImportParseError("未解析到有效数据");
          return;
        }
        setImportParsed(items);
      } catch {
        setImportParseError("无法解析数据，请使用JSON数组或CSV格式");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      parseImportData(text);
    };
    reader.readAsText(file);
  };

  const executeImport = async () => {
    if (preview) return;
    if (importParsed.length === 0) return;
    if (!confirm(`确认导入 ${importParsed.length} 条自评记录？`)) return;

    setImporting(true);
    try {
      const res = await fetch("/api/admin/import-self-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importParsed),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setImportResult(result);
      toast.success(`导入完成：成功 ${result.successCount} 人，失败 ${result.failureCount} 人`);
    } catch (e) {
      toast.error("导入失败: " + (e instanceof Error ? e.message : "未知错误"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="系统管理" description="考核周期、员工与数据管理" />

      <Tabs defaultValue="cycle">
        <TabsList>
          <TabsTrigger value="cycle">考核周期</TabsTrigger>
          <TabsTrigger value="users">员工管理 ({users.length})</TabsTrigger>
          <TabsTrigger value="sync">组织同步</TabsTrigger>
          <TabsTrigger value="import">自评导入</TabsTrigger>
        </TabsList>

        <TabsContent value="cycle" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreate(!showCreate)} disabled={preview}>
              {showCreate ? "取消" : "创建考核周期"}
            </Button>
          </div>

          {showCreate && !preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">创建考核周期</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">周期名称</label>
                  <input
                    value={newCycle.name}
                    onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm shadow-xs transition-all duration-[var(--transition-base)] hover:border-border focus:border-ring focus:shadow-sm focus:outline-none focus:ring-3 focus:ring-ring/20"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "自评开始", key: "selfEvalStart" },
                    { label: "自评截止", key: "selfEvalEnd" },
                    { label: "环评开始", key: "peerReviewStart" },
                    { label: "环评截止", key: "peerReviewEnd" },
                    { label: "上级评估开始", key: "supervisorStart" },
                    { label: "上级评估截止", key: "supervisorEnd" },
                    { label: "校准开始", key: "calibrationStart" },
                    { label: "校准截止", key: "calibrationEnd" },
                    { label: "面谈开始", key: "meetingStart" },
                    { label: "面谈截止", key: "meetingEnd" },
                    { label: "申诉开始", key: "appealStart" },
                    { label: "申诉截止", key: "appealEnd" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-gray-500">{label}</label>
                      <input
                        type="date"
                        value={newCycle[key as keyof typeof newCycle]}
                        onChange={(e) => setNewCycle({ ...newCycle, [key]: e.target.value })}
                        className="h-9 w-full rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm shadow-xs transition-all duration-[var(--transition-base)] hover:border-border focus:border-ring focus:shadow-sm focus:outline-none focus:ring-3 focus:ring-ring/20"
                      />
                    </div>
                  ))}
                </div>
                <Button onClick={createCycle}>创建</Button>
              </CardContent>
            </Card>
          )}

          {cycles.map((cycle) => {
            const currentIdx = statusFlow.indexOf(cycle.status);
            const nextStatus = statusFlow[currentIdx + 1];

            return (
              <Card key={cycle.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{cycle.name}</CardTitle>
                      <CardDescription>
                        {new Date(cycle.selfEvalStart).toLocaleDateString()} - {new Date(cycle.meetingEnd).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge>{statusLabels[cycle.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {statusFlow.map((s, i) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <div
                          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                            i <= currentIdx
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground/60"
                          }`}
                        >
                          {statusLabels[s]}
                        </div>
                        {i < statusFlow.length - 1 && (
                          <span className={`text-xs ${i < currentIdx ? "text-primary/40" : "text-border"}`}>{"\u203A"}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {nextStatus && (
                    <div className="mt-4">
                      <Button size="sm" onClick={() => updateCycleStatus(cycle.id, nextStatus)} disabled={preview}>
                        推进到「{statusLabels[nextStatus]}」
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-4 pb-0">
              <input
                type="text"
                placeholder="搜索姓名、部门、职位..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-9 w-full max-w-sm rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm shadow-xs transition-all hover:border-border focus:border-ring focus:shadow-sm focus:outline-none focus:ring-3 focus:ring-ring/20"
              />
            </CardContent>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>职位</TableHead>
                    <TableHead>上级</TableHead>
                    <TableHead className="text-center">角色</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.filter((u) => {
                    if (!userSearch) return true;
                    const q = userSearch.toLowerCase();
                    return (u.name?.toLowerCase().includes(q)) || (u.department?.toLowerCase().includes(q)) || (u.jobTitle?.toLowerCase().includes(q)) || (u.supervisor?.name?.toLowerCase().includes(q));
                  }).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.department}</TableCell>
                      <TableCell className="text-muted-foreground">{u.jobTitle || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.supervisor?.name || "-"}</TableCell>
                      <TableCell className="text-center">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs transition-colors focus:border-primary focus:outline-none"
                          disabled={preview}
                        >
                          <option value="EMPLOYEE">员工</option>
                          <option value="SUPERVISOR">主管</option>
                          <option value="HRBP">HRBP</option>
                          <option value="ADMIN">管理员</option>
                        </select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">飞书组织架构同步</CardTitle>
              <CardDescription>
                从飞书同步部门和员工信息，自动设置上下级关系
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={syncOrg} disabled={syncing || preview}>
                {syncing ? "同步中..." : "立即同步"}
              </Button>
              <p className="mt-2 text-xs text-gray-400">
                需要在飞书开放平台配置应用权限：contact:contact:readonly_as_app
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">批量导入自评</CardTitle>
              <CardDescription>
                从飞书多维表格导出自评数据后，粘贴JSON或上传CSV文件导入系统
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs text-blue-700">
                  <strong>JSON格式：</strong>{" "}
                  {`[{ "name": "张三", "content": "自评内容..." }, ...]`}
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  <strong>CSV格式：</strong> 每行一条，格式为「姓名,自评内容」
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">上传文件</label>
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  disabled={preview}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">或粘贴数据</label>
                <Textarea
                  value={importText}
                  onChange={(e) => parseImportData(e.target.value)}
                  placeholder={'粘贴JSON数组或CSV内容...\n例如：[{"name":"张三","content":"本周期完成了..."}]'}
                  rows={8}
                  disabled={preview}
                />
              </div>

              {importParseError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {importParseError}
                </div>
              )}
            </CardContent>
          </Card>

          {importParsed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  数据预览（共 {importParsed.length} 条）
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>序号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>自评内容预览</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importParsed.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {item.content.slice(0, 80)}
                        {item.content.length > 80 ? "..." : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </CardContent>
            </Card>
          )}

          {importParsed.length > 0 && !importResult && (
            <div className="flex justify-end">
              <Button onClick={executeImport} disabled={importing || preview}>
                {importing ? "导入中..." : `确认导入（${importParsed.length} 条）`}
              </Button>
            </div>
          )}

          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">导入结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4">
                  <div className="rounded-lg bg-green-50 px-4 py-2">
                    <div className="text-2xl font-bold text-green-700">{importResult.successCount}</div>
                    <div className="text-xs text-green-600">成功</div>
                  </div>
                  <div className="rounded-lg bg-red-50 px-4 py-2">
                    <div className="text-2xl font-bold text-red-700">{importResult.failureCount}</div>
                    <div className="text-xs text-red-600">失败</div>
                  </div>
                </div>

                {importResult.failures.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-red-700">失败详情：</p>
                    <ul className="space-y-1">
                      {importResult.failures.map((f, idx) => (
                        <li key={idx} className="text-sm text-red-600">
                          {f.name} - {f.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}
