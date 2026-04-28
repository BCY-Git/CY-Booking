# CY-Booking

CY-Booking 是一个本地优先的智能记账 App 项目，核心方向是账单导入、截图/PDF 识别、自动分类、去重和可选云同步。

## 产品方向

- 不强制登录，先支持本地试用。
- 优先做好微信账单、支付宝账单、银行账单、截图和 PDF 导入。
- 通过导入预览、自动分类和重复检测降低记账成本。
- 后续开放云备份、多端同步、OCR/AI 分类等商业能力。

## 推荐技术栈

```txt
Web: Next.js
App: Expo / React Native 或 Flutter
Local DB: SQLite / Drift
Backend: NestJS
Database: PostgreSQL
ORM: Prisma
Queue: BullMQ + Redis
File Storage: S3 / OSS / MinIO
OCR: PaddleOCR / 云 OCR
AI: 规则词库优先，后续接 LLM
```

## 文档

- [MVP 产品与技术方案](./docs/mvp-product-tech-plan.md)

## 开发启动

### Web MVP

Web 端代码位于：

- [apps/web](./apps/web)
- [packages/core](./packages/core)

本机运行：

```bash
npm install
npm run dev:web
```

访问：

```txt
http://localhost:3000
```

当前 Web MVP 已包含：

- 本月收支概览
- 账单 CSV 上传入口
- 微信/支付宝样例账单解析
- 导入预览确认
- 分类修正
- 重复交易提示
- 交易流水
- 分类统计

### 移动端原型

当前已启动移动端 MVP，代码位于：

- [apps/mobile](./apps/mobile)

本机运行：

```bash
cd apps/mobile
npm install
npm run web
```

访问：

```txt
http://localhost:8081
```

当前移动端已包含：

- 本地账本首页
- 快速记账弹窗
- 账单导入入口
- 导入预览确认
- 分类统计
- 本地模式/云备份设置入口

## 下一步

1. 把 Web MVP 的会话状态替换为本地持久化。
2. 增加 XLSX/PDF 解析入口。
3. 接入真实脱敏账单样本做兼容性测试。
4. 将移动端复用 `packages/core` 的解析逻辑。
5. 再决定是否同步启动 NestJS 后端。
