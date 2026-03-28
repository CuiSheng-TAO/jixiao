"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type MemberRosterUser = {
  id: string;
  name: string;
  department: string;
  role: string;
};

type MemberRosterCardProps = {
  title: string;
  description: string;
  members: MemberRosterUser[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  disabled?: boolean;
  overlapLabelsByUserId?: Record<string, string[]>;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export function MemberRosterCard({
  title,
  description,
  members,
  selectedIds,
  onChange,
  disabled = false,
  overlapLabelsByUserId = {},
}: MemberRosterCardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const selectedMembers = useMemo(
    () => selectedIds.map((id) => membersById.get(id)).filter((member): member is MemberRosterUser => Boolean(member)),
    [membersById, selectedIds],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const searchResults = useMemo(() => {
    const query = normalizeQuery(searchQuery);
    if (!query) return [];

    return members
      .filter((member) => {
        if (selectedIdSet.has(member.id)) return false;
        const haystack = `${member.name} ${member.department} ${member.role}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [members, searchQuery, selectedIdSet]);

  const handleAdd = (userId: string) => {
    if (disabled || selectedIdSet.has(userId)) return;
    onChange([...selectedIds, userId]);
    setSearchQuery("");
  };

  const handleRemove = (userId: string) => {
    if (disabled) return;
    onChange(selectedIds.filter((id) => id !== userId));
  };

  return (
    <Card className="border-border/60 bg-card/80 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-muted-foreground" />
          <span>{title}</span>
          <Badge variant="secondary">{selectedIds.length}</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">已选成员</p>
            <p className="text-xs text-muted-foreground">搜索添加，逐个移除，不支持批量替换</p>
          </div>

          {selectedMembers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
              还没有成员加入这个名单。
            </div>
          ) : (
            <div className="space-y-2">
              {selectedMembers.map((member) => {
                const overlapLabels = overlapLabelsByUserId[member.id] || [];
                return (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5",
                      overlapLabels.length > 0 && "border-amber-200 bg-amber-50/50",
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{member.name}</span>
                        <Badge variant="secondary">{member.department || "未分配部门"}</Badge>
                        <Badge variant="outline">{member.role}</Badge>
                      </div>
                      {overlapLabels.length > 0 && (
                        <p className="text-xs text-amber-700">
                          同时也在：{overlapLabels.join("、")}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(member.id)}
                      disabled={disabled}
                      aria-label={`移除 ${member.name}`}
                    >
                      <X />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Search className="size-4 text-muted-foreground" />
            搜索成员
          </label>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="输入姓名、部门或角色..."
            disabled={disabled}
          />

          {!normalizeQuery(searchQuery) ? (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">
              输入关键词后添加成员，当前列表不会展示整个人员池。
            </div>
          ) : searchResults.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">
              没有找到匹配成员。
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-background">
              <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 text-xs text-muted-foreground">
                <span>可添加成员</span>
                <span>仅显示前 {searchResults.length} 条匹配结果</span>
              </div>
              <div className="divide-y divide-border/50">
                {searchResults.map((member) => {
                  const overlapLabels = overlapLabelsByUserId[member.id] || [];
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{member.name}</span>
                          <Badge variant="secondary">{member.department || "未分配部门"}</Badge>
                          <Badge variant="outline">{member.role}</Badge>
                        </div>
                        {overlapLabels.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            同时也在：{overlapLabels.join("、")}
                          </p>
                        )}
                      </div>
                      <Button type="button" variant="outline" size="xs" onClick={() => handleAdd(member.id)} disabled={disabled}>
                        <Plus />
                        添加
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
