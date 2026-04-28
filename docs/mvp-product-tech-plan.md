# 智能记账 App MVP 产品与技术方案

## 1. 产品定位

做一款“本地优先、账单导入驱动、可逐步云同步”的智能记账 App。

第一阶段不追求直接同步微信、支付宝、银行卡个人账户流水，也不做模拟登录、爬虫或无障碍抓取。核心体验是：

- 用户可以不登录直接试用。
- 通过微信账单、支付宝账单、银行账单、截图、PDF 等方式快速导入。
- App 自动识别交易、去重、分类，并让用户在导入预览页确认。
- 后续通过会员能力开放云备份、多端同步、无限导入、OCR 和 AI 分类。

一句话版本：

> 先做“账单导入后自动变成干净账本”，再做云同步和商业化能力。

## 2. 目标用户

### 2.1 核心用户

- 有记账需求，但不愿每天手动录入的人。
- 微信、支付宝、银行卡混用，希望月末/周末批量整理消费的人。
- 对隐私敏感，愿意先本地使用，再选择是否开启云同步的人。

### 2.2 早期种子用户

- 学生、上班族、自由职业者。
- 有预算管理需求的人。
- 经常使用微信/支付宝支付，但对消费结构不清楚的人。

## 3. MVP 范围

### 3.1 必做功能

#### 本地账本

- 创建默认账本。
- 支持收入、支出、转账三类交易。
- 支持分类、账户、备注、交易时间、交易对象。
- 支持按日、月查看流水。
- 支持基础统计：本月支出、分类占比、收入支出趋势。

#### 手动记账

- 快速新增支出/收入。
- 默认记住上次选择的账户和分类。
- 支持常用分类快捷入口。

#### 账单导入

- 微信账单 CSV/Excel 导入。
- 支付宝账单 CSV/Excel 导入。
- 通用 CSV/Excel 导入。
- PDF 银行账单解析，MVP 只支持少量模板。
- 截图 OCR 单笔识别。

#### 导入预览

- 导入后先进入预览页，不直接入账。
- 用户可以批量确认、编辑、忽略。
- 标出疑似重复交易。
- 标出识别置信度低的字段。

#### 自动分类

- 使用规则词库和商户名匹配。
- 支持用户修改分类后记住规则。
- MVP 目标：常见消费分类准确率达到 70%-80%。

#### 去重

- 基于来源、时间、金额、商户、支付方式生成 `sourceHash`。
- 重复导入同一账单时，不重复入账。
- 对时间接近、金额相同、商户相似的交易做“疑似重复”提示。

### 3.2 暂不做功能

- 微信/支付宝/银行账号登录同步。
- 模拟点击支付 App 抓取流水。
- 自动读取短信或通知。
- 家庭多人账本。
- 投资资产管理。
- 完整银行 PDF 全覆盖。
- 复杂预算系统。
- 多币种。

## 4. 产品信息架构

### 4.1 主导航

- 记账：首页流水、快速记账。
- 导入：文件导入、截图识别、导入历史。
- 统计：月度支出、分类占比、趋势。
- 我的：账本、账户、分类、云备份、会员、设置。

### 4.2 关键页面

#### 首页

- 本月支出。
- 本月收入。
- 预算剩余，可后置。
- 今日/本周流水。
- 快速记一笔按钮。

#### 导入页

- 微信账单导入。
- 支付宝账单导入。
- 银行账单/PDF 导入。
- 截图识别。
- 最近导入记录。

#### 导入预览页

字段建议：

- 交易时间
- 金额
- 收支方向
- 商户/交易对方
- 商品/备注
- 分类
- 账户/支付方式
- 识别状态

操作：

- 单条编辑
- 批量确认
- 批量忽略
- 筛选异常项
- 查看重复项

#### 统计页

- 月度收支概览。
- 分类支出排行。
- 按账户统计。
- 按来源统计：手动、微信、支付宝、银行、OCR。

## 5. 交易数据模型

客户端和服务端统一使用同一套核心结构，便于后续同步。

```ts
type TransactionDirection = 'expense' | 'income' | 'transfer';

type TransactionSource =
  | 'manual'
  | 'wechat'
  | 'alipay'
  | 'bank'
  | 'ocr'
  | 'csv'
  | 'pdf';

type Transaction = {
  id: string;
  userId?: string;
  bookId: string;
  accountId?: string;
  categoryId?: string;

  occurredAt: string;
  amount: number;
  direction: TransactionDirection;

  merchant?: string;
  title?: string;
  note?: string;
  paymentMethod?: string;

  source: TransactionSource;
  sourceRecordId?: string;
  sourceHash: string;
  confidence?: number;

  createdAt: string;
  updatedAt: string;
  deletedAt?: string;

  version: number;
  deviceId: string;
};
```

## 6. 本地数据表

MVP 推荐 Flutter + SQLite/Drift。

核心表：

- `books`: 账本。
- `accounts`: 账户，如现金、微信、支付宝、银行卡、信用卡。
- `categories`: 分类。
- `transactions`: 交易记录。
- `import_jobs`: 导入任务。
- `import_records`: 导入解析后的原始记录。
- `category_rules`: 用户分类规则。
- `sync_changes`: 待同步变更，第二阶段再启用。

