export type TransactionDirection = 'expense' | 'income' | 'transfer';

export type TransactionSource =
  | 'manual'
  | 'wechat'
  | 'alipay'
  | 'bank'
  | 'ocr'
  | 'csv'
  | 'pdf';

export type Transaction = {
  id: string;
  bookId: string;
  account: string;
  category: string;
  occurredAt: string;
  amount: number;
  direction: TransactionDirection;
  merchant: string;
  title: string;
  note?: string;
  paymentMethod?: string;
  source: TransactionSource;
  sourceRecordId?: string;
  sourceHash: string;
  confidence: number;
  status?: 'ready' | 'duplicate' | 'needs_review';
  createdAt: string;
  updatedAt: string;
  version: number;
  deviceId: string;
};

export type ImportResult = {
  source: TransactionSource;
  totalRows: number;
  transactions: Transaction[];
  warnings: string[];
};
