'use client';

import {
  BarChart3,
  Check,
  CircleDollarSign,
  FileSpreadsheet,
  Home,
  Import,
  LineChart,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Upload,
  Wallet,
} from 'lucide-react';
import {
  expenseCategories,
  formatSignedAmount,
  markDuplicates,
  parseBillCsv,
  sampleAlipayCsv,
  sampleTransactions,
  sampleWechatCsv,
  type Transaction,
} from '@cy-booking/core';
import { ChangeEvent, useMemo, useState } from 'react';

type ViewKey = 'overview' | 'import' | 'transactions' | 'stats';

type DraftTransaction = {
  title: string;
  merchant: string;
  amount: string;
  category: string;
  account: string;
};

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Home }> = [
  { key: 'overview', label: '概览', icon: Home },
  { key: 'import', label: '导入', icon: Import },
  { key: 'transactions', label: '流水', icon: ReceiptText },
  { key: 'stats', label: '统计', icon: BarChart3 },
];

const accounts = ['微信支付', '支付宝', '招商银行', '现金', '未分配账户'];

function statusLabel(status?: Transaction['status']) {
  if (status === 'duplicate') {
    return '重复';
  }
  if (status === 'needs_review') {
    return '待确认';
  }
  return '可入账';
}

function statusClass(status?: Transaction['status']) {
  if (status === 'duplicate') {
    return 'tag danger';
  }
  if (status === 'needs_review') {
    return 'tag warning';
  }
  return 'tag';
}

function sourceName(source: Transaction['source']) {
  const map: Record<Transaction['source'], string> = {
    manual: '手动',
    wechat: '微信',
    alipay: '支付宝',
    bank: '银行',
    ocr: 'OCR',
    csv: 'CSV',
    pdf: 'PDF',
  };
  return map[source];
}

