// 界面层 · 投稿包视图：核心/支撑编排、冻结闸门、驳回回滚提示、补录与快照导出

import React, { useState } from 'react';
import { ROLES, VERIFY } from '../domain/model.js';
import { evaluateFreeze } from '../domain/verify.js';
import { latestVersion } from '../domain/packages.js';
import { TypeBadge, VerifyChip, fmtTime } from './widgets.jsx';

function EntryRow({ entry, refItem, onSetRole, onRemove }) {
  if (!refItem) return null;
  return (
    <div className="entry">
      <div>
        <h5>{refItem.title} <TypeBadge type={refItem.sourceType} /></h5>
        <p>{refItem.authors} · {refItem.year}</p>
      </div>
      <div className="ops">
        <VerifyChip verify={refItem.verify} />
        <div className="seg">
          <button className={entry.role === 'core' ? 'on' : ''} onClick={() => onSetRole(entry.refId, 'core')}>核心</button>
          <button className={entry.role === 'support' ? 'on' : ''} onClick={() => onSetRole(entry.refId, 'support')}>支撑</button>
        </div>
        <button className="iconbtn" onClick={() => onRemove(entry.refId)}>移除</button>
      </div>
    </div>
  );
}

function FrozenEntry({ e }) {
  const v = VERIFY[e.verifyStatus] ?? VERIFY.pending;
  return (
    <div className="entry">
      <div>
        <h5>{e.title} <TypeBadge type={e.sourceType} /></h5>
        <div className="cite-line">{e.cite}</div>
      </div>
      <div className="ops"><span className={`chip ${v.cls}`}>{v.label}</span></div>
    </div>
  );
}

