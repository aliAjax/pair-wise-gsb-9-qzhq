// 界面层 · 文献库视图：列表、出处登记编辑、核验结论展示

import React, { useMemo, useState } from 'react';
import { SOURCE_TYPES, FIELD_LABELS, formatCite } from '../domain/model.js';
import { TypeBadge, VerifyChip } from './widgets.jsx';

const TYPE_FILTERS = [['全部', '全部'], ...Object.entries(SOURCE_TYPES).map(([k, t]) => [k, t.label])];

export default function LibraryView({ items, frozenRefIds, selectedId, onSelect, onUpdate, onVerifyOne, onVerifyAll, onAdd }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('全部');

  const filtered = useMemo(
    () => items.filter(
      (x) => (type === '全部' || x.sourceType === type)
        && `${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [items, type, query],
  );
  const counts = useMemo(() => ({
    passed: items.filter((x) => x.verify?.status === 'passed').length,
    failed: items.filter((x) => x.verify?.status === 'failed').length,
    pending: items.filter((x) => x.verify?.status === 'pending').length,
  }), [items]);

  const cur = items.find((x) => x.id === selectedId) ?? items[0];
  const locked = cur ? frozenRefIds.has(cur.id) : false;
  const fields = cur ? SOURCE_TYPES[cur.sourceType]?.required ?? [] : [];
  const label = (f) => (f === 'venue' ? (cur.sourceType === 'journal' ? '期刊名' : '会议名') : FIELD_LABELS[f]);
  const missing = (cur?.verify?.missing ?? []).map((f) => FIELD_LABELS[f] ?? f);

  return (
    <>
      <header>
        <div>
          <span className="crumb">CITATION / LIBRARY</span>
          <h1>文献库</h1>
        </div>
        <div className="actions">
          <button className="outline" onClick={onVerifyAll}>◎ 全部核验</button>
          <button className="primary" onClick={onAdd}>＋ 登记文献</button>
        </div>
      </header>

      <div className="toolbar">
        <div className="search">
          ⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && <button onClick={() => setQuery('')}>×</button>}
        </div>
        <div className="tag-filter">
          {TYPE_FILTERS.map(([k, lb]) => (
            <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{lb}</button>
          ))}
        </div>
        <span className="verify-summary">通过 {counts.passed} · 未通过 {counts.failed} · 待核验 {counts.pending}</span>
      </div>

      <div className="body">
        <section className="paper-list">
          {filtered.map((p) => (
            <button className={'paper ' + (cur && cur.id === p.id ? 'selected' : '')} onClick={() => onSelect(p.id)} key={p.id}>
              <div className="paper-year">{p.year}</div>
              <div className="paper-copy">
                <h3>{p.title}</h3>
                <p>{p.authors}</p>
                <div>
                  <TypeBadge type={p.sourceType} />
                  {p.tags.map((t) => <span key={t}>#{t}</span>)}
                </div>
              </div>
              <div className="paper-side">
                <VerifyChip verify={p.verify} />
                {frozenRefIds.has(p.id) && <span className="lock" title="已入冻结快照">🔒</span>}
              </div>
            </button>
          ))}
          {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
        </section>

        <section className="detail">
          {cur && (
            <>
              <div className="detail-top">
                <span className={'status ' + cur.status}>{cur.status}</span>
                {locked
                  ? <span className="lock">🔒 已入冻结快照 · 引文只读</span>
                  : <button onClick={() => onVerifyOne(cur.id)}>◎ 执行核验</button>}
              </div>
              <h2>{cur.title}</h2>
              <p className="authors">{cur.authors} · {cur.year}</p>
              <div className="cite-actions">
                <TypeBadge type={cur.sourceType} />
                <VerifyChip verify={cur.verify} />
                <button onClick={() => onUpdate(cur.id, { status: cur.status === '已读' ? '待读' : '已读' })}>
                  {cur.status === '已读' ? '标记为待读' : '标记为已读'}
                </button>
              </div>

              <div className="detail-section">
                <h4>出处登记 <span>SOURCE</span></h4>
                <div className="field-grid">
                  <label>出处类型
                    <select disabled={locked} value={cur.sourceType} onChange={(e) => onUpdate(cur.id, { sourceType: e.target.value })}>
                      {Object.entries(SOURCE_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                    </select>
                  </label>
                  {fields.map((f) => (
                    <label key={f}>{label(f)}
                      <input disabled={locked} value={cur[f] || ''} onChange={(e) => onUpdate(cur.id, { [f]: e.target.value })} />
                    </label>
                  ))}
                </div>
                <div className={`verify-box ${cur.verify?.status ?? 'pending'}`}>
                  {cur.verify?.status === 'passed' && '✓ 出处完备，核验通过'}
                  {cur.verify?.status === 'failed' && `✗ 核验未通过：缺少 ${missing.join('、')}`}
                  {(!cur.verify || cur.verify.status === 'pending') && '… 出处信息待核验，请执行核验'}
                </div>
              </div>

              <div className="detail-section">
                <h4>引用文本 <span>CITATION</span></h4>
                <div className="cite-box">{formatCite(cur)}</div>
              </div>
              <div className="detail-section">
                <h4>摘要 <span>ABSTRACT</span></h4>
                <p>{cur.abstract || '—'}</p>
              </div>
              <div className="detail-section">
                <h4>我的笔记 <span>PRIVATE</span></h4>
                <textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes || ''} onChange={(e) => onUpdate(cur.id, { notes: e.target.value })} />
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
