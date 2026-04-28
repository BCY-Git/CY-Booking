import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  BarChart3,
  Check,
  ChevronRight,
  Cloud,
  FileSpreadsheet,
  Home,
  Image as ImageIcon,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Sparkles,
  Upload,
  Wallet,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  expenseCategories,
  markDuplicates,
  parseBillCsv,
  sampleAlipayCsv,
  sampleTransactions,
  sampleWechatCsv,
  type Transaction,
} from '@cy-booking/core';

type TabKey = 'home' | 'import' | 'stats' | 'settings';

type DraftTransaction = {
  title: string;
  amount: string;
  category: string;
  account: string;
};

const colors = {
  ink: '#17201b',
  muted: '#66736d',
  soft: '#f6f3ec',
  panel: '#fffaf0',
  line: '#e4ded1',
  accent: '#167d68',
  accentSoft: '#e0f1ec',
  expense: '#c54a35',
  income: '#22815b',
  warning: '#a36a1f',
  white: '#ffffff',
};

const importOptions = [
  {
    title: '微信账单',
    subtitle: 'CSV / Excel 批量导入',
    icon: FileSpreadsheet,
    tone: '#167d68',
  },
  {
    title: '支付宝账单',
    subtitle: '自动识别交易对方和收支',
    icon: ReceiptText,
    tone: '#2d6f9f',
  },
  {
    title: '截图识别',
    subtitle: '适合单笔交易详情页',
    icon: ImageIcon,
    tone: '#9b5c2b',
  },
  {
    title: '银行 PDF',
    subtitle: '先支持常见文本型账单',
    icon: Upload,
    tone: '#7a5aa6',
  },
];

