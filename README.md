# 深度赋智绩效考评系统

## 1. 项目定位

这是一个面向公司内部使用的绩效考评系统，用来承接一次完整的绩效周期执行，而不只是一个打分页面。

当前实现覆盖了以下业务模块：

- 组织架构同步
- 考核周期管理
- 员工个人自评
- 360 环评提名、审批、互评、拒评
- 直属上级/指定评委绩效初评
- HRBP / Admin 绩效校准
- 绩效面谈记录与员工确认
- 绩效申诉
- 管理后台的数据核验与导出

这套系统是为本次绩效动作深度定制的，不是完全通用的绩效 SaaS。

## 2. 工作区说明

当前外层工作目录不只包含本仓库：

- `performance-review/`
  业务主项目，实际运行的系统
- `showcase-site/`
  独立的静态展示站，用于演示系统页面截图
- `showcase-assets/`
  展示素材
- 根目录若干脚本、Excel、PDF、截图
  多为一次性导入、演示或业务资料，不属于主应用运行链路

如果你要开发或维护系统，请以 `performance-review/` 为准。

## 3. 核心角色

- `EMPLOYEE`
  普通员工。提交自评、提名 360 评估人、完成他人互评、查看面谈、提交申诉。
- `SUPERVISOR`
  主管。除员工能力外，还能查看团队任务、完成初评、记录面谈。
- `HRBP`
  HR 运营角色。可参与初评、校准、申诉处理、查看用户信息。
- `ADMIN`
  系统管理员。拥有最高权限，可创建周期、同步组织、导入自评、修改角色、预览不同视角、导出核验数据。

## 4. 业务流程总览

### 4.1 考核周期

系统围绕 `ReviewCycle` 运作。一个周期包含以下阶段：

1. `DRAFT`
2. `SELF_EVAL`
3. `PEER_REVIEW`
4. `SUPERVISOR_EVAL`
5. `CALIBRATION`
6. `MEETING`
7. `APPEAL`
8. `ARCHIVED`

大多数写操作都会检查当前周期阶段，只有管理员能绕过部分阶段限制。

### 4.2 员工自评

员工不是直接在系统里写自评，而是通过飞书表单/文档提交总结。

流程：

1. 员工在“个人自评”页点击飞书链接提交总结
2. HR / Admin 将总结内容批量导入系统
3. 系统保存导入内容、导入时间、原始文档链接
4. 主管和管理员可以查看已导入的自评内容

### 4.3 360 环评

360 模块分为两部分：

- 员工提名评估人
- 被提名人对员工进行互评

典型流程：

1. 员工至少提名 5 位同事
2. 审批人批准或拒绝提名
3. 被批准的提名会自动生成 `PeerReview` 任务
4. 被提名人提交互评，或填写理由后拒评

### 4.4 绩效初评

初评并不完全等于“直属上级一人评分”。

系统会根据以下规则决定谁可以给某位员工做初评：

- 直属上级
- 额外指定评委
- 对个别员工的增删评委 override
- 已存在但不再属于当前有效关系的历史保留记录

因此，初评模块是当前项目里业务定制最强的一部分。

### 4.5 校准、面谈、申诉

- `CALIBRATION`
  HRBP / Admin 参考自评、360、初评结果，给出最终星级
- `MEETING`
  主管记录绩效面谈纪要，员工确认
- `APPEAL`
  员工在申诉窗口内提交理由，HRBP / Admin 处理

## 5. 页面与功能对应

| 页面 | 作用 | 主要接口 |
| --- | --- | --- |
| `/login` | 飞书登录 / 开发环境模拟登录 | `/api/auth/*` |
| `/dashboard` | 当前用户工作台与待办入口 | `/api/users?me=true`, `/api/self-eval` |
| `/guide` | 使用说明与流程介绍 | 服务端读取当前周期 |
| `/self-eval` | 查看自评、跳转飞书提交 | `/api/self-eval`, `/api/admin/cycle` |
| `/peer-review` | 360 提名、互评任务、审批视图 | `/api/peer-review*` |
| `/team` | 主管/管理员完成绩效初评 | `/api/supervisor-eval` |
| `/calibration` | HRBP / Admin 进行绩效校准 | `/api/calibration` |
| `/meetings` | 面谈记录与确认 | `/api/meeting*` |
| `/appeal` | 申诉提交与处理 | `/api/appeal` |
| `/admin` | 周期、用户、组织同步、自评导入、核验 | `/api/admin/*` |