### 6.1 默认分类

支出：

- 餐饮
- 交通
- 购物
- 日用
- 住房
- 娱乐
- 医疗
- 学习
- 人情
- 旅行
- 数码
- 其他支出

收入：

- 工资
- 奖金
- 兼职
- 理财
- 转账收入
- 退款
- 其他收入

特殊：

- 转账
- 信用卡还款
- 内部账户转移

## 7. 账单导入流程

### 7.1 总流程

```txt
用户选择文件/截图
-> 判断文件类型和来源
-> 提取文本或表格
-> 解析为标准交易结构
-> 规则分类
-> 去重检测
-> 进入导入预览页
-> 用户确认
-> 写入本地账本
```

### 7.2 微信账单导入

重点字段：

- 交易时间
- 交易类型
- 交易对方
- 商品
- 收/支
- 金额
- 支付方式
- 当前状态
- 交易单号
- 商户单号

处理规则：

- 状态不是成功的交易默认不入账，预览页可显示。
- 退款交易需要尝试匹配原消费。
- 红包、转账、零钱通等需要单独分类。
- 金额字段统一转成正数，方向由收/支字段决定。

### 7.3 支付宝账单导入

重点字段：

- 交易时间
- 交易分类
- 交易对方
- 商品说明
- 收/支
- 金额
- 收/付款方式
- 交易状态
- 交易订单号
- 商家订单号

处理规则：

- 花呗付款先作为支出，账户可识别为花呗。
- 余额宝、基金、转账类交易进入待确认。
- 退款与原消费做关联。
- 手续费、服务费按独立支出处理。

### 7.4 截图 OCR

MVP 优先识别单笔交易详情页，不优先识别长列表截图。

字段目标：

- 金额
- 时间
- 商户/交易对方
- 支付方式
- 商品/备注

识别策略：

- 先 OCR 得到文本块。
- 根据关键词定位：付款金额、支付方式、交易时间、商户、订单号。
- 如果只识别到金额和商户，也允许进入预览页补齐。
- 置信度低于阈值时必须用户确认。

### 7.5 PDF 账单

MVP 只做有限支持：

- 文本型 PDF：直接提取文本/表格。
- 扫描型 PDF：走 OCR。
- 银行账单模板先支持 2-3 个常见格式。

不追求全银行覆盖，避免早期成本失控。

## 8. 自动分类策略

### 8.1 第一阶段：规则词库

规则示例：

```txt
星巴克、瑞幸、麦当劳、肯德基 -> 餐饮
滴滴、高德打车、地铁、公交 -> 交通
京东、淘宝、拼多多、天猫 -> 购物
美团买菜、盒马、永辉 -> 日用/餐饮，按商户细分
医院、药房、医保 -> 医疗
```

### 8.2 第二阶段：用户规则

当用户把某商户从“其他支出”改为“餐饮”后：

- 记录商户关键词。
- 下次自动分类。
- 同步到用户规则表。

### 8.3 第三阶段：AI 辅助分类

AI 不直接决定入账，只生成建议：

- 分类建议
- 是否转账
- 是否退款
- 是否疑似重复

AI 分类适合作为会员能力，按次数或高级功能计费。

## 9. 云同步方案

### 9.1 推荐路线

采用 Local-first：

- 不登录也能完整本地使用。
- 云能力由用户主动开启。
- 第二阶段先做云备份。
- 第三阶段再做多端同步。

### 9.2 技术栈

```txt
App: Flutter
Local DB: SQLite / Drift
Backend: NestJS
Database: PostgreSQL
ORM: Prisma
Queue: BullMQ + Redis
Object Storage: S3 / 阿里云 OSS / MinIO
OCR: PaddleOCR / 云 OCR
AI: 规则优先，后续 LLM
```

### 9.3 云备份

云备份比实时同步简单，适合先商业化。

流程：

```txt
用户登录
-> 开启云备份
-> App 打包本地账本快照
-> 上传到对象存储
-> 服务端记录备份版本
-> 用户换机后选择恢复
```

适合会员功能：

- 自动每日备份。
- 保留最近 N 个备份版本。
- 换机恢复。

### 9.4 多端同步

每条可同步数据需要以下字段：

```ts
type SyncableFields = {
  id: string;
  userId: string;
  bookId: string;
  updatedAt: string;
  deletedAt?: string;
  version: number;
  deviceId: string;
};
```

同步流程：

```txt
本地写入数据
-> 写入 sync_changes
-> 有网络时上传 pending changes
-> 服务端校验并合并
-> 客户端拉取 lastSyncAt 之后的变更
-> 更新本地 SQLite
```

冲突策略：

- MVP 默认最后修改 wins。
- 金额、时间、账户等关键字段冲突时记录冲突日志。
- 后续可以在 App 内提供“冲突记录”提示，但第一版不需要复杂 UI。

## 10. NestJS 后端模块

### 10.1 模块划分

