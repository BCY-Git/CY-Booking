# CY-Booking

CY-Booking 是一个本地优先的智能记账 App 项目，核心方向是账单导入、截图/PDF 识别、自动分类、去重和可选云同步。

## 产品方向

- 不强制登录，先支持本地试用。
- 优先做好微信账单、支付宝账单、银行账单、截图和 PDF 导入。
- 通过导入预览、自动分类和重复检测降低记账成本。
- 后续开放云备份、多端同步、OCR/AI 分类等商业能力。
- 主 MVP 放在移动端，Web 端暂时作为辅助调试和预览工具。

## 推荐技术栈

```txt
App: Expo / React Native
Core: TypeScript workspace package
Web: Next.js，用作辅助预览和后续后台
Local DB: Expo SQLite / SQLite
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
- [移动端 MVP 实施计划](./docs/mobile-mvp-plan.md)

## 开发启动

### 移动端 MVP

移动端代码位于：

- [apps/mobile](./apps/mobile)
- [packages/core](./packages/core)

本机运行：

```bash
pnpm install
pnpm web:mobile
```

访问：

```txt
http://localhost:8081
```

当前移动端主线包含：

- 本月收支概览
- CSV 账单选择入口
- 微信/支付宝样例账单解析
- 导入预览确认
- 重复交易提示
- 交易流水和快速记账
- 分类统计
- 本地模式/云备份设置入口

### Web 辅助预览

Web 端代码位于：

- [apps/web](./apps/web)

本机运行：

```bash
pnpm install
pnpm dev:web
```

访问：

```txt
http://localhost:3000
```

## 下一步

1. 接入本地持久化，优先 Expo SQLite。
2. 用真实脱敏账单样本测试 CSV 解析兼容性。
3. 增加 XLSX/PDF 解析入口。
4. 增加截图 OCR 单笔识别。
5. 再决定是否同步启动 NestJS 后端。
