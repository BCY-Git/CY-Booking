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

## 下一步

1. 收集脱敏的微信/支付宝账单样本。
2. 验证 CSV/Excel 账单解析为统一交易结构。
3. 设计 Flutter 本地账本数据表。
4. 绘制首页、导入页、导入预览页原型。
5. 决定是否同步启动 NestJS 后端。
