// 投稿包领域操作：冻结、驳回回滚、补录新版本、快照导出
// 全部为纯函数：输入旧包，返回 { pkg, error }，由调用方决定是否提交

import { formatCite, ROLES, fmtTime } from './model.js';
import { evaluateFreeze } from './verify.js';

export function createPackage(name, now = Date.now()) {
  return {
    id: `p${now}`,
    name,
    status: 'draft',
    entries: [],
    versions: [],
    history: [{ at: now, type: 'create', text: '创建投稿包' }],
  };
}

export function addEntry(pkg, refId, role = 'support') {
  if (pkg.status !== 'draft' || pkg.entries.some((e) => e.refId === refId)) return pkg;
  return { ...pkg, entries: [...pkg.entries, { refId, role }] };
}

export function removeEntry(pkg, refId) {
  if (pkg.status !== 'draft') return pkg; // 冻结后引文只读，不可移除
  return { ...pkg, entries: pkg.entries.filter((e) => e.refId !== refId) };
}

export function setRole(pkg, refId, role) {
  if (pkg.status !== 'draft') return pkg;
  return { ...pkg, entries: pkg.entries.map((e) => (e.refId === refId ? { ...e, role } : e)) };
}

// 冻结快照条目：把当时的引用文本与核验结论固化下来
function snapshotEntry(entry, ref) {
  return {
    refId: entry.refId,
    role: entry.role,
    cite: formatCite(ref),
    title: ref.title,
    authors: ref.authors,
    year: ref.year,
    sourceType: ref.sourceType,
    verifyStatus: ref.verify?.status ?? 'pending',
  };
}

export function freezePackage(pkg, refsById, quota, now = Date.now()) {
  if (pkg.status !== 'draft') {
    return { pkg, error: { type: 'blocked', gate: { problems: ['投稿包已冻结'] } } };
  }
  const gate = evaluateFreeze(pkg.entries, refsById, quota);

  // 支撑待核验超配额：整次驳回并回滚——不产生新版本、条目录原样保留，仅留驳回审计记录
  if (gate.rejected) {
    const history = [
      ...pkg.history,
      {
        at: now,
        type: 'reject',
        text: `冻结驳回并回滚：支撑引用待核验 ${gate.pendingSupport.length} 条，超过配额 ${quota.maxPendingSupport} 条`,
      },
    ];
    return { pkg: { ...pkg, history }, error: { type: 'rejected', gate } };
  }

  // 核心未通过等阻断：不冻结、不留痕，由界面提示
  if (!gate.ok) return { pkg, error: { type: 'blocked', gate } };

  const version = {
    version: pkg.versions.length + 1,
    frozenAt: now,
    entries: pkg.entries.filter((e) => refsById[e.refId]).map((e) => snapshotEntry(e, refsById[e.refId])),
    supplements: [],
  };
  const cores = version.entries.filter((e) => e.role === 'core').length;
  const history = [
    ...pkg.history,
    { at: now, type: 'freeze', text: `冻结版本 v${version.version}（核心 ${cores} 条 / 支撑 ${version.entries.length - cores} 条）` },
  ];
  return { pkg: { ...pkg, status: 'frozen', versions: [...pkg.versions, version], history }, error: null };
}

// 冻结后补录：必须带原因，在最新快照之上生成新版本，旧版本保留
export function supplementPackage(pkg, refId, role, reason, refsById, now = Date.now()) {
  if (pkg.status !== 'frozen') return { pkg, error: '仅冻结后的投稿包可补录' };
  if (!String(reason).trim()) return { pkg, error: '补录必须填写原因' };
  const last = latestVersion(pkg);
  if (last.entries.some((e) => e.refId === refId)) return { pkg, error: '该文献已在冻结快照中' };
  const ref = refsById[refId];
  if (!ref) return { pkg, error: '文献不存在' };

  const entry = snapshotEntry({ refId, role }, ref);
  const version = {
    version: last.version + 1,
    frozenAt: now,
    entries: [...last.entries, entry],
    supplements: [...last.supplements, { refId, role, reason: reason.trim(), title: ref.title, at: now }],
  };
  const history = [
    ...pkg.history,
    { at: now, type: 'supplement', text: `补录《${ref.title}》为${ROLES[role]}，生成 v${version.version}：${reason.trim()}` },
  ];
  return { pkg: { ...pkg, versions: [...pkg.versions, version], history }, error: null };
}

export function latestVersion(pkg) {
  return pkg.versions[pkg.versions.length - 1] ?? null;
}

// 导出只取冻结快照，不读文献库现值
export function exportText(pkg) {
  const v = latestVersion(pkg);
  if (!v) return null;
  const core = v.entries.filter((e) => e.role === 'core');
  const support = v.entries.filter((e) => e.role === 'support');
  const sups = pkg.versions.flatMap((x) => x.supplements.map((s) => ({ ...s, version: x.version })));
  const lines = [
    `投稿包：${pkg.name}`,
    `冻结版本：v${v.version}`,
    `冻结时间：${fmtTime(v.frozenAt)}`,
    '='.repeat(48),
    '',
    `【核心引用】${core.length} 条`,
    ...core.map((e, i) => `[C${i + 1}] ${e.cite}`),
    '',
    `【支撑引用】${support.length} 条`,
    ...support.map((e, i) => `[S${i + 1}] ${e.cite}`),
  ];
  if (sups.length) {
    lines.push('', '【补录记录】');
    sups.forEach((s) => lines.push(`- v${s.version} 补录《${s.title}》（${ROLES[s.role]}）：${s.reason} @ ${fmtTime(s.at)}`));
  }
  return lines.join('\n');
}
