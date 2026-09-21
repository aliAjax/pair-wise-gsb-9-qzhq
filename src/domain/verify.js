// 判定层：单篇核验 + 投稿包冻结闸门
// 规则：
//   期刊缺卷/期/页码、图书缺出版社、会议缺地点 → 不得核验通过
//   核心引用未全部通过 → 不得冻结
//   支撑引用待核验超过配额 → 整次驳回并回滚

import { SOURCE_TYPES, FIELD_LABELS } from './model.js';

export function missingFields(ref) {
  const spec = SOURCE_TYPES[ref.sourceType];
  if (!spec) return ['sourceType'];
  return spec.required.filter((f) => !String(ref[f] ?? '').trim());
}

export function missingLabels(ref) {
  return missingFields(ref).map((f) => FIELD_LABELS[f] || f);
}

// 对单篇文献执行核验，返回带新核验结论的文献对象（不改原对象）
export function verifyReference(ref, now = Date.now()) {
  const missing = missingFields(ref);
  return {
    ...ref,
    verify: { status: missing.length ? 'failed' : 'passed', missing, checkedAt: now },
  };
}

// 冻结闸门判定：纯函数，只算不改
export function evaluateFreeze(entries, refsById, quota) {
  const core = entries.filter((e) => e.role === 'core');
  const support = entries.filter((e) => e.role === 'support');
  const statusOf = (e) => refsById[e.refId]?.verify?.status;

  const coreFailures = core.filter((e) => statusOf(e) !== 'passed').map((e) => e.refId);
  const pendingSupport = support.filter((e) => statusOf(e) === 'pending').map((e) => e.refId);
  const failedSupport = support.filter((e) => statusOf(e) === 'failed').map((e) => e.refId);

  const rejected = pendingSupport.length > quota.maxPendingSupport;

  const problems = [];
  if (!entries.length) problems.push('投稿包为空');
  if (entries.length && !core.length) problems.push('缺少核心引用');
  if (coreFailures.length) problems.push(`${coreFailures.length} 条核心引用未通过核验`);
  if (rejected) {
    problems.push(`支撑引用待核验 ${pendingSupport.length} 条，超过配额 ${quota.maxPendingSupport} 条`);
  }

  return {
    ok: entries.length > 0 && core.length > 0 && coreFailures.length === 0 && !rejected,
    rejected,
    coreFailures,
    pendingSupport,
    failedSupport,
    coreTotal: core.length,
    corePassed: core.length - coreFailures.length,
    supportTotal: support.length,
    problems,
  };
}
