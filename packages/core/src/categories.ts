export const expenseCategories = [
  '餐饮',
  '交通',
  '购物',
  '日用',
  '住房',
  '娱乐',
  '医疗',
  '学习',
  '人情',
  '旅行',
  '数码',
  '其他支出',
] as const;

export const incomeCategories = ['工资', '奖金', '兼职', '理财', '退款', '转账收入', '其他收入'] as const;

const categoryRules: Array<{ category: string; keywords: string[] }> = [
  { category: '餐饮', keywords: ['星巴克', '瑞幸', '咖啡', '麦当劳', '肯德基', '餐厅', '饭', '面', '茶饮', '外卖'] },
  { category: '交通', keywords: ['滴滴', '地铁', '公交', '高德打车', '铁路', '航旅', '停车', '加油'] },
  { category: '购物', keywords: ['淘宝', '天猫', '京东', '拼多多', '得物', '唯品会', '小红书'] },
  { category: '日用', keywords: ['盒马', '永辉', '超市', '便利店', '美团买菜', '山姆', '开市客'] },
  { category: '医疗', keywords: ['医院', '药房', '医保', '诊所', '体检'] },
  { category: '娱乐', keywords: ['电影', '影院', '游戏', '网易云', '腾讯视频', '爱奇艺', '演出'] },
  { category: '住房', keywords: ['房租', '物业', '水费', '电费', '燃气'] },
  { category: '学习', keywords: ['课程', '图书', '得到', '知识星球', '培训'] },
  { category: '数码', keywords: ['Apple', '苹果', '华为', '小米', '数码'] },
];

export function classifyTransaction(input: {
  merchant?: string;
  title?: string;
  direction: 'expense' | 'income' | 'transfer';
}): string {
  if (input.direction === 'income') {
    const text = `${input.merchant ?? ''}${input.title ?? ''}`;
    if (/退款|退回|返还/.test(text)) {
      return '退款';
    }
    if (/工资|薪资/.test(text)) {
      return '工资';
    }
    if (/转账/.test(text)) {
      return '转账收入';
    }
    return '其他收入';
  }

  if (input.direction === 'transfer') {
    return '转账';
  }

  const text = `${input.merchant ?? ''}${input.title ?? ''}`.toLowerCase();
  const match = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
  );

  return match?.category ?? '其他支出';
}
