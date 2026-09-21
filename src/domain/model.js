// 数据模型与常量：出处类型、必填字段、状态枚举、配额默认值
// 本层只放纯数据与纯函数，不涉及判定流程、持久化与界面

export const SOURCE_TYPES = {
  journal: { label: '期刊', required: ['venue', 'volume', 'issue', 'pages'] },
  book: { label: '图书', required: ['publisher'] },
  conference: { label: '会议', required: ['venue', 'location'] },
};

export const FIELD_LABELS = {
  venue: '出处名称',
  volume: '卷',
  issue: '期',
  pages: '页码',
  publisher: '出版社',
  location: '会议地点',
};

// 出处字段：任一被改动，既有核验结论即失效，回到待核验
export const SOURCE_FIELDS = ['sourceType', 'venue', 'volume', 'issue', 'pages', 'publisher', 'location'];

export const VERIFY = {
  pending: { label: '待核验', cls: 'pending' },
  passed: { label: '通过', cls: 'passed' },
  failed: { label: '未通过', cls: 'failed' },
};

export const ROLES = { core: '核心引用', support: '支撑引用' };

// 配额：支撑引用待核验的容忍上限，超出即整次驳回
export const DEFAULT_QUOTA = { maxPendingSupport: 5 };

export function blankVerify() {
  return { status: 'pending', missing: [], checkedAt: null };
}

export function formatCite(ref) {
  const head = `${ref.authors} (${ref.year}). ${ref.title}.`;
  if (ref.sourceType === 'journal') {
    const parts = [
      ref.venue,
      ref.volume && `${ref.volume}${ref.issue ? `(${ref.issue})` : ''}`,
      ref.pages,
    ].filter(Boolean);
    return parts.length ? `${head} ${parts.join(', ')}.` : head;
  }
  if (ref.sourceType === 'book') {
    return `${head} ${ref.publisher ? `${ref.publisher}.` : ''}`.trim();
  }
  if (ref.sourceType === 'conference') {
    const parts = [ref.venue, ref.location].filter(Boolean);
    return parts.length ? `${head} ${parts.join(', ')}.` : head;
  }
  return head;
}

export const fmtTime = (t) => new Date(t).toLocaleString('zh-CN', { hour12: false });