function TransactionRow({
  transaction,
  editable,
  onCategoryChange,
}: {
  transaction: Transaction;
  editable?: boolean;
  onCategoryChange?: (id: string, category: string) => void;
}) {
  return (
    <div className="row">
      <div className="merchant">
        <span className="sourceIcon">
          <ReceiptText size={18} />
        </span>
        <div>
          <strong>{transaction.merchant}</strong>
          <span>
            {transaction.title} · {transaction.occurredAt}
          </span>
        </div>
      </div>

      <span className={`amount ${transaction.direction}`}>
        {formatSignedAmount(transaction.direction, transaction.amount)}
      </span>

      {editable ? (
        <select
          className="categorySelect"
          value={transaction.category}
          onChange={(event) => onCategoryChange?.(transaction.id, event.target.value)}
          aria-label="分类"
        >
          {[...expenseCategories, '退款', '兼职', '其他收入', '转账'].map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      ) : (
        <span className="tag">{transaction.category}</span>
      )}

      <span>{transaction.account}</span>
      <span className={statusClass(transaction.status)}>{statusLabel(transaction.status)}</span>
    </div>
  );
}

export function BookingWorkspace() {
  const [activeView, setActiveView] = useState<ViewKey>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [importMessage, setImportMessage] = useState('等待导入账单');
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<DraftTransaction>({
    title: '',
    merchant: '',
    amount: '',
    category: '餐饮',
    account: '微信支付',
  });

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, transaction) => {
        if (transaction.direction === 'income') {
          summary.income += transaction.amount;
        }
        if (transaction.direction === 'expense') {
          summary.expense += transaction.amount;
        }
        return summary;
      },
      { income: 0, expense: 0 },
    );
  }, [transactions]);

  const categoryStats = useMemo(() => {
    const expenseItems = transactions.filter((transaction) => transaction.direction === 'expense');
    const total = expenseItems.reduce((sum, transaction) => sum + transaction.amount, 0);
    const stats = expenseItems.reduce<Record<string, number>>((map, transaction) => {
      map[transaction.category] = (map[transaction.category] ?? 0) + transaction.amount;
      return map;
    }, {});

    return Object.entries(stats)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const readyPreview = preview.filter((transaction) => transaction.status !== 'duplicate');
  const duplicateCount = preview.length - readyPreview.length;
  const importedCount = transactions.filter((transaction) => transaction.source !== 'manual').length;

  const handleParsedText = (text: string) => {
    const result = parseBillCsv(text);
    const marked = markDuplicates(result.transactions, transactions);
    setPreview(marked);
    setActiveView('import');
    setImportMessage(
      `${sourceName(result.source)} 账单：识别 ${result.totalRows} 行，${marked.length} 笔可预览`,
    );
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    handleParsedText(text);
  };

  const updatePreviewCategory = (id: string, category: string) => {
    setPreview((items) => items.map((item) => (item.id === id ? { ...item, category } : item)));
  };

  const confirmImport = () => {
    if (readyPreview.length === 0) {
      return;
    }

    setTransactions((items) => [...readyPreview, ...items]);
    setPreview([]);
    setImportMessage(`已入账 ${readyPreview.length} 笔，跳过 ${duplicateCount} 笔重复交易`);
    setActiveView('transactions');
  };

  const addManualTransaction = () => {
    const amount = Number.parseFloat(draft.amount);
    if (!draft.title.trim() || !draft.merchant.trim() || !Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const now = new Date();
    const transaction: Transaction = {
      id: `manual_${now.getTime()}`,
      bookId: 'default',
      account: draft.account,
      category: draft.category,
      occurredAt: now.toISOString().slice(0, 19).replace('T', ' '),
      amount,
      direction: 'expense',
      merchant: draft.merchant,
      title: draft.title,
      source: 'manual',
      sourceHash: `manual_${now.getTime()}`,
      confidence: 1,
      status: 'ready',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
      deviceId: 'web-manual',
    };

    setTransactions((items) => [transaction, ...items]);
    setDraft({ title: '', merchant: '', amount: '', category: '餐饮', account: '微信支付' });
    setComposerOpen(false);
  };

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">
            <Wallet size={22} />
          </span>
          <div className="brandText">
            <strong>CY-Booking</strong>
            <span>本地优先账本</span>
          </div>
        </div>

        <nav className="navList" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={`navButton ${activeView === item.key ? 'isActive' : ''}`}
                onClick={() => setActiveView(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sideNote">
          当前为 Web MVP：数据保存在当前会话，先验证导入、分类、去重和预览确认流程。
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">账单导入工作台</p>
            <h1>把零散账单整理成可确认的账本</h1>
            <p className="lead">
              先跑通微信、支付宝 CSV 解析，交易进入预览区后再批量确认，避免误入账和重复入账。
            </p>
          </div>
          <div className="topActions">
            <button className="button secondary" type="button" onClick={() => setActiveView('import')}>
              <Upload size={17} />
              导入账单
            </button>
            <button className="button" type="button" onClick={() => setComposerOpen((value) => !value)}>
              <Plus size={17} />
              记一笔
            </button>
          </div>
        </header>

        <section className="grid kpiGrid" aria-label="本月概览">
          <div className="kpi">
            <span>本月支出</span>
            <strong>{formatSignedAmount('expense', totals.expense)}</strong>
            <small>{transactions.filter((item) => item.direction === 'expense').length} 笔支出</small>
          </div>
          <div className="kpi">
            <span>本月收入</span>
            <strong>{formatSignedAmount('income', totals.income)}</strong>
            <small>{transactions.filter((item) => item.direction === 'income').length} 笔收入</small>
          </div>
          <div className="kpi">
            <span>净额</span>
            <strong>{formatSignedAmount(totals.income - totals.expense >= 0 ? 'income' : 'expense', Math.abs(totals.income - totals.expense))}</strong>
            <small>收入减支出</small>
          </div>
          <div className="kpi">
            <span>导入占比</span>
            <strong>{Math.round((importedCount / Math.max(transactions.length, 1)) * 100)}%</strong>
            <small>{importedCount} 笔来自账单或 OCR</small>
          </div>
        </section>

        {composerOpen ? (
          <section className="panel" aria-label="手动记账">
            <div className="panelHeader">
              <div>
                <h2>快速记账</h2>
                <p>本地新增一笔支出，后续可接 SQLite 持久化。</p>
              </div>
            </div>
            <div className="composer">
              <div className="fieldGrid">
                <label className="field">
                  <span>交易名称</span>
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))}
                    placeholder="例如 午餐"
                  />
                </label>
                <label className="field">
                  <span>交易对方</span>
                  <input
                    value={draft.merchant}
                    onChange={(event) => setDraft((value) => ({ ...value, merchant: event.target.value }))}
                    placeholder="例如 瑞幸咖啡"
                  />
                </label>
                <label className="field">
                  <span>金额</span>
                  <input
                    value={draft.amount}
                    inputMode="decimal"
                    onChange={(event) => setDraft((value) => ({ ...value, amount: event.target.value }))}
                    placeholder="0.00"
                  />
                </label>
                <label className="field">
                  <span>分类</span>
                  <select
                    value={draft.category}
                    onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))}
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>账户</span>
                  <select
                    value={draft.account}
                    onChange={(event) => setDraft((value) => ({ ...value, account: event.target.value }))}
                  >
                    {accounts.map((account) => (
                      <option key={account} value={account}>
                        {account}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="topActions">
                <button type="button" className="button" onClick={addManualTransaction}>
                  <Check size={17} />
                  入账
                </button>
                <button type="button" className="button secondary" onClick={() => setComposerOpen(false)}>
                  收起
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid workspaceGrid" style={{ marginTop: composerOpen ? 18 : 0 }}>
          {(activeView === 'overview' || activeView === 'import') && (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <h2>账单导入</h2>
                  <p>{importMessage}</p>
                </div>
                <FileSpreadsheet size={20} />
              </div>
              <div className="uploadZone">
                <h3>上传 CSV 账单</h3>
                <p>当前支持微信和支付宝导出账单的常见字段，文件解析后先进入预览区。</p>
                <input className="fileInput" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
                <div className="quickActions">
                  <button type="button" className="button secondary" onClick={() => handleParsedText(sampleWechatCsv)}>
                    载入微信样例
                  </button>
                  <button type="button" className="button secondary" onClick={() => handleParsedText(sampleAlipayCsv)}>
                    载入支付宝样例
                  </button>
                </div>
              </div>

              <div className="panelHeader">
                <div>
                  <h2>导入预览</h2>
                  <p>{preview.length > 0 ? `${readyPreview.length} 笔可确认，${duplicateCount} 笔重复` : '暂无待确认交易'}</p>
                </div>
                <button type="button" className="button" onClick={confirmImport} disabled={readyPreview.length === 0}>
                  <Check size={17} />
                  确认入账
                </button>
              </div>

              <div className="previewList">
                {preview.length === 0 ? (
                  <div className="emptyState">导入账单后，交易会在这里等待确认。</div>
                ) : (
                  preview.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      editable
                      onCategoryChange={updatePreviewCategory}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {(activeView === 'overview' || activeView === 'stats') && (
            <div className="panel">
              <div className="panelHeader">
                <div>
                  <h2>分类支出</h2>
                  <p>按当前账本支出交易实时汇总。</p>
                </div>
                <LineChart size={20} />
              </div>
              <div className="chartList">
                {categoryStats.map((item) => (
                  <div className="barLine" key={item.category}>
                    <div className="barMeta">
                      <strong>{item.category}</strong>
                      <span>{formatSignedAmount('expense', item.amount)}</span>
                    </div>
                    <div className="barTrack">
                      <div className="barFill" style={{ width: `${Math.max(item.percent, 4)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="insightList">
                <div className="insight">
                  <Sparkles size={16} />
                  餐饮、交通、日用会优先通过商户关键词自动分类。
                </div>
                <div className="insight">
                  <Search size={16} />
                  重复判断使用来源、时间、金额、商户和订单号生成指纹。
                </div>
              </div>
            </div>
          )}

          {activeView === 'transactions' && (
            <div className="panel" style={{ gridColumn: '1 / -1' }}>
              <div className="panelHeader">
                <div>
                  <h2>交易流水</h2>
                  <p>{transactions.length} 笔交易，按入账时间排列。</p>
                </div>
                <CircleDollarSign size={20} />
              </div>
              <div className="transactionList">
                {transactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