- `AuthModule`: 登录、注册、刷新 token。
- `UsersModule`: 用户信息、注销。
- `BooksModule`: 账本。
- `AccountsModule`: 账户。
- `CategoriesModule`: 分类。
- `TransactionsModule`: 交易。
- `ImportsModule`: 导入任务、文件上传、解析结果。
- `SyncModule`: 增量同步。
- `FilesModule`: 对象存储签名上传。
- `BillingModule`: 会员、额度、订单。
- `AiModule`: AI 分类、OCR 后处理。

### 10.2 导入任务设计

```ts
type ImportJob = {
  id: string;
  userId?: string;
  bookId: string;
  source: 'wechat' | 'alipay' | 'bank' | 'ocr' | 'csv' | 'pdf';
  status: 'pending' | 'processing' | 'parsed' | 'confirmed' | 'failed';
  fileId?: string;
  totalRecords: number;
  parsedRecords: number;
  duplicateRecords: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
```

异步队列：

- `parse-import-file`
- `run-ocr`
- `classify-transactions`
- `detect-duplicates`
- `cleanup-import-file`

## 11. API 草案

### 11.1 认证

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
DELETE /users/me
```

### 11.2 账本与交易

```txt
GET /books
POST /books
GET /books/:bookId/transactions
POST /books/:bookId/transactions
PATCH /books/:bookId/transactions/:transactionId
DELETE /books/:bookId/transactions/:transactionId
```

### 11.3 导入

```txt
POST /books/:bookId/imports/upload-url
POST /books/:bookId/imports
GET /books/:bookId/imports/:jobId
GET /books/:bookId/imports/:jobId/records
POST /books/:bookId/imports/:jobId/confirm
```

### 11.4 同步

```txt
POST /sync/push
GET /sync/pull?since=...
POST /sync/bootstrap
```

## 12. 商业化设计

### 12.1 免费版

- 本地记账。
- 基础统计。
- 每月有限次账单导入。
- 每月有限次截图 OCR。
- 手动导出数据。

### 12.2 会员版

- 无限账单导入。
- 更高 OCR 次数。
- 云备份。
- 多端同步。
- 高级统计。
- AI 分类建议。
- 年度账单报告。

### 12.3 高级版/家庭版

- 家庭共享账本。
- 多成员权限。
- 预算协作。
- 资产负债表。
- 更多备份版本。

## 13. 隐私与合规边界

原则：

- 默认本地存储。
- 用户主动开启云服务。
- 上传文件仅用于解析。
- 解析完成后允许自动删除原始文件。
- 提供一键导出。
- 提供一键注销和删除云端数据。
- 隐私政策明确说明处理的数据类型和用途。

需要重点保护的数据：

- 交易流水。
- 金融账户名称。
- 银行卡尾号。
- 账单截图。
- 商户和地理位置相关信息。

不做：

- 不索要微信、支付宝、银行密码。
- 不模拟登录。
- 不绕过平台风控。
- 不默认上传用户本地账本。

## 14. 阶段计划

### 阶段一：本地 MVP，4-8 周

目标：证明用户愿意用导入方式记账。

交付：

- Flutter App 基础框架。
- 本地 SQLite 数据模型。
- 手动记账。
- 首页流水。
- 分类统计。
- 微信/支付宝 CSV 导入。
- 导入预览和确认。
- 基础去重。
- 基础规则分类。

### 阶段二：OCR 与 PDF，4-6 周

目标：提升非结构化账单识别能力。

交付：

- 截图 OCR 单笔识别。
- PDF 文本提取。
- 2-3 个银行账单模板。
- 导入异常处理。
- 用户分类规则。

### 阶段三：账号与云备份，3-5 周

目标：开始商业化。

交付：

- NestJS 后端。
- 用户系统。
- 云备份。
- 对象存储。
- 会员权益雏形。
- 数据导出/注销。

### 阶段四：多端同步，4-8 周

目标：提升留存和付费价值。

交付：

- 增量同步。
- 软删除。
- 设备管理。
- Web 管理台可选。
- 高级统计和年度报告。

## 15. 早期验证指标

产品指标：

- 首次导入成功率。
- 导入后用户确认率。
- 自动分类准确率。
- 重复识别准确率。
- 7 日留存。
- 月导入次数。
- 本地用户转登录比例。

商业指标：

- 云备份开启率。
- OCR 使用次数。
- 会员转化率。
- 退款率。

技术指标：

- 单个账单解析耗时。
- OCR 平均耗时。
- 导入失败率。
- 崩溃率。
- 数据恢复成功率。

## 16. 近期建议

下一步建议直接进入原型和技术验证：

1. 收集 5-10 份真实脱敏的微信/支付宝导出账单。
2. 写一个账单解析器原型，先跑通 CSV/Excel 到标准交易结构。
3. 做 Flutter 本地账本原型。
4. 把“导入预览页”作为第一个重点体验打磨。
5. 再决定是否立即启动 NestJS 后端。

早期成败关键不是后端复杂度，而是导入体验是否足够顺滑：用户导入一次账单后，能不能在 1 分钟内得到一份可信、干净、分类基本正确的账本。