const categories = [...expenseCategories, '收入'];
const accounts = ['微信支付', '支付宝', '招商银行', '现金'];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  const [preview, setPreview] = useState<Transaction[]>([]);
  const [importStatus, setImportStatus] = useState('选择微信/支付宝 CSV，或先载入样例账单');
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<DraftTransaction>({
    title: '',
    amount: '',
    category: '餐饮',
    account: '微信支付',
  });

  const totals = useMemo(() => {
    return transactions.reduce(
      (summary, item) => {
        if (item.direction === 'income') {
          summary.income += item.amount;
        }
        if (item.direction === 'expense') {
          summary.expense += item.amount;
        }
        return summary;
      },
      { expense: 0, income: 0 },
    );
  }, [transactions]);

  const importedCount = transactions.filter((item) => item.source !== 'manual').length;
  const balance = totals.income - totals.expense;

  const parseImportText = (text: string) => {
    try {
      const result = parseBillCsv(text);
      const marked = markDuplicates(result.transactions, transactions);

      setPreview(marked);
      setActiveTab('import');
      setImportStatus(
        `${getSourceLabel(result.source)}账单：识别 ${result.totalRows} 行，${marked.length} 笔进入预览`,
      );
    } catch (error) {
      setImportStatus('账单解析失败，请检查文件格式');
      Alert.alert('解析失败', error instanceof Error ? error.message : '暂时无法识别这个文件');
    }
  };

  const handlePickCsv = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', '*/*'],
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      parseImportText(text);
    } catch (error) {
      setImportStatus('读取文件失败');
      Alert.alert('读取失败', error instanceof Error ? error.message : '无法读取这个文件');
    }
  };

  const handleAddTransaction = () => {
    const amount = Number.parseFloat(draft.amount);

    if (!draft.title.trim() || Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const nextTransaction: Transaction = {
      id: `manual_${Date.now()}`,
      bookId: 'default',
      title: draft.title.trim(),
      merchant: draft.title.trim(),
      amount,
      direction: draft.category === '收入' ? 'income' : 'expense',
      category: draft.category,
      account: draft.account,
      source: 'manual',
      occurredAt: '刚刚',
      sourceHash: `manual_${Date.now()}`,
      confidence: 1,
      status: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      deviceId: 'mobile-manual',
    };

    setTransactions((current) => [nextTransaction, ...current]);
    setDraft({ title: '', amount: '', category: '餐饮', account: '微信支付' });
    setComposerOpen(false);
  };

  const handleConfirmImport = () => {
    const nextRecords = preview.filter((item) => item.status !== 'duplicate');

    if (nextRecords.length === 0) {
      setImportStatus('没有可入账的交易');
      return;
    }

    setTransactions((current) => [...nextRecords, ...current]);
    setPreview([]);
    setImportStatus(`已确认导入 ${nextRecords.length} 笔`);
    setActiveTab('home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>CY-Booking</Text>
            <Text style={styles.headerTitle}>{getHeaderTitle(activeTab)}</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={() => setComposerOpen(true)}>
            <Plus color={colors.white} size={22} strokeWidth={2.4} />
          </Pressable>
        </View>

        <ScrollView
          key={activeTab}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'home' && (
            <HomeScreen
              balance={balance}
              importedCount={importedCount}
              onAdd={() => setComposerOpen(true)}
              onImport={() => setActiveTab('import')}
              onSearch={() => setActiveTab('stats')}
              transactions={transactions}
              totals={totals}
            />
          )}
          {activeTab === 'import' && (
            <ImportScreen
              onConfirm={handleConfirmImport}
              onLoadAlipaySample={() => parseImportText(sampleAlipayCsv)}
              onLoadWechatSample={() => parseImportText(sampleWechatCsv)}
              onPickCsv={handlePickCsv}
              preview={preview}
              status={importStatus}
            />
          )}
          {activeTab === 'stats' && (
            <StatsScreen transactions={transactions} totals={totals} />
          )}
          {activeTab === 'settings' && <SettingsScreen />}
        </ScrollView>

        <TabBar activeTab={activeTab} onChange={setActiveTab} />
      </View>

      <ComposerModal
        draft={draft}
        isOpen={isComposerOpen}
        onChange={setDraft}
        onClose={() => setComposerOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </SafeAreaView>
  );
}

function HomeScreen({
  balance,
  importedCount,
  onAdd,
  onImport,
  onSearch,
  transactions,
  totals,
}: {
  balance: number;
  importedCount: number;
  onAdd: () => void;
  onImport: () => void;
  onSearch: () => void;
  transactions: Transaction[];
  totals: { expense: number; income: number };
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.summaryPanel}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryLabel}>本月净额</Text>
          <View style={styles.syncPill}>
            <Cloud color={colors.accent} size={14} strokeWidth={2.2} />
            <Text style={styles.syncPillText}>本地模式</Text>
          </View>
        </View>
        <Text style={styles.balanceText}>{formatSignedMoney(balance)}</Text>
        <View style={styles.metricRow}>
          <Metric label="支出" value={formatMoney(totals.expense)} tone="expense" />
          <Metric label="收入" value={formatMoney(totals.income)} tone="income" />
          <Metric label="导入" value={`${importedCount} 笔`} tone="neutral" />
        </View>
      </View>

      <View style={styles.quickActions}>
        <ActionButton icon={Plus} label="记一笔" onPress={onAdd} />
        <ActionButton icon={Upload} label="导入账单" onPress={onImport} />
        <ActionButton icon={Search} label="看统计" onPress={onSearch} />
      </View>

      <SectionHeader title="最近流水" action="全部" />
      <View style={styles.transactionList}>
        {transactions.map((transaction) => (
          <TransactionRow key={transaction.id} transaction={transaction} />
        ))}
      </View>
    </View>
  );
}

function ImportScreen({
  onConfirm,
  onLoadAlipaySample,
  onLoadWechatSample,
  onPickCsv,
  preview,
  status,
}: {
  onConfirm: () => void;
  onLoadAlipaySample: () => void;
  onLoadWechatSample: () => void;
  onPickCsv: () => void;
  preview: Transaction[];
  status: string;
}) {
  const readyCount = preview.filter((item) => item.status !== 'duplicate').length;
  const duplicateCount = preview.length - readyCount;

  return (
    <View style={styles.stack}>
      <View style={styles.importHero}>
        <View style={styles.importHeroIcon}>
          <Sparkles color={colors.accent} size={24} strokeWidth={2.3} />
        </View>
        <View style={styles.importHeroText}>
          <Text style={styles.importHeroTitle}>导入后先预览，再入账</Text>
          <Text style={styles.importHeroCopy}>
            {status}
          </Text>
        </View>
      </View>

      <Pressable style={styles.primaryButtonStandalone} onPress={onPickCsv}>
        <FileSpreadsheet color={colors.white} size={18} strokeWidth={2.5} />
        <Text style={styles.primaryButtonText}>选择 CSV 账单文件</Text>
      </Pressable>

      <View style={styles.importGrid}>
        {importOptions.map((option, index) => (
          <Pressable
            key={option.title}
            style={styles.importOption}
            onPress={
              index === 0
                ? onLoadWechatSample
                : index === 1
                  ? onLoadAlipaySample
                  : undefined
            }
          >
            <View style={[styles.optionIcon, { backgroundColor: `${option.tone}1A` }]}>
              <option.icon color={option.tone} size={22} strokeWidth={2.3} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
            <ChevronRight color={colors.muted} size={18} />
          </Pressable>
        ))}
      </View>

      <SectionHeader
        title="待确认交易"
        action={preview.length > 0 ? `${readyCount} 可入账 · ${duplicateCount} 重复` : '暂无'}
      />
      <View style={styles.previewPanel}>
        {preview.length === 0 ? (
          <View style={styles.emptyPreview}>
            <Text style={styles.emptyPreviewTitle}>还没有待确认交易</Text>
            <Text style={styles.emptyPreviewCopy}>先选择 CSV 文件，或点微信/支付宝样例体验流程。</Text>
          </View>
        ) : (
          preview.map((transaction) => (
            <TransactionRow key={transaction.id} compact transaction={transaction} />
          ))
        )}
        <Pressable
          disabled={readyCount === 0}
          style={[styles.primaryButton, readyCount === 0 && styles.primaryButtonDisabled]}
          onPress={onConfirm}
        >
          <Check color={colors.white} size={18} strokeWidth={2.5} />
          <Text style={styles.primaryButtonText}>确认导入 {readyCount} 笔</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatsScreen({
  transactions,
  totals,
}: {
  transactions: Transaction[];
  totals: { expense: number; income: number };
}) {
  const categoryTotals = useMemo(() => {
    const data = transactions
      .filter((item) => item.direction === 'expense')
      .reduce<Record<string, number>>((summary, item) => {
        summary[item.category] = (summary[item.category] ?? 0) + item.amount;
        return summary;
      }, {});

    return Object.entries(data)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const topAmount = Math.max(...categoryTotals.map((item) => item.amount), 1);

  return (
    <View style={styles.stack}>
      <View style={styles.statsBand}>
        <View>
          <Text style={styles.summaryLabel}>本月支出</Text>
          <Text style={styles.statsMainValue}>{formatMoney(totals.expense)}</Text>
        </View>
        <BarChart3 color={colors.accent} size={32} strokeWidth={2.2} />
      </View>

      <SectionHeader title="分类排行" action="本月" />
      <View style={styles.categoryList}>
        {categoryTotals.map((item) => (
          <View key={item.category} style={styles.categoryRow}>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryName}>{item.category}</Text>
              <Text style={styles.categoryAmount}>{formatMoney(item.amount)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(12, (item.amount / topAmount) * 100)}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function SettingsScreen() {
  const settings = [
    { title: '账本与账户', subtitle: '分类、账户、默认账本', icon: Wallet },
    { title: '云备份', subtitle: '登录后开启，默认不上传', icon: Cloud },
    { title: '隐私与导出', subtitle: '导出数据、删除云端记录', icon: Settings },
  ];

  return (
    <View style={styles.stack}>
      <View style={styles.localNotice}>
        <Text style={styles.localNoticeTitle}>当前数据仅保存在本机</Text>
        <Text style={styles.localNoticeCopy}>
          云备份会作为后续会员能力开放，开启前不会上传账单和截图。
        </Text>
      </View>

      {settings.map((item) => (
        <Pressable key={item.title} style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <item.icon color={colors.accent} size={20} strokeWidth={2.2} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
          <ChevronRight color={colors.muted} size={18} />
        </Pressable>
      ))}
    </View>
  );
}

function TransactionRow({
  compact = false,
  transaction,
}: {
  compact?: boolean;
  transaction: Transaction;
}) {
  const isIncome = transaction.direction === 'income';

  return (
    <Pressable style={[styles.transactionRow, compact && styles.transactionRowCompact]}>
      <View style={styles.transactionIcon}>
        <ReceiptText color={colors.accent} size={18} strokeWidth={2.2} />
      </View>
      <View style={styles.transactionBody}>
        <View style={styles.transactionTitleRow}>
          <Text numberOfLines={1} style={styles.transactionTitle}>
            {transaction.title}
          </Text>
          <Text style={[styles.transactionAmount, isIncome && styles.incomeText]}>
            {isIncome ? '+' : '-'}
            {formatMoney(transaction.amount)}
          </Text>
        </View>
        <View style={styles.transactionMetaRow}>
          <Text numberOfLines={1} style={styles.transactionMeta}>
            {transaction.merchant} · {transaction.category} · {transaction.account}
          </Text>
          <View style={styles.transactionRightMeta}>
            {transaction.status && transaction.status !== 'ready' ? (
              <Text
                style={[
                  styles.statusPill,
                  transaction.status === 'duplicate' && styles.statusPillDanger,
                ]}
              >
                {transaction.status === 'duplicate' ? '重复' : '待确认'}
              </Text>
            ) : null}
            <Text style={styles.transactionTime}>{formatShortTime(transaction.occurredAt)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ComposerModal({
  draft,
  isOpen,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: DraftTransaction;
  isOpen: boolean;
  onChange: (draft: DraftTransaction) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={isOpen} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>记一笔</Text>

          <Text style={styles.inputLabel}>名称</Text>
          <TextInput
            placeholder="例如 午餐、咖啡、工资"
            placeholderTextColor="#9aa39e"
            style={styles.input}
            value={draft.title}
            onChangeText={(title) => onChange({ ...draft, title })}
          />

          <Text style={styles.inputLabel}>金额</Text>
          <TextInput
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#9aa39e"
            style={styles.input}
            value={draft.amount}
            onChangeText={(amount) => onChange({ ...draft, amount })}
          />

          <Text style={styles.inputLabel}>分类</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {categories.map((category) => (
                <ChoiceChip
                  key={category}
                  active={draft.category === category}
                  label={category}
                  onPress={() => onChange({ ...draft, category })}
                />
              ))}
            </View>
          </ScrollView>

          <Text style={styles.inputLabel}>账户</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {accounts.map((account) => (
                <ChoiceChip
                  key={account}
                  active={draft.account === account}
                  label={account}
                  onPress={() => onChange({ ...draft, account })}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>取消</Text>
            </Pressable>
            <Pressable style={styles.primaryButtonExpanded} onPress={onSubmit}>
              <Text style={styles.primaryButtonText}>保存</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ChoiceChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.choiceChip, active && styles.choiceChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TabBar({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  const tabs = [
    { key: 'home' as const, label: '账本', icon: Home },
    { key: 'import' as const, label: '导入', icon: Upload },
    { key: 'stats' as const, label: '统计', icon: BarChart3 },
    { key: 'settings' as const, label: '我的', icon: Settings },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onChange(tab.key)}
          >
            <tab.icon
              color={active ? colors.accent : colors.muted}
              size={21}
              strokeWidth={active ? 2.6 : 2.1}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Plus;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Icon color={colors.accent} size={20} strokeWidth={2.4} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'expense' | 'income' | 'neutral';
  value: string;
}) {
  const toneStyle =
    tone === 'expense'
      ? styles.expenseText
      : tone === 'income'
        ? styles.incomeText
        : styles.neutralText;

  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.metricValue, toneStyle]}>
        {value}
      </Text>
    </View>
  );
}

function SectionHeader({ action, title }: { action?: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function getHeaderTitle(tab: TabKey) {
  switch (tab) {
    case 'import':
      return '账单导入';
    case 'stats':
      return '收支统计';
    case 'settings':
      return '设置';
    default:
      return '本地账本';
  }
}

function getSourceLabel(source: Transaction['source']) {
  switch (source) {
    case 'wechat':
      return '微信';
    case 'alipay':
      return '支付宝';
    case 'bank':
      return '银行';
    case 'ocr':
      return '截图';
    default:
      return '通用';
  }
}

function formatShortTime(value: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(5, 16);
  }
  return value;
}

function formatMoney(value: number) {
  return `¥${value.toLocaleString('zh-CN', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })}`;
}

function formatSignedMoney(value: number) {
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatMoney(Math.abs(value))}`;
}

const shadow = Platform.select({
  ios: {
    shadowColor: '#3b3328',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  android: {
    elevation: 4,
  },
  default: {},
});

const styles = StyleSheet.create({
  safeArea: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: colors.soft,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.soft,
    maxWidth: 430,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 18 : 8,
    paddingBottom: 16,
  },
  kicker: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 3,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: 0,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    paddingBottom: 110,
    paddingHorizontal: 18,
  },
  stack: {
    gap: 18,
  },
  summaryPanel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    ...shadow,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  syncPill: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  syncPillText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  balanceText: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 14,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  metric: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: 12,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 5,
  },
  expenseText: {
    color: colors.expense,
  },
  incomeText: {
    color: colors.income,
  },
  neutralText: {
    color: colors.ink,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 76,
    justifyContent: 'center',
  },
  actionLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionAction: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  transactionList: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  transactionRow: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  transactionRowCompact: {
    minHeight: 66,
    paddingHorizontal: 0,
  },
  transactionIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 16,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  transactionBody: {
    flex: 1,
    minWidth: 0,
  },
  transactionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  transactionTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  transactionAmount: {
    color: colors.expense,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  transactionMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 5,
  },
  transactionMeta: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
  },
  transactionRightMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 6,
  },
  statusPill: {
    backgroundColor: '#f8ead2',
    borderRadius: 999,
    color: colors.warning,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusPillDanger: {
    backgroundColor: '#f8e4df',
    color: colors.expense,
  },
  transactionTime: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  importHero: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: 26,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  importHeroIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  importHeroText: {
    flex: 1,
    minWidth: 0,
  },
  importHeroTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  importHeroCopy: {
    color: '#dbe4df',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 19,
    marginTop: 5,
  },
  importGrid: {
    gap: 10,
  },
  primaryButtonStandalone: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 20,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
  },
  importOption: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    padding: 14,
  },
  optionIcon: {
    alignItems: 'center',
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  optionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 4,
  },
  previewPanel: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  emptyPreview: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 24,
  },
  emptyPreviewTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  emptyPreviewCopy: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 12,
    minHeight: 52,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  statsBand: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 22,
  },
  statsMainValue: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 8,
  },
  categoryList: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  categoryRow: {
    gap: 8,
  },
  categoryInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
  },
  categoryAmount: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  barTrack: {
    backgroundColor: '#ece6dc',
    borderRadius: 999,
    height: 9,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 9,
  },
  localNotice: {
    backgroundColor: colors.ink,
    borderRadius: 26,
    padding: 20,
  },
  localNoticeTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  localNoticeCopy: {
    color: '#dbe4df',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: 8,
  },
  settingRow: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 14,
  },
  settingIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 15,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  settingText: {
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  settingSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    marginTop: 4,
  },
  tabBar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    bottom: 22,
    flexDirection: 'row',
    height: 72,
    left: 18,
    paddingHorizontal: 8,
    position: 'absolute',
    right: 18,
    ...shadow,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
    justifyContent: 'center',
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  tabLabelActive: {
    color: colors.accent,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(23,32,27,0.38)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.soft,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxWidth: 430,
    padding: 22,
    paddingBottom: 34,
    width: '100%',
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#c7beb1',
    borderRadius: 999,
    height: 4,
    marginBottom: 18,
    width: 42,
  },
  modalTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 18,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 18,
  },
  choiceChip: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  choiceChipText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  choiceChipTextActive: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
  },
  primaryButtonExpanded: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
  },
});