export default function PackagesView({
  packages, items, refsById, quota, selectedId,
  onSelect, onCreate, onAddEntry, onRemoveEntry, onSetRole, onFreeze, onSupplement, onExport,
}) {
  const [pick, setPick] = useState('');
  const [pickRole, setPickRole] = useState('support');
  const [supp, setSupp] = useState({ refId: '', role: 'support', reason: '' });

  const pkg = packages.find((p) => p.id === selectedId) ?? packages[0] ?? null;
  const gate = pkg && pkg.status === 'draft' ? evaluateFreeze(pkg.entries, refsById, quota) : null;
  const version = pkg ? latestVersion(pkg) : null;
  const candidates = pkg ? items.filter((x) => !pkg.entries.some((e) => e.refId === x.id)) : [];
  const suppCandidates = version ? items.filter((x) => !version.entries.some((e) => e.refId === x.id)) : [];
  const lastEvent = pkg?.history[pkg.history.length - 1];
  const coreEntries = pkg ? pkg.entries.filter((e) => e.role === 'core') : [];
  const supportEntries = pkg ? pkg.entries.filter((e) => e.role === 'support') : [];

  return (
    <>
      <header>
        <div>
          <span className="crumb">CITATION / PACKAGES</span>
          <h1>投稿包</h1>
        </div>
        <div className="actions">
          <button className="primary" onClick={onCreate}>＋ 新建投稿包</button>
        </div>
      </header>

      <div className="pkgs">
        <section className="pkg-list">
          {packages.map((p) => {
            const v = latestVersion(p);
            return (
              <button key={p.id} className={'pkg-item' + (pkg && pkg.id === p.id ? ' selected' : '')} onClick={() => onSelect(p.id)}>
                <h4>{p.name}</h4>
                <small>{p.status === 'frozen' ? `已冻结 · v${v.version} · ${v.entries.length} 条引文` : `草稿 · ${p.entries.length} 条引文`}</small>
              </button>
            );
          })}
          {!packages.length && <div className="no-result">还没有投稿包</div>}
        </section>

        <section className="pkg-detail">
          {!pkg && <div className="no-result">新建一个投稿包，把文献登记为核心或支撑引用</div>}

          {pkg && pkg.status === 'draft' && gate && (
            <>
              <div className="detail-top">
                <span className="draft-tag">草稿 · 待冻结</span>
                <button className="primary" onClick={() => onFreeze(pkg.id)}>◈ 冻结投稿包</button>
              </div>
              <h2 className="pkg-title">{pkg.name}</h2>

              {lastEvent?.type === 'reject' && (
                <div className="banner reject">✗ {lastEvent.text}（{fmtTime(lastEvent.at)}）——投稿包已回滚至冻结前状态</div>
              )}

              <div className="gate">
                <div className={'gate-row ' + (gate.coreTotal > 0 && gate.corePassed === gate.coreTotal ? 'ok' : 'bad')}>
                  <span className="dot" />核心引用全部通过核验<b>{gate.corePassed}/{gate.coreTotal}</b>
                </div>
                <div className={'gate-row ' + (gate.pendingSupport.length <= quota.maxPendingSupport ? 'ok' : 'bad')}>
                  <span className="dot" />支撑引用待核验不超配额（超出即整次驳回并回滚）<b>{gate.pendingSupport.length}/{quota.maxPendingSupport}</b>
                </div>
                {gate.failedSupport.length > 0 && (
                  <div className="gate-row warn"><span className="dot" />有支撑引用核验未通过（不阻断冻结，建议处理）<b>{gate.failedSupport.length}</b></div>
                )}
              </div>

              <div className="addrow">
                <select value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">选择要加入的文献…</option>
                  {candidates.map((x) => <option key={x.id} value={x.id}>{x.title}（{x.authors}）</option>)}
                </select>
                <div className="seg">
                  <button className={pickRole === 'core' ? 'on' : ''} onClick={() => setPickRole('core')}>核心</button>
                  <button className={pickRole === 'support' ? 'on' : ''} onClick={() => setPickRole('support')}>支撑</button>
                </div>
                <button className="outline" disabled={!pick} onClick={() => { onAddEntry(pkg.id, pick, pickRole); setPick(''); }}>加入</button>
              </div>

              <h4 className="section-title">核心引用 <span>CORE · {coreEntries.length}</span></h4>
              {coreEntries.map((e) => (
                <EntryRow key={e.refId} entry={e} refItem={refsById[e.refId]}
                  onSetRole={(id, r) => onSetRole(pkg.id, id, r)} onRemove={(id) => onRemoveEntry(pkg.id, id)} />
              ))}
              {!coreEntries.length && <p className="empty-line">尚未加入核心引用</p>}

              <h4 className="section-title">支撑引用 <span>SUPPORT · {supportEntries.length}</span></h4>
              {supportEntries.map((e) => (
                <EntryRow key={e.refId} entry={e} refItem={refsById[e.refId]}
                  onSetRole={(id, r) => onSetRole(pkg.id, id, r)} onRemove={(id) => onRemoveEntry(pkg.id, id)} />
              ))}
              {!supportEntries.length && <p className="empty-line">尚未加入支撑引用</p>}
            </>
          )}

          {pkg && pkg.status === 'frozen' && version && (
            <>
              <div className="detail-top">
                <span className="frozen-tag">已冻结 · v{version.version} · 引文只读</span>
                <button className="outline" onClick={() => onExport(pkg.id)}>↓ 导出冻结快照</button>
              </div>
              <h2 className="pkg-title">{pkg.name}</h2>
              <p className="authors">冻结于 {fmtTime(version.frozenAt)} · 共 {version.entries.length} 条引文 · 导出取此快照</p>

              <h4 className="section-title">核心引用 <span>CORE</span></h4>
              {version.entries.filter((e) => e.role === 'core').map((e) => <FrozenEntry key={e.refId} e={e} />)}
              <h4 className="section-title">支撑引用 <span>SUPPORT</span></h4>
              {version.entries.filter((e) => e.role === 'support').map((e) => <FrozenEntry key={e.refId} e={e} />)}

              <h4 className="section-title">补录 <span>SUPPLEMENT · 须带原因并生成新版本</span></h4>
              <div className="supp-box">
                <div className="addrow">
                  <select value={supp.refId} onChange={(e) => setSupp({ ...supp, refId: e.target.value })}>
                    <option value="">选择要补录的文献…</option>
                    {suppCandidates.map((x) => <option key={x.id} value={x.id}>{x.title}（{x.authors}）</option>)}
                  </select>
                  <div className="seg">
                    <button className={supp.role === 'core' ? 'on' : ''} onClick={() => setSupp({ ...supp, role: 'core' })}>核心</button>
                    <button className={supp.role === 'support' ? 'on' : ''} onClick={() => setSupp({ ...supp, role: 'support' })}>支撑</button>
                  </div>
                </div>
                <textarea placeholder="补录原因（必填）…" value={supp.reason} onChange={(e) => setSupp({ ...supp, reason: e.target.value })} />
                <button className="primary" disabled={!supp.refId}
                  onClick={() => { onSupplement(pkg.id, supp.refId, supp.role, supp.reason); setSupp({ refId: '', role: 'support', reason: '' }); }}>
                  补录并生成 v{version.version + 1}
                </button>
              </div>

              <h4 className="section-title">版本 <span>VERSIONS</span></h4>
              {pkg.versions.map((v) => (
                <div className="version" key={v.version}>
                  <h5>v{v.version} · {fmtTime(v.frozenAt)} · {v.entries.length} 条引文</h5>
                  {v.supplements.map((s, i) => (
                    <p key={i} className="supp-line">＋ 补录《{s.title}》为{ROLES[s.role]}：{s.reason}</p>
                  ))}
                </div>
              ))}

              <h4 className="section-title">操作日志 <span>AUDIT</span></h4>
              <ul className="history">
                {[...pkg.history].reverse().map((h, i) => (
                  <li key={i}><time>{fmtTime(h.at)}</time>{h.text}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
