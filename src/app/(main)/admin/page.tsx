"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePreview } from "@/hooks/use-preview";
import { cycleStatusConfig } from "@/lib/status";

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
    if (!confirm(`确认将考核周期推进到「${cycleStatusConfig[status]?.label}」阶段？`)) return;
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
      <h1 className="text-2xl font-semibold">系统管理</h1>

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
                    className="w-full rounded-md border px-3 py-2 text-sm"
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
                      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
                      <input
                        type="date"
                        value={newCycle[key as keyof typeof newCycle]}
                        onChange={(e) => setNewCycle({ ...newCycle, [key]: e.target.value })}
                        className="w-full rounded-md border px-3 py-2 text-sm"
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
                    <Badge variant={cycleStatusConfig[cycle.status]?.variant as any}>{cycleStatusConfig[cycle.status]?.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {statusFlow.map((s, i) => (
                      <div key={s} className="flex items-center gap-2">
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            i <= currentIdx ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {cycleStatusConfig[s]?.label}
                        </div>
                        {i < statusFlow.length - 1 && <span className="text-border">{"\u2192"}</span>}
                      </div>
                    ))}
                  </div>
                  {nextStatus && (
                    <div className="mt-4">
                      <Button size="sm" onClick={() => updateCycleStatus(cycle.id, nextStatus)} disabled={preview}>
                        推进到「{cycleStatusConfig[nextStatus]?.label}」
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
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="px-4 py-3 text-left font-medium">姓名</th>
                    <th className="px-4 py-3 text-left font-medium">部门</th>
                    <th className="px-4 py-3 text-left font-medium">职位</th>
                    <th className="px-4 py-3 text-left font-medium">上级</th>
                    <th className="px-4 py-3 text-center font-medium">角色</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-muted">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.department}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.jobTitle || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.supervisor?.name || "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                          className="rounded border px-2 py-1 text-xs"
                          disabled={preview}
                        >
                          <option value="EMPLOYEE">员工</option>
                          <option value="SUPERVISOR">主管</option>
                          <option value="HRBP">HRBP</option>
                          <option value="ADMIN">管理员</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <p className="mt-2 text-xs text-muted-foreground">
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
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-3">
                <p className="text-xs text-primary">
                  <strong>JSON格式：</strong>{" "}
                  {`[{ "name": "张三", "content": "自评内容..." }, ...]`}
                </p>
                <p className="mt-1 text-xs text-primary">
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
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="px-4 py-3 text-left font-medium">序号</th>
                      <th className="px-4 py-3 text-left font-medium">姓名</th>
                      <th className="px-4 py-3 text-left font-medium">自评内容预览</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importParsed.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted">
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="max-w-md truncate px-4 py-3 text-muted-foreground">
                          {item.content.slice(0, 80)}
                          {item.content.length > 80 ? "..." : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">加载中...</div>}>
      <AdminContent />
    </Suspense>
  );
}
