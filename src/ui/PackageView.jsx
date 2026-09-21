// 界面层：投稿包视图 —— 核心/支撑引文、冻结判定、补录版本、快照导出、判定日志
import React, { useState } from 'react';
import { verifyReference, sourceTypeLabel } from '../domain/reference.js';
import { evaluateFreeze } from '../domain/packages.js';

const LOG_LABEL = { freeze: '冻结', reject: '驳回', block: '拦截', supplement: '补录' };

function Entry({ e, r, draft, onMoveTier, onRemoveEntry }) {
  const v = r ? verifyReference(r) : { ok: false, missing: ['文献缺失'] };
  return <div className="entry">
    <div className="entry-main">
      <strong>{r ? r.title : '(文献已移除)'}</strong>
      {r && <small>{sourceTypeLabel(r.sourceType)} · {r.authors} · {r.year}</small>}
      {!v.ok && <span className="missing-inline">缺：{v.missing.join('、')}</span>}
    </div>
    <div className="entry-foot">
      <span className={'chip ' + (v.ok ? 'ok' : 'warn')}>{v.ok ? '核验通过' : '待核验'}</span>
      {draft && <span className="entry-ops">
        <button onClick={() => onMoveTier(e.refId, e.tier === 'core' ? 'supporting' : 'core')}>
          {e.tier === 'core' ? '降为支撑' : '升为核心'}</button>
        <button onClick={() => onRemoveEntry(e.refId)}>移除</button>
      </span>}
    </div>
  </div>;
}

