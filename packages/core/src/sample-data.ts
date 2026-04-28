import type { Transaction } from './types';
import { createSourceHash } from './utils';

const now = new Date().toISOString();

export const sampleTransactions: Transaction[] = [
  {
    id: 'tx_001',
    bookId: 'default',
    account: '微信支付',
    category: '餐饮',
    occurredAt: '2026-04-28 12:18:00',
    amount: 42,
    direction: 'expense',
    merchant: '和府捞面',
    title: '午餐',
    paymentMethod: '零钱',
    source: 'wechat',
    sourceHash: createSourceHash(['wechat', '2026-04-28 12:18:00', '42', '和府捞面']),
    confidence: 0.96,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'demo-web',
  },
  {
    id: 'tx_002',
    bookId: 'default',
    account: '支付宝',
    category: '交通',
    occurredAt: '2026-04-28 08:42:00',
    amount: 6,
    direction: 'expense',
    merchant: '上海地铁',
    title: '地铁通勤',
    paymentMethod: '余额',
    source: 'alipay',
    sourceHash: createSourceHash(['alipay', '2026-04-28 08:42:00', '6', '上海地铁']),
    confidence: 0.91,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'demo-web',
  },
  {
    id: 'tx_003',
    bookId: 'default',
    account: '招商银行',
    category: '兼职',
    occurredAt: '2026-04-27 19:04:00',
    amount: 2800,
    direction: 'income',
    merchant: '客户转账',
    title: '项目结算',
    paymentMethod: '银行卡',
    source: 'bank',
    sourceHash: createSourceHash(['bank', '2026-04-27 19:04:00', '2800', '客户转账']),
    confidence: 0.88,
    status: 'ready',
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'demo-web',
  },
  {
    id: 'tx_004',
    bookId: 'default',
    account: '微信支付',
    category: '餐饮',
    occurredAt: '2026-04-27 15:36:00',
    amount: 18,
    direction: 'expense',
    merchant: 'Manner Coffee',
    title: '咖啡',
    paymentMethod: '零钱',
    source: 'ocr',
    sourceHash: createSourceHash(['ocr', '2026-04-27 15:36:00', '18', 'Manner Coffee']),
    confidence: 0.76,
    status: 'needs_review',
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'demo-web',
  },
];

export const sampleWechatCsv = `交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号
2026-04-27 20:12:00,商户消费,盒马鲜生,超市采购,支出,128.60,零钱,支付成功,wx_20260427001
2026-04-27 18:44:00,交通出行,滴滴出行,打车,支出,31.50,招商银行储蓄卡,支付成功,wx_20260427002
2026-04-26 10:02:00,退款,淘宝,订单退款,收入,59.00,零钱,退款成功,wx_20260426003
2026-04-27 15:36:00,商户消费,Manner Coffee,咖啡,支出,18.00,零钱,支付成功,wx_20260427004`;

export const sampleAlipayCsv = `交易时间,交易分类,交易对方,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号
2026-04-25 09:20:00,餐饮美食,瑞幸咖啡,拿铁,支出,19.90,余额,交易成功,ali_20260425001
2026-04-25 21:42:00,购物消费,京东,数据线,支出,36.80,花呗,交易成功,ali_20260425002
2026-04-24 10:15:00,转账红包,朋友转账,转账收款,收入,200.00,余额,交易成功,ali_20260424003`;
