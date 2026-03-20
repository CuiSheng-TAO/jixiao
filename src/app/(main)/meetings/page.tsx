"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { usePreview } from "@/hooks/use-preview";

type MeetingData = {
  id: string;
  employee: { id: string; name: string; department: string };
  supervisor?: { id: string; name: string };
  meetingDate: string | null;
  notes: string;
  employeeAck: boolean;
};

function MeetingsContent() {
  const { preview, previewRole, getData } = usePreview();
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  useEffect(() => {
    if (preview && previewRole) {
      const previewData = getData("meetings") as { meetings: MeetingData[] };
      setMeetings(previewData.meetings || []);
      return;
    }

    fetch("/api/meeting").then((r) => r.json()).then((data) => {
      setMeetings(Array.isArray(data) ? data : []);
    });
  }, [preview, previewRole, getData]);

  const saveMeeting = async (employeeId: string) => {
    if (preview) return;
    try {
      await fetch("/api/meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, notes, meetingDate: meetingDate || null }),
      });
      toast.success("面谈记录已保存");
      const data = await fetch("/api/meeting").then((r) => r.json());
      setMeetings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("保存失败");
    }
  };

  const ackMeeting = async (meetingId: string) => {
    if (preview) return;
    try {
      await fetch("/api/meeting/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      toast.success("已确认");
      const data = await fetch("/api/meeting").then((r) => r.json());
      setMeetings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("操作失败");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">面谈记录</h1>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            暂无面谈记录
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            {meetings.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m.id);
                  setNotes(m.notes || "");
                  setMeetingDate(m.meetingDate?.slice(0, 10) || "");
                }}
                className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                  selected === m.id ? "border-primary bg-primary/10" : "hover:bg-muted"
                }`}
              >
                <div>
                  <p className="font-medium">{m.employee.name}</p>
                  <p className="text-xs text-muted-foreground">{m.employee.department}</p>
                </div>
                <Badge variant={m.employeeAck ? "default" : "secondary"}>
                  {m.employeeAck ? "已确认" : m.notes ? "已记录" : "待面谈"}
                </Badge>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    面谈记录 - {meetings.find((m) => m.id === selected)?.employee.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">面谈日期</label>
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="rounded-md border px-3 py-2 text-sm"
                      disabled={preview}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">面谈纪要</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="记录面谈要点、员工反馈、改进计划等..."
                      rows={8}
                      disabled={preview}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => saveMeeting(meetings.find((m) => m.id === selected)!.employee.id)}
                      disabled={preview}
                    >
                      保存记录
                    </Button>
                  </div>

                  {/* Employee ack button - shown when viewing as employee */}
                  {meetings.find((m) => m.id === selected)?.supervisor && !meetings.find((m) => m.id === selected)?.employeeAck && (
                    <div className="border-t pt-4">
                      <Button variant="outline" onClick={() => ackMeeting(selected)} disabled={preview}>
                        确认面谈结果
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  选择左侧记录查看详情
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20 text-muted-foreground">加载中...</div>}>
      <MeetingsContent />
    </Suspense>
  );
}
