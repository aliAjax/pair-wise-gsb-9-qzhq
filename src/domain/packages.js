// 判定层：投稿包核验、冻结、驳回回滚、补录版本与快照导出（纯函数）
import { verifyReference, formatCitation } from './reference.js';

export const TIER_LABEL = { core: '核心', supporting: '支撑' };

const isPending = (refsById, e) => {
  const r = refsById[e.refId];
  return !r || !verifyReference(r).ok;
};

// 冻结前评估：核心引用须全部通过；支撑待核验超配额 → 整次驳回
export function evaluateFreeze(pkg, refsById, quota) {
  const coreFails = pkg.entries.filter(e => e.tier === 'core' && isPending(refsById, e));
  const supPending = pkg.entries.filter(e => e.tier === 'supporting' && isPending(refsById, e));
  if (supPending.length > quota.supportingPendingMax)
    return { decision: 'reject', coreFails, supPending,
      reason: `支撑待核验 ${supPending.length} 条，超过配额 ${quota.supportingPendingMax} 条：整次驳回并回滚` };
  if (!pkg.entries.some(e => e.tier === 'core'))
    return { decision: 'block', coreFails, supPending, reason: '核心引用为空，不得冻结' };
  if (coreFails.length)
    return { decision: 'block', coreFails, supPending,
      reason: `核心引用 ${coreFails.length} 条未通过核验，不得冻结` };
  return { decision: 'freeze', coreFails, supPending,
    reason: '核心引用全部通过，支撑待核验未超配额，可以冻结' };
}

// 冻结快照：把当下引用文本固化，之后文献库如何变动都不影响导出
export function buildSnapshot(pkg, refsById) {
  return pkg.entries.map(e => {
    const r = refsById[e.refId];
    return {
      refId: e.refId, tier: e.tier,
      title: r ? r.title : '(文献缺失)',
      cite: r ? formatCitation(r) : '(文献缺失)',
      verified: r ? verifyReference(r).ok : false,
    };
  });
}

// 冻结：先判定后落库；驳回/拦截时仅追加日志，包保持原状（回滚）
export function attemptFreeze(pkg, refsById, quota, now = new Date()) {
  const ev = evaluateFreeze(pkg, refsById, quota);
  const at = now.toISOString();
  if (ev.decision !== 'freeze')
    return { pkg: { ...pkg, log: [...pkg.log, { at, type: ev.decision, detail: ev.reason }] }, ev };
  const version = {
    n: pkg.versions.length + 1, kind: 'freeze', reason: '首次冻结', at,
    snapshot: buildSnapshot(pkg, refsById),
  };
  const coreCount = pkg.entries.filter(e => e.tier === 'core').length;
  return {
    pkg: { ...pkg, status: 'frozen', versions: [...pkg.versions, version],
      log: [...pkg.log, { at, type: 'freeze', detail: `冻结成功，生成 v${version.n}（核心 ${coreCount} 条）` }] },
    ev,
  };
}

// 补录：冻结后追加引文必须带原因；重新过判定，通过才生成新版本，否则驳回并回滚
export function supplement(pkg, refsById, addedEntries, reason, quota, now = new Date()) {
  const at = now.toISOString();
  if (!reason || !reason.trim()) return { error: '补录必须填写原因' };
  if (!addedEntries.length) return { error: '补录内容为空' };
  const next = { ...pkg, entries: [...pkg.entries, ...addedEntries] };
  const ev = evaluateFreeze(next, refsById, quota);
  if (ev.decision !== 'freeze')
    return { pkg: { ...pkg, log: [...pkg.log, { at, type: 'reject', detail: `补录驳回并回滚：${ev.reason}` }] }, ev };
  const version = {
    n: pkg.versions.length + 1, kind: 'supplement', reason: reason.trim(), at,
    snapshot: buildSnapshot(next, refsById),
  };
  return {
    pkg: { ...next, versions: [...pkg.versions, version],
      log: [...pkg.log, { at, type: 'supplement', detail: `补录「${reason.trim()}」，生成 v${version.n}` }] },
    ev,
  };
}

// 导出：只取最近一次冻结快照，不读实时文献
export function exportSnapshot(pkg) {
  const v = pkg.versions[pkg.versions.length - 1];
  if (!v) return null;
  const core = v.snapshot.filter(s => s.tier === 'core');
  const sup = v.snapshot.filter(s => s.tier === 'supporting');
  return [
    `# ${pkg.name} · 冻结快照 v${v.n}（${v.kind === 'supplement' ? '补录' : '冻结'}）`,
    `# 冻结时间 ${v.at} · 原因：${v.reason}`, '',
    '## 核心引用', ...core.map((s, i) => `[C${i + 1}] ${s.cite}`), '',
    '## 支撑引用', ...sup.map((s, i) => `[S${i + 1}] ${s.cite}`), '',
  ].join('\n');
}

// 被任一冻结包引用的文献 → 引文只读
export function lockedRefIds(packages) {
  const ids = new Set();
  for (const p of packages) if (p.status === 'frozen') for (const e of p.entries) ids.add(e.refId);
  return ids;
}
