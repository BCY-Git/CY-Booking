import { classifyTransaction } from './categories';
import type { ImportResult, Transaction, TransactionDirection, TransactionSource } from './types';
import { createSourceHash } from './utils';

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = cells[index] ?? '';
      return row;
    }, {});
  });
}

function detectSource(headers: string[]): TransactionSource {
  const joined = headers.join('|');
  if (joined.includes('交易对方') && joined.includes('商品') && joined.includes('当前状态')) {
    return 'wechat';
  }
  if (joined.includes('商品说明') || joined.includes('收/付款方式')) {
    return 'alipay';
  }
  return 'csv';
}

function pick(row: Record<string, string>, keys: string[]): string {
  const key = keys.find((candidate) => row[candidate] !== undefined && row[candidate] !== '');
  return key ? row[key] : '';
}

function parseAmount(value: string): number {
  const normalized = value.replace(/[￥¥,\s]/g, '').replace(/^[-+]/, '');
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function parseDirection(row: Record<string, string>): TransactionDirection {
  const raw = pick(row, ['收/支', '收支', '方向', '交易类型', '交易分类']);
  if (/收入|收款|退款|退回/.test(raw)) {
    return 'income';
  }
  if (/转账|账户互转/.test(raw)) {
    return 'transfer';
  }
  return 'expense';
}

function normalizeRow(row: Record<string, string>, source: TransactionSource, index: number): Transaction {
  const occurredAt = pick(row, ['交易时间', '时间', '记账时间', '发生时间']) || new Date().toISOString();
  const merchant = pick(row, ['交易对方', '对方', '商户', '商户名称', '收款方']);
  const title = pick(row, ['商品', '商品说明', '备注', '交易摘要', '说明']) || merchant || '未命名交易';
  const amount = parseAmount(pick(row, ['金额(元)', '金额', '交易金额', '支出', '收入']));
  const direction = parseDirection(row);
  const paymentMethod = pick(row, ['支付方式', '收/付款方式', '账户', '付款账户']);
  const sourceRecordId = pick(row, ['交易单号', '交易订单号', '商户单号', '商家订单号', '订单号']);
  const statusText = pick(row, ['当前状态', '交易状态', '状态']);
  const confidence = source === 'csv' ? 0.78 : 0.9;
  const sourceHash = createSourceHash([source, occurredAt, amount, merchant, title, sourceRecordId]);
  const now = new Date().toISOString();

  return {
    id: `import_${source}_${sourceHash}_${index}`,
    bookId: 'default',
    account: paymentMethod || (source === 'wechat' ? '微信支付' : source === 'alipay' ? '支付宝' : '未分配账户'),
    category: classifyTransaction({ merchant, title, direction }),
    occurredAt,
    amount,
    direction,
    merchant: merchant || '未知交易对方',
    title,
    note: statusText,
    paymentMethod,
    source,
    sourceRecordId,
    sourceHash,
    confidence: statusText && !/成功|完成|退款/.test(statusText) ? 0.64 : confidence,
    status: statusText && !/成功|完成|退款/.test(statusText) ? 'needs_review' : 'ready',
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'web-import',
  };
}

export function parseBillCsv(text: string): ImportResult {
  const rows = parseCsv(text);
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const source = detectSource(headers);
  const warnings: string[] = [];

  if (rows.length === 0) {
    warnings.push('没有识别到可导入的交易行');
  }

  const transactions = rows
    .map((row, index) => normalizeRow(row, source, index))
    .filter((transaction) => transaction.amount > 0);

  if (transactions.length !== rows.length) {
    warnings.push('部分行缺少金额，已放入异常处理范围');
  }

  return {
    source,
    totalRows: rows.length,
    transactions,
    warnings,
  };
}

export function markDuplicates(
  imported: Transaction[],
  existing: Transaction[],
): Transaction[] {
  const hashes = new Set(existing.map((transaction) => transaction.sourceHash));

  return imported.map((transaction) => {
    if (hashes.has(transaction.sourceHash)) {
      return { ...transaction, status: 'duplicate' };
    }

    const possibleDuplicate = existing.some((item) => {
      return (
        item.amount === transaction.amount &&
        item.direction === transaction.direction &&
        item.merchant === transaction.merchant
      );
    });

    if (possibleDuplicate) {
      return { ...transaction, status: 'needs_review', confidence: Math.min(transaction.confidence, 0.72) };
    }

    return transaction;
  });
}