## 6. 技术架构

### 6.1 技术栈

- Next.js 16
- React 19
- App Router
- Prisma
- SQLite（本地）
- Turso / libSQL（生产）
- NextAuth
- Tailwind CSS 4
- shadcn/ui 风格组件
- 飞书开放平台接口

### 6.2 架构风格

整体是单体应用，分层并不复杂：

- 页面层
  主要在 `src/app/(main)`，大部分是 client component
- 接口层
  主要在 `src/app/api`，承担权限、阶段校验和数据读写
- 领域辅助层
  在 `src/lib`，包括数据库、会话、飞书、初评分配、预览、校验等
- 数据模型层
  Prisma schema

系统规则主要在 API 层，不在前端页面层。

### 6.3 登录与会话

认证主要分两类：

- 飞书 OAuth 登录
- 开发环境模拟登录

会话策略使用 JWT。项目中既有 NextAuth 配置，也有自定义的飞书登录接口，因此维护登录流程时要注意两套实现不要漂移。

## 7. 关键目录说明

```text
performance-review/
├─ prisma/
│  └─ schema.prisma              # 数据模型
├─ src/
│  ├─ app/
│  │  ├─ (main)/                 # 登录后主界面
│  │  ├─ api/                    # 后端接口
│  │  ├─ login/                  # 登录页
│  │  ├─ globals.css             # 全局样式变量
│  │  └─ layout.tsx              # 根布局
│  ├─ components/                # 通用组件
│  ├─ hooks/                     # 前端 hooks
│  └─ lib/                       # 数据访问、权限、飞书、预览、分配规则等
├─ public/
├─ scripts/                      # 针对生产库的脚本
├─ .env.example
├─ package.json
└─ README.md
```

## 8. 关键领域文件

以下文件是理解项目时最值得先读的：

- `prisma/schema.prisma`
  看懂所有业务实体与关系
- `src/lib/auth.ts`
  看登录与会话注入
- `src/lib/session.ts`
  看当前用户和当前周期获取方式
- `src/lib/db.ts`
  看 SQLite / Turso 切换
- `src/lib/feishu.ts`
  看飞书开放平台集成
- `src/lib/supervisor-assignments.ts`
  看初评名单、分组、额外评委与 override 逻辑
- `src/lib/preview.ts`
  看管理员预览模式的模拟数据
- `src/lib/admin-verify.ts`
  看后台数据核验规则

## 9. 数据模型说明

核心表如下：

- `User`
  用户、部门、职位、角色、直属上级
- `ReviewCycle`
  考核周期与阶段时间窗
- `SelfEvaluation`
  导入后的员工自评内容
- `ReviewerNomination`
  360 提名关系
- `PeerReview`
  被分配出去的互评任务与内容
- `SupervisorEval`
  初评记录，包含多维星级和加权分
- `CalibrationResult`
  校准后的建议星级 / 最终星级
- `Meeting`
  面谈纪要与员工确认
- `Appeal`
  申诉记录与处理结果

## 10. 本项目的强定制点

维护时最容易踩坑的地方，不在通用框架，而在这些“写死”的业务配置：

### 10.1 初评名单与评委关系

文件：

- `src/lib/supervisor-assignments.ts`

这里定义了：

- 本次纳入考核的员工名单
- Group B 名单
- 额外指定初评人映射
- 个别员工的评委增删 override

如果考核名单或评委规则变化，这个文件通常必须更新。

### 10.2 360 提名审批人

文件：

- `src/app/api/peer-review/approve/route.ts`

审批人名单是按姓名写死的，不是完全基于角色。

### 10.3 导航时间锁

文件：

- `src/components/nav.tsx`

导航里对部分菜单做了绝对日期控制，例如：

