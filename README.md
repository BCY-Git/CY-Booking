# CY-Booking

CY-Booking 是一个本地优先的智能记账 App 项目，核心方向是账单导入、截图/PDF 识别、自动分类、去重和可选云同步。

## 产品方向

- 不强制登录，先支持本地试用。
- 优先做好微信账单、支付宝账单、银行账单、截图和 PDF 导入。
- 通过导入预览、自动分类和重复检测降低记账成本。
- 后续开放云备份、多端同步、OCR/AI 分类等商业能力。

## 推荐技术栈

```txt
App: Flutter
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

1. 把交易、账户、分类拆成独立 TypeScript 模型。
2. 接入本地持久化。
3. 实现微信/支付宝 CSV 解析器原型。
4. 将导入预览从样例数据改为真实解析结果。
5. 再决定是否同步启动 NestJS 后端。
