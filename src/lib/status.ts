export const cycleStatusConfig: Record<string, { label: string; variant: string }> = {
  DRAFT: { label: "未开始", variant: "secondary" },
  SELF_EVAL: { label: "个人自评中", variant: "default" },
  PEER_REVIEW: { label: "360环评中", variant: "default" },
  SUPERVISOR_EVAL: { label: "上级评估中", variant: "warning" },
  CALIBRATION: { label: "绩效校准中", variant: "warning" },
  MEETING: { label: "面谈中", variant: "success" },
  APPEAL: { label: "申诉中", variant: "warning" },
  ARCHIVED: { label: "已归档", variant: "secondary" },
};

export const evalStatusConfig: Record<string, { label: string; variant: string }> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  SUBMITTED: { label: "已提交", variant: "success" },
  IMPORTED: { label: "已导入", variant: "success" },
  CONFIRMED: { label: "已确认", variant: "success" },
  DECLINED: { label: "已拒绝", variant: "destructive" },
  PENDING: { label: "待处理", variant: "warning" },
  APPROVED: { label: "已确认", variant: "success" },
};