- 自评到某个固定日期后锁定
- 面谈和申诉到某个固定日期前不可见

如果下一轮考核继续复用系统，这里需要同步调整。

### 10.4 角色预览

文件：

- `src/lib/preview.ts`
- `src/hooks/use-preview.ts`
- `src/components/nav.tsx`

管理员可以切换员工 / 主管 / 管理员视图，用于演示或联调。预览数据是手写的模拟数据，不是数据库真实数据。

## 11. 本地开发

### 11.1 安装依赖

```bash
npm install
```

### 11.2 配置环境变量

先复制：

```bash
cp .env.example .env
```

`.env.example` 中已经包含：

- `DATABASE_URL`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_APP_URL`

如果要启用前端飞书登录按钮，还需要补充：

```bash
NEXT_PUBLIC_FEISHU_APP_ID=your_app_id
```

如果不配置 `NEXT_PUBLIC_FEISHU_APP_ID`，登录页会自动退回到开发环境演示登录逻辑。

### 11.3 启动项目

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

### 11.4 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 12. 管理员常见操作

管理员通常通过 `/admin` 页面完成以下运营动作：

### 12.1 创建考核周期

- 设置各阶段开始 / 截止日期
- 创建后可逐步推进状态流转

### 12.2 同步飞书组织

- 拉取部门树
- 拉取部门成员
- 自动 upsert 用户
- 自动设置直属上级
- 在必要时将上级提升为 `SUPERVISOR`

### 12.3 导入员工自评

支持两种输入形态：

- JSON 数组
- 简单 CSV

导入逻辑基于“姓名严格匹配用户”。

### 12.4 核验进度并导出花名册

管理后台会汇总：

- 自评是否导入
- 360 提名是否达标
- 被评进度是否完成
- 待评他人进度是否完成
- 初评是否完成
- 待跟进项摘要

## 13. scripts 目录说明

`performance-review/scripts` 下的脚本主要用于生产库维护，不属于应用运行主链路：

- `migrate-prod.ts`
  给线上表补字段
- `update-self-eval-urls.ts`
  维护自评原文链接

运行这些脚本前要先确认目标库环境变量，避免误操作到生产。

## 14. 已知约束与技术债

### 14.1 登录实现有重复

项目同时存在：

- NextAuth 配置
- 自定义飞书登录接口

两套实现逻辑接近，后续修改登录流程时要同时检查。

### 14.2 README 之外的真实规则不少

虽然这份文档可以帮助建立全局图，但有些关键约束仍然要以代码为准，尤其是：

- `src/lib/supervisor-assignments.ts`
- `src/components/nav.tsx`
- `src/app/api/peer-review/approve/route.ts`
- `src/lib/preview.ts`

### 14.3 当前 lint 不是全绿

在最近一次检查中，项目存在若干 lint error / warning，说明代码库仍有一部分历史问题需要逐步清理。

## 15. 新同学建议阅读顺序

如果你是第一次接手这个项目，建议按下面顺序阅读：

1. 本 README
2. `prisma/schema.prisma`
3. `src/lib/supervisor-assignments.ts`
4. `src/app/(main)/dashboard/page.tsx`
5. `src/app/(main)/self-eval/page.tsx`
6. `src/app/(main)/peer-review/page.tsx`
7. `src/app/(main)/team/page.tsx`
8. `src/app/(main)/admin/page.tsx`
9. `src/app/api/**/*`

这样可以先建立业务图，再进入实现细节。

## 16. 后续维护建议

如果后面要继续长期维护，建议优先做这几件事：

1. 把硬编码的名单、审批人、时间窗逐步抽到后台配置
2. 合并或统一登录流程实现
3. 为关键 API 增加更系统的测试
4. 把运营脚本和一次性脚本从主工作区进一步整理归档
5. 补一份“下一轮绩效复用 checklist”，降低换周期时的心智负担

---

如果你准备开始改代码，请优先确认两件事：

1. 你改的是通用能力，还是这次考核的定制规则
2. 你需要同步改页面展示，还是还要一起改 API / 阶段校验 / 名单配置