export default function PackageView({ packages, pkg, onSelectPkg, onNewPackage, refs, refsById, quota, onQuota,
  onFreeze, onRemoveEntry, onMoveTier, onAddEntry, onSupplement, onExport }) {
  const [newName, setNewName] = useState('');
  const [pick, setPick] = useState('');
  const [pickTier, setPickTier] = useState('core');
  const [reason, setReason] = useState('');

  if (!pkg) return <main>
    <header><div><span className="crumb">SUBMISSION / PACKAGES</span><h1>投稿引文包</h1></div></header>
    <div className="empty-pkg">
      <p>还没有投稿包，先创建一个。</p>
      <div className="pkg-toolbar">
        <input placeholder="投稿包名称，如：2026 春季投稿" value={newName} onChange={e => setNewName(e.target.value)}/>
        <button className="primary" onClick={() => { onNewPackage(newName); setNewName(''); }}>创建</button>
      </div>
    </div>
  </main>;

  const draft = pkg.status === 'draft';
  const ev = evaluateFreeze(pkg, refsById, quota);
  const coreEntries = pkg.entries.filter(e => e.tier === 'core');
  const supEntries = pkg.entries.filter(e => e.tier === 'supporting');
  const supPending = ev.supPending.length;
  const over = supPending > quota.supportingPendingMax;
  const available = refs.filter(r => !pkg.entries.some(e => e.refId === r.id));

  const submitPick = () => {
    if (!pick) return;
    if (draft) onAddEntry(pick, pickTier);
    else onSupplement(pick, pickTier, reason);
    setPick(''); setReason('');
  };

  return <main>
    <header>
      <div>
        <span className="crumb">SUBMISSION / PACKAGES</span>
        <h1>投稿引文包</h1>
      </div>
      <div className="actions">
        <select className="pkg-select" value={pkg.id} onChange={e => onSelectPkg(e.target.value)}>
          {packages.map(p => <option key={p.id} value={p.id}>{p.name}{p.status === 'frozen' ? '（已冻结）' : ''}</option>)}
        </select>
        <span className={'pkg-status ' + pkg.status}>{draft ? '草稿' : '已冻结 · 只读'}</span>
        <button className="outline" onClick={onExport}>↓ 导出快照</button>
      </div>
    </header>
    <div className="pkg-body">
      <div>
        <div className="pkg-toolbar">
          <input placeholder="新建投稿包名称…" value={newName} onChange={e => setNewName(e.target.value)}/>
          <button className="outline" onClick={() => { onNewPackage(newName); setNewName(''); }}>＋ 新建</button>
        </div>
        <div className="board">
          <div className="board-col">
            <h3>核心引用 <b>{coreEntries.length}</b><small> 未通过不得冻结</small></h3>
            {coreEntries.map(e => <Entry key={e.refId} e={e} r={refsById[e.refId]} draft={draft}
              onMoveTier={onMoveTier} onRemoveEntry={onRemoveEntry}/>)}
            {!coreEntries.length && <p className="hint">尚无核心引用</p>}
          </div>
          <div className="board-col">
            <h3>支撑引用 <b>{supEntries.length}</b><small> 待核验 ≤ {quota.supportingPendingMax} 条</small></h3>
            {supEntries.map(e => <Entry key={e.refId} e={e} r={refsById[e.refId]} draft={draft}
              onMoveTier={onMoveTier} onRemoveEntry={onRemoveEntry}/>)}
            {!supEntries.length && <p className="hint">尚无支撑引用</p>}
          </div>
        </div>
        <div className="card">
          <h4>{draft ? '加入引文' : '补录引文（包已冻结 · 须填原因 · 生成新版本）'}</h4>
          <div className="add-entry">
            <select value={pick} onChange={e => setPick(e.target.value)}>
              <option value="">选择文献…</option>
              {available.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <div className="two">
              <select value={pickTier} onChange={e => setPickTier(e.target.value)}>
                <option value="core">核心引用</option>
                <option value="supporting">支撑引用</option>
              </select>
              {!draft && <input placeholder="补录原因（必填）" value={reason} onChange={e => setReason(e.target.value)}/>}
            </div>
            <button className="primary" onClick={submitPick}
              disabled={!pick || (!draft && !reason.trim())}>
              {draft ? '加入投稿包' : '提交补录并生成新版本'}
            </button>
          </div>
        </div>
      </div>
      <div>
        <div className={'card eval-card ' + ev.decision}>
          <h4>冻结判定</h4>
          <div className="eval-nums">
            <div><small>核心引用</small><strong>{coreEntries.length}</strong></div>
            <div><small>核心未通过</small><strong className={ev.coreFails.length ? 'bad' : ''}>{ev.coreFails.length}</strong></div>
            <div><small>支撑待核验</small><strong className={over ? 'bad' : ''}>{supPending}</strong></div>
            <div><small>支撑配额</small><strong>{quota.supportingPendingMax}</strong></div>
          </div>
          <p className="eval-reason">{ev.reason}</p>
          {draft && <button className="primary full" onClick={onFreeze}>
            {ev.decision === 'freeze' ? '❄ 冻结投稿包' : ev.decision === 'reject' ? '提交冻结（将整次驳回）' : '提交冻结（核心未通过）'}
          </button>}
          {!draft && <p className="hint">已冻结：引文只读，改动须走补录生成新版本。</p>}
        </div>
        <div className="card">
          <h4>核验配额</h4>
          <label className="quota-label">支撑待核验上限
            <input type="number" min="0" value={quota.supportingPendingMax}
              onChange={e => onQuota({ ...quota, supportingPendingMax: Math.max(0, +e.target.value || 0) })}/>
          </label>
          <div className="quota-bar">
            <i className={over ? 'over' : ''} style={{ width: Math.min(100, supPending / (quota.supportingPendingMax || 1) * 100) + '%' }}/>
          </div>
          <small className="quota-note">{supPending} / {quota.supportingPendingMax} 条{over ? ' · 已超限，冻结将整次驳回并回滚' : ''}</small>
        </div>
        <div className="card">
          <h4>冻结版本 <span className="h-note">导出取最新快照</span></h4>
          {!pkg.versions.length && <p className="hint">尚未冻结。</p>}
          {pkg.versions.map(ver => <div className="version" key={ver.n}>
            <div className="v-head">
              <strong>v{ver.n}</strong>
              <span className={'chip ' + (ver.kind === 'supplement' ? 'sup' : 'lock')}>{ver.kind === 'supplement' ? '补录' : '冻结'}</span>
              <small>{new Date(ver.at).toLocaleString()}</small>
            </div>
            <em>{ver.reason}</em>
            <small>{ver.snapshot.length} 条引文快照</small>
            <details><summary>查看快照引文</summary>
              <ol>{ver.snapshot.map((s, i) => <li key={i}>[{s.tier === 'core' ? '核心' : '支撑'}] {s.cite}</li>)}</ol>
            </details>
          </div>)}
          {pkg.versions.length > 0 && <button className="outline full" onClick={onExport}>↓ 导出最新冻结快照</button>}
        </div>
        <div className="card">
          <h4>判定日志</h4>
          {!pkg.log.length && <p className="hint">暂无记录。</p>}
          {[...pkg.log].reverse().map((l, i) => <div className={'log-row ' + l.type} key={i}>
            <small>{new Date(l.at).toLocaleString()}</small>
            <span>{LOG_LABEL[l.type] ?? l.type}</span>
            <p>{l.detail}</p>
          </div>)}
        </div>
      </div>
    </div>
  </main>;
}
