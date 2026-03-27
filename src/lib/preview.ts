export type PreviewRole = "EMPLOYEE" | "SUPERVISOR" | "ADMIN";

export function isPreviewMode(searchParams: URLSearchParams): boolean {
  void searchParams;
  return false;
}

export function getPreviewRole(searchParams: URLSearchParams): PreviewRole | null {
  void searchParams;
  return null;
}

export const PREVIEW_ROLE_LABELS: Record<PreviewRole, string> = {
  EMPLOYEE: "员工",
  SUPERVISOR: "主管",
  ADMIN: "管理员",
};

// ============================================================
// 模拟数据
// ============================================================

export function getPreviewData(role: PreviewRole, page: string): Record<string, unknown> {
  const dataMap: Record<string, Record<string, Record<string, unknown>>> = {
    dashboard: {
      EMPLOYEE: {
        user: { name: "李明", role: "EMPLOYEE" },
        cycle: {
          name: "2025年下半年绩效考核",
          status: "PEER_REVIEW",
        },
        selfEvalStatus: "SUBMITTED",
        pendingPeerReviews: 2,
        pendingTeamEvals: 0,
        hasAppeal: true,
      },
      SUPERVISOR: {
        user: { name: "王芳", role: "SUPERVISOR" },
        cycle: {
          name: "2025年下半年绩效考核",
          status: "SUPERVISOR_EVAL",
        },
        selfEvalStatus: "SUBMITTED",
        pendingPeerReviews: 1,
        pendingTeamEvals: 5,
        hasAppeal: true,
      },
      ADMIN: {
        user: { name: "赵敏", role: "ADMIN" },
        cycle: {
          name: "2025年下半年绩效考核",
          status: "CALIBRATION",
        },
        selfEvalStatus: "SUBMITTED",
        pendingPeerReviews: 0,
        pendingTeamEvals: 3,
        hasAppeal: true,
      },
    },

    "self-eval": {
      EMPLOYEE: {
        importedContent:
          "一、本周期核心成果\n\n1. 完成了用户增长平台 v2.0 的全部前端开发，DAU 提升 23%\n2. 主导设计了新的 A/B 测试框架，支持多维度对比实验\n3. 优化了首页加载性能，LCP 从 3.2s 降低到 1.1s\n\n二、协作与沟通\n\n积极参与跨部门需求评审，与产品、设计、后端团队保持高效协作。本周期共参与 12 次跨团队会议，推动 3 个跨部门项目落地。\n\n三、价值观践行\n\n坚持 ROOT 文化，主动分享技术经验，在团队内开展 2 次技术分享。积极拥抱 AI 工具，使用 Cursor 和 Claude 提升编码效率约 40%。",
        importedAt: "2026-03-18T10:30:00Z",
        sourceUrl: "https://deepwisdom.feishu.cn/wiki/example",
        status: "SUBMITTED",
      },
      SUPERVISOR: {
        viewType: "supervisor",
        message: "主管视角：可查看下属已提交的自评内容，但无需填写自评表单。",
        employees: [
          {
            name: "李明",
            department: "前端开发",
            status: "SUBMITTED",
            importedContent: "一、本周期核心成果\n\n1. 完成用户增长平台 v2.0 前端开发，DAU 提升 23%。\n2. 主导设计了新的 A/B 测试框架，支持多维度对比实验。\n3. 优化了首页加载性能，LCP 从 3.2s 降低到 1.1s。\n\n二、协作与沟通\n\n积极参与跨部门需求评审，与产品、设计、后端团队保持高效协作。\n\n三、价值观践行\n\n坚持 ROOT 文化，主动分享技术经验，在团队内开展 2 次技术分享。",
          },
          {
            name: "张伟",
            department: "产品部",
            status: "SUBMITTED",
            importedContent: "一、本周期核心成果\n\n1. 完成了 3 个核心功能的产品方案设计与上线。\n2. 推动用户反馈机制优化，NPS 提升 15 分。\n\n二、协作与沟通\n\n与技术、设计团队紧密配合，确保产品按期交付。\n\n三、价值观践行\n\n积极推动数据驱动决策，建立产品数据看板。",
          },
          {
            name: "陈静",
            department: "设计部",
            status: "DRAFT",
            importedContent: "",
          },
        ],
      },
      ADMIN: {
        viewType: "admin",
        message: "管理员视角：可查看所有员工的自评提交状态和内容汇总。",
      },
    },

    "peer-review": {
      EMPLOYEE: {
        reviews: [
          {
            id: "pr-1",
            reviewee: { id: "u-2", name: "张伟", department: "产品部" },
            outputScore: 4,
            outputComment: "产品规划清晰，交付节奏稳定",
            collaborationScore: 5,
            collaborationComment: "跨团队沟通非常顺畅",
            valuesScore: 4,
            valuesComment: "积极践行 ROOT 文化",
            innovationScore: null,
            innovationComment: "",
            declinedAt: null,
            declineReason: "",
            status: "DRAFT",
          },
          {
            id: "pr-2",
            reviewee: { id: "u-3", name: "陈静", department: "设计部" },
            outputScore: null,
            outputComment: "",
            collaborationScore: null,
            collaborationComment: "",
            valuesScore: null,
            valuesComment: "",
            innovationScore: null,
            innovationComment: "",
            declinedAt: null,
            declineReason: "",
            status: "DRAFT",
          },
        ],
        nominations: [
          {
            id: "nom-1",
            nominee: { id: "u-4", name: "刘洋", department: "后端开发" },
            supervisorStatus: "APPROVED",
            nomineeStatus: "ACCEPTED",
          },
          {
            id: "nom-2",
            nominee: { id: "u-5", name: "赵雪", department: "QA" },
            supervisorStatus: "APPROVED",
            nomineeStatus: "PENDING",
          },
          {
            id: "nom-3",
            nominee: { id: "u-6", name: "孙磊", department: "运维" },
            supervisorStatus: "PENDING",
            nomineeStatus: "PENDING",
          },
        ],
      },
      SUPERVISOR: {
        reviews: [],
        nominations: [],
        confirmNominations: [
          {
            id: "cn-1",
            nominator: { id: "u-7", name: "周婷", department: "前端开发" },
            nominee: { id: "u-8", name: "吴强", department: "后端开发" },
            supervisorStatus: "PENDING",
          },
          {
            id: "cn-2",
            nominator: { id: "u-7", name: "周婷", department: "前端开发" },
            nominee: { id: "u-9", name: "郑丽", department: "产品部" },
            supervisorStatus: "APPROVED",
          },
        ],
      },
      ADMIN: {
        reviews: [],
        nominations: [],
      },
    },

    team: {
      EMPLOYEE: {},
      SUPERVISOR: {
        evals: [
          {
            employee: { id: "e-1", name: "李明", department: "前端开发", jobTitle: "高级工程师" },
            evaluation: { id: "ev-1", performanceStars: 4, performanceComment: "产出质量高", abilityStars: 4, abilityComment: "学习能力强", valuesStars: 3, valuesComment: "价值观践行良好", weightedScore: 3.8, status: "DRAFT" },
            selfEval: { status: "SUBMITTED", importedContent: "一、本周期核心成果\n\n1. 完成用户增长平台 v2.0 的全部前端开发，DAU 提升 23%\n2. 主导设计了新的 A/B 测试框架，支持多维度对比实验\n3. 优化了首页加载性能，LCP 从 3.2s 降低到 1.1s\n\n二、协作与沟通\n\n积极参与跨部门需求评审，与产品、设计、后端团队保持高效协作。本周期共参与 12 次跨团队会议，推动 3 个跨部门项目落地。\n\n三、价值观践行\n\n坚持 ROOT 文化，主动分享技术经验，在团队内开展 2 次技术分享。积极拥抱 AI 工具，使用 Cursor 和 Claude 提升编码效率约 40%。" },
            peerReviewSummary: { output: 4.2, collaboration: 4.5, values: 4.0, count: 3, expectedCount: 5, reviews: [
              { outputScore: 4, outputComment: "前端交付质量高，v2.0项目按时上线", collaborationScore: 5, collaborationComment: "跨团队沟通非常积极主动", valuesScore: 4, valuesComment: "坚持代码质量标准，主动分享技术经验", innovationScore: null, innovationComment: "" },
              { outputScore: 4, outputComment: "A/B测试框架设计合理，复用性强", collaborationScore: 4, collaborationComment: "需求评审参与度高", valuesScore: 4, valuesComment: "积极拥抱AI工具提效", innovationScore: 4, innovationComment: "A/B框架的设计思路很有创新性" },
              { outputScore: 5, outputComment: "首页性能优化效果显著", collaborationScore: 5, collaborationComment: "主动帮助后端同事排查前端问题", valuesScore: 4, valuesComment: "技术分享质量高，团队收益大", innovationScore: null, innovationComment: "" },
            ] },
          },
          {
            employee: { id: "e-2", name: "张伟", department: "产品部", jobTitle: "产品经理" },
            evaluation: null,
            selfEval: { status: "SUBMITTED", importedContent: "一、本周期核心成果\n\n1. 主导完成 3 个核心产品迭代，用户满意度提升 15%\n2. 完成用户反馈机制优化，NPS 评分从 32 提升至 47\n3. 推动搭建产品数据看板，实现核心指标实时监控\n\n二、协作与沟通\n\n与技术、设计团队紧密配合，确保产品按期交付。主导 PRD 评审 8 次，需求变更率控制在 10% 以内。组织用户调研 3 次，输出调研报告并推动落地。\n\n三、价值观践行\n\n积极推动数据驱动决策文化，在团队内建立数据复盘机制。主动承担新人带教工作，帮助 2 名新人快速融入团队。" },
            peerReviewSummary: { output: 3.8, collaboration: 4.0, values: 3.5, count: 2, expectedCount: 4, reviews: [
              { outputScore: 4, outputComment: "产品迭代节奏把控好", collaborationScore: 4, collaborationComment: "PRD评审充分，需求清晰", valuesScore: 3, valuesComment: "数据驱动意识强", innovationScore: null, innovationComment: "" },
              { outputScore: 4, outputComment: "用户调研有深度", collaborationScore: 4, collaborationComment: "跨团队协调能力强", valuesScore: 4, valuesComment: "带教新人很有耐心", innovationScore: null, innovationComment: "" },
            ] },
          },
          {
            employee: { id: "e-3", name: "陈静", department: "设计部", jobTitle: "UI设计师" },
            evaluation: { id: "ev-3", performanceStars: 5, performanceComment: "设计质量卓越", abilityStars: 4, abilityComment: "专业能力突出", valuesStars: 5, valuesComment: "团队标杆", weightedScore: 4.7, status: "SUBMITTED" },
            selfEval: { status: "SUBMITTED", importedContent: "一、本周期核心成果\n\n1. 完成 20+ 页面设计，建立统一设计规范（Design Tokens + 组件库）\n2. 主导品牌升级项目，完成全套 VI 视觉物料输出\n3. 设计效率工具链优化，引入 Figma Variables，组件复用率提升至 75%\n\n二、协作与沟通\n\n与前端团队建立设计走查机制，还原度从 80% 提升至 95%。参与产品早期需求讨论，提前介入交互方案设计，减少返工。与市场部配合完成 2 次营销活动视觉方案。\n\n三、价值观践行\n\n组织设计团队内部分享 4 次，涵盖动效设计、无障碍设计等主题。推动建立设计评审制度，提升整体设计产出质量。积极参与公司文化建设，设计内部活动海报和文化周边。" },
            peerReviewSummary: { output: 4.5, collaboration: 4.8, values: 4.6, count: 5, expectedCount: 5, reviews: [
              { outputScore: 5, outputComment: "设计规范体系建设非常完善", collaborationScore: 5, collaborationComment: "设计走查机制显著提升了还原度", valuesScore: 5, valuesComment: "团队分享质量极高", innovationScore: null, innovationComment: "" },
              { outputScore: 4, outputComment: "品牌升级视觉方案专业", collaborationScore: 5, collaborationComment: "提前介入需求讨论减少了很多返工", valuesScore: 4, valuesComment: "乐于帮助其他同事解决设计问题", innovationScore: null, innovationComment: "" },
              { outputScore: 5, outputComment: "Figma组件库大幅提升了团队效率", collaborationScore: 5, collaborationComment: "与市场部配合非常默契", valuesScore: 5, valuesComment: "文化建设贡献突出", innovationScore: 5, innovationComment: "Design Tokens方案很有前瞻性" },
              { outputScore: 4, outputComment: "页面设计质量稳定", collaborationScore: 4, collaborationComment: "沟通及时高效", valuesScore: 5, valuesComment: "设计评审制度推动得很好", innovationScore: null, innovationComment: "" },
              { outputScore: 5, outputComment: "视觉物料输出质量卓越", collaborationScore: 5, collaborationComment: "跨部门协作标杆", valuesScore: 4, valuesComment: "积极参与公司活动", innovationScore: null, innovationComment: "" },
            ] },
          },
          {
            employee: { id: "e-4", name: "刘洋", department: "后端开发", jobTitle: "工程师" },
            evaluation: null,
            selfEval: null,
            peerReviewSummary: { output: 0, collaboration: 0, values: 0, count: 0, expectedCount: 0, reviews: [] },
          },
          {
            employee: { id: "e-5", name: "赵雪", department: "QA", jobTitle: "测试工程师" },
            evaluation: null,
            selfEval: { status: "SUBMITTED", importedContent: "一、本周期核心成果\n\n1. 建立自动化测试体系，测试覆盖率从 45% 提升到 82%\n2. 搭建 CI/CD 集成测试流水线，上线前自动回归，拦截线上缺陷 12 个\n3. 编写测试用例 350+，覆盖核心业务流程和边界场景\n\n二、协作与沟通\n\n与开发团队建立 Bug Bash 机制，每次迭代上线前组织全员测试。推动开发团队编写单元测试，协助制定测试规范。及时跟进线上反馈，协调修复优先级。\n\n三、价值观践行\n\n推动质量文化建设，在团队内组织 \"质量周\" 活动。主动学习性能测试和安全测试技能，拓展测试能力边界。" },
            peerReviewSummary: { output: 3.5, collaboration: 4.2, values: 3.8, count: 3, expectedCount: 3, reviews: [
              { outputScore: 3, outputComment: "测试覆盖率提升明显", collaborationScore: 4, collaborationComment: "Bug Bash机制推动得好", valuesScore: 4, valuesComment: "质量文化建设有成效", innovationScore: null, innovationComment: "" },
              { outputScore: 4, outputComment: "CI/CD流水线拦截了多个线上缺陷", collaborationScore: 4, collaborationComment: "协助制定测试规范很专业", valuesScore: 4, valuesComment: "主动学习新技能", innovationScore: null, innovationComment: "" },
              { outputScore: 4, outputComment: "测试用例覆盖全面", collaborationScore: 5, collaborationComment: "跟进线上反馈非常及时", valuesScore: 3, valuesComment: "质量周活动组织得不错", innovationScore: null, innovationComment: "" },
            ] },
          },
        ],
        nominations: [
          {
            id: "tn-1",
            nominator: { id: "e-1", name: "李明", department: "前端开发" },
            nominee: { id: "e-4", name: "刘洋", department: "后端开发" },
            supervisorStatus: "PENDING",
          },
        ],
      },
      ADMIN: {
        evals: [],
        nominations: [],
      },
    },

    calibration: {
      EMPLOYEE: {},
      SUPERVISOR: {},
      ADMIN: {
        data: [
          { user: { id: "c-1", name: "李明", department: "前端开发", jobTitle: "高级工程师" }, selfEvalStatus: "imported", peerAvg: "4.2", supervisorWeighted: 3.8, proposedStars: 4, finalStars: null },
          { user: { id: "c-2", name: "张伟", department: "产品部", jobTitle: "产品经理" }, selfEvalStatus: "imported", peerAvg: "3.8", supervisorWeighted: 3.5, proposedStars: 3, finalStars: 3 },
          { user: { id: "c-3", name: "陈静", department: "设计部", jobTitle: "UI设计师" }, selfEvalStatus: "imported", peerAvg: "4.6", supervisorWeighted: 4.7, proposedStars: 5, finalStars: 5 },
          { user: { id: "c-4", name: "刘洋", department: "后端开发", jobTitle: "工程师" }, selfEvalStatus: "not_imported", peerAvg: null, supervisorWeighted: null, proposedStars: null, finalStars: null },
          { user: { id: "c-5", name: "赵雪", department: "QA", jobTitle: "测试工程师" }, selfEvalStatus: "imported", peerAvg: "3.8", supervisorWeighted: 3.6, proposedStars: 3, finalStars: null },
          { user: { id: "c-6", name: "孙磊", department: "运维", jobTitle: "运维工程师" }, selfEvalStatus: "imported", peerAvg: "3.2", supervisorWeighted: 3.0, proposedStars: 3, finalStars: 3 },
          { user: { id: "c-7", name: "周婷", department: "前端开发", jobTitle: "初级工程师" }, selfEvalStatus: "imported", peerAvg: "3.5", supervisorWeighted: 3.2, proposedStars: 3, finalStars: null },
          { user: { id: "c-8", name: "吴强", department: "后端开发", jobTitle: "高级工程师" }, selfEvalStatus: "imported", peerAvg: "4.0", supervisorWeighted: 4.2, proposedStars: 4, finalStars: 4 },
          { user: { id: "c-9", name: "郑丽", department: "产品部", jobTitle: "产品经理" }, selfEvalStatus: "imported", peerAvg: "2.8", supervisorWeighted: 2.5, proposedStars: 2, finalStars: null },
          { user: { id: "c-10", name: "王涛", department: "前端开发", jobTitle: "工程师" }, selfEvalStatus: "imported", peerAvg: "1.8", supervisorWeighted: 1.5, proposedStars: 1, finalStars: 1 },
        ],
      },
    },

    admin: {
      EMPLOYEE: {},
      SUPERVISOR: {},
      ADMIN: {
        cycles: [
          {
            id: "cycle-1",
            name: "2025年下半年绩效考核",
            status: "CALIBRATION",
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
          },
        ],
        users: [
          { id: "u-1", name: "李明", email: "liming@example.com", department: "前端开发", jobTitle: "高级工程师", role: "EMPLOYEE", supervisor: { id: "u-s1", name: "王芳" } },
          { id: "u-2", name: "张伟", email: "zhangwei@example.com", department: "产品部", jobTitle: "产品经理", role: "EMPLOYEE", supervisor: { id: "u-s1", name: "王芳" } },
          { id: "u-3", name: "陈静", email: "chenjing@example.com", department: "设计部", jobTitle: "UI设计师", role: "EMPLOYEE", supervisor: { id: "u-s2", name: "赵敏" } },
          { id: "u-4", name: "王芳", email: "wangfang@example.com", department: "技术部", jobTitle: "技术总监", role: "SUPERVISOR", supervisor: null },
          { id: "u-5", name: "赵敏", email: "zhaomin@example.com", department: "HR", jobTitle: "HR总监", role: "ADMIN", supervisor: null },
        ],
      },
    },
    appeal: {
      EMPLOYEE: {
        appeals: [
          {
            id: "appeal-1",
            cycleId: "cycle-1",
            userId: "u-1",
            reason: "我认为本周期的360环评结果未能充分反映我在跨部门项目中的贡献，特别是用户增长平台v2.0项目中我承担了主要的技术方案设计和实施工作。",
            status: "PENDING",
            resolution: "",
            handledBy: null,
            handledAt: null,
            createdAt: "2026-04-01T14:30:00Z",
          },
        ],
        cycle: {
          id: "cycle-1",
          name: "2025年下半年绩效考核",
          status: "APPEAL",
          appealStart: "2026-04-01",
          appealEnd: "2026-04-04",
        },
        finalStars: 3,
        role: "EMPLOYEE",
      },
      SUPERVISOR: {
        appeals: [],
        cycle: {
          id: "cycle-1",
          name: "2025年下半年绩效考核",
          status: "APPEAL",
          appealStart: "2026-04-01",
          appealEnd: "2026-04-04",
        },
        finalStars: null,
        role: "SUPERVISOR",
      },
      ADMIN: {
        appeals: [
          {
            id: "appeal-a1",
            cycleId: "cycle-1",
            userId: "u-1",
            reason: "360环评结果未能反映跨部门项目贡献，用户增长平台v2.0项目中承担了主要技术方案设计工作。",
            status: "PENDING",
            resolution: "",
            handledBy: null,
            handledAt: null,
            createdAt: "2026-04-01T14:30:00Z",
            user: { id: "u-1", name: "李明", department: "前端开发" },
            finalStars: 3,
          },
          {
            id: "appeal-a2",
            cycleId: "cycle-1",
            userId: "u-7",
            reason: "上级初评分数与360环评差异较大，希望能重新审核评估过程。",
            status: "PENDING",
            resolution: "",
            handledBy: null,
            handledAt: null,
            createdAt: "2026-04-02T09:15:00Z",
            user: { id: "u-7", name: "周婷", department: "前端开发" },
            finalStars: 2,
          },
          {
            id: "appeal-a3",
            cycleId: "cycle-1",
            userId: "u-9",
            reason: "本周期承担了两个核心产品线的迭代工作，工作量远超预期，但评分未体现。",
            status: "PENDING",
            resolution: "",
            handledBy: null,
            handledAt: null,
            createdAt: "2026-04-02T11:00:00Z",
            user: { id: "u-9", name: "郑丽", department: "产品部" },
            finalStars: 2,
          },
        ],
        cycle: {
          id: "cycle-1",
          name: "2025年下半年绩效考核",
          status: "APPEAL",
          appealStart: "2026-04-01",
          appealEnd: "2026-04-04",
        },
        finalStars: null,
        role: "ADMIN",
      },
    },

    meetings: {
      EMPLOYEE: {
        meetings: [],
      },
      SUPERVISOR: {
        meetings: [
          {
            id: "mt-1",
            employee: { id: "e-1", name: "李明", department: "前端开发" },
            meetingDate: "2026-03-31T10:00:00Z",
            notes: "绩效表现良好，DAU提升23%成绩显著。建议下个周期加强跨团队协作能力，尝试承担更多技术分享。员工对结果无异议。",
            employeeAck: true,
          },
          {
            id: "mt-2",
            employee: { id: "e-2", name: "张伟", department: "产品部" },
            meetingDate: null,
            notes: "",
            employeeAck: false,
          },
          {
            id: "mt-3",
            employee: { id: "e-3", name: "陈静", department: "设计部" },
            meetingDate: null,
            notes: "",
            employeeAck: false,
          },
        ],
      },
      ADMIN: {
        meetings: [
          {
            id: "mt-1",
            employee: { id: "e-1", name: "李明", department: "前端开发" },
            meetingDate: "2026-03-31T10:00:00Z",
            notes: "绩效表现良好，DAU提升23%成绩显著。建议下个周期加强跨团队协作能力。",
            employeeAck: true,
          },
          {
            id: "mt-2",
            employee: { id: "e-2", name: "张伟", department: "产品部" },
            meetingDate: null,
            notes: "",
            employeeAck: false,
          },
          {
            id: "mt-3",
            employee: { id: "e-3", name: "陈静", department: "设计部" },
            meetingDate: null,
            notes: "",
            employeeAck: false,
          },
        ],
      },
    },
  };

  return dataMap[page]?.[role] ?? {};
}
