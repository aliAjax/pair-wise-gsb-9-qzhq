// 判定层：出处类型规则与单篇文献核验（纯函数，不碰存储与界面）

export const SOURCE_TYPES = [
  { value: 'journal', label: '期刊' },
  { value: 'book', label: '图书' },
  { value: 'conference', label: '会议' },
];

export const FIELD_LABELS = {
  title: '标题', authors: '作者', year: '年份',
  journal: '期刊名', volume: '卷', issue: '期', pages: '页码',
  publisher: '出版社', conference: '会议名称', location: '会议地点',
};

// 各出处类型的必填出处字段：期刊需卷期页码，图书需出版社，会议需地点
const REQUIRED_BY_TYPE = {
  journal: ['journal', 'volume', 'issue', 'pages'],
  book: ['publisher'],
  conference: ['conference', 'location'],
};

const BASE_REQUIRED = ['title', 'authors', 'year'];

const has = v => v !== undefined && v !== null && String(v).trim() !== '';

// 核验单篇文献：缺任一项即不得通过
export function verifyReference(ref) {
  const missing = [];
  for (const f of BASE_REQUIRED) if (!has(ref[f])) missing.push(FIELD_LABELS[f]);
  const required = REQUIRED_BY_TYPE[ref.sourceType];
  if (!required) missing.push('出处类型');
  else for (const f of required) if (!has(ref[f])) missing.push(FIELD_LABELS[f]);
  return { ok: missing.length === 0, missing };
}

export function sourceTypeLabel(t) {
  return SOURCE_TYPES.find(x => x.value === t)?.label ?? '未登记';
}

// 按出处类型生成引用文本
export function formatCitation(ref) {
  const head = `${ref.authors} (${ref.year}). ${ref.title}.`;
  if (ref.sourceType === 'journal') return `${head} ${ref.journal}, ${ref.volume}(${ref.issue}), ${ref.pages}.`;
  if (ref.sourceType === 'book') return `${head} ${ref.publisher}.`;
  if (ref.sourceType === 'conference') return `${head} ${ref.conference}, ${ref.location}.`;
  return head;
}

// 登记表单的空白文献（tags 在表单中以逗号串编辑）
export function emptyRef() {
  return {
    title: '', authors: '', year: new Date().getFullYear(), sourceType: 'journal',
    journal: '', volume: '', issue: '', pages: '',
    publisher: '', conference: '', location: '',
    tags: '', abstract: '',
  };
}
