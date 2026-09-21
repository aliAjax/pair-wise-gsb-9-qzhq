// 界面层：文献库视图 —— 出处登记、单篇核验、加入投稿包
import React, { useEffect, useMemo, useState } from 'react';
import { verifyReference, formatCitation, sourceTypeLabel, emptyRef } from '../domain/reference.js';
import RefFields from './RefFields.jsx';

export default function LibraryView({ refs, locked, selectedId, onSelect, onSave, onAdd, onAddEntry, curPkg, notify }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('全部');
  const [show, setShow] = useState(false);
  const [addForm, setAddForm] = useState(emptyRef());
  const cur = refs.find(r => r.id === selectedId) ?? refs[0];
  const [edit, setEdit] = useState(null);
  useEffect(() => { if (cur) setEdit({ ...cur, tags: cur.tags.join(',') }); }, [cur?.id]);

  const tags = ['全部', ...new Set(refs.flatMap(r => r.tags))];
  const filtered = useMemo(() => refs.filter(x =>
    (tag === '全部' || x.tags.includes(tag)) &&
    `${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase())), [refs, tag, query]);

  const save = () => {
    onSave(cur.id, {
      ...edit,
      year: +edit.year || cur.year,
      tags: String(edit.tags).split(',').map(s => s.trim()).filter(Boolean),
    });
  };
  const add = () => {
    if (!addForm.title.trim()) { notify('标题不能为空'); return; }
    onAdd(addForm);
    setAddForm(emptyRef());
    setShow(false);
  };

  const isLocked = cur && locked.has(cur.id);
  const v = cur ? verifyReference(cur) : null;
  const inPkg = cur && curPkg ? curPkg.entries.find(e => e.refId === cur.id) : null;

  return <main>
    <header>
      <div><span className="crumb">RESEARCH / LIBRARY</span><h1>文献库</h1></div>
      <div className="actions">
        <button className="primary" onClick={() => setShow(true)}>＋ 登记文献</button>
      </div>
    </header>
    <div className="toolbar">
      <div className="search">⌕<input placeholder="搜索标题、作者或摘要…" value={query} onChange={e => setQuery(e.target.value)}/>
        {query && <button onClick={() => setQuery('')}>×</button>}</div>
      <div className="tag-filter">{tags.map(t =>
        <button className={tag === t ? 'on' : ''} onClick={() => setTag(t)} key={t}>{t}</button>)}</div>
    </div>
    <div className="body">
      <section className="paper-list">
        {filtered.map(p => {
          const pv = verifyReference(p);
          return <button className={'paper ' + (cur && cur.id === p.id ? 'selected' : '')} onClick={() => onSelect(p.id)} key={p.id}>
            <div className="paper-year">{p.year}</div>
            <div className="paper-copy">
              <h3>{p.title}</h3>
              <p>{p.authors}</p>
              <div>{p.tags.map(t => <span key={t}>#{t}</span>)}</div>
            </div>
            <div className="paper-side">
              <small className="type-badge">{sourceTypeLabel(p.sourceType)}</small>
              <small className={'chip ' + (pv.ok ? 'ok' : 'warn')}>{pv.ok ? '通过' : '待核验'}</small>
              {locked.has(p.id) && <small className="chip lock">只读</small>}
            </div>
          </button>;
        })}
        {!filtered.length && <div className="no-result">没有找到匹配的文献</div>}
      </section>
      {cur && edit && <section className="detail">
        <div className="detail-top">
          <div className="badge-row">
            <span className="type-badge">{sourceTypeLabel(cur.sourceType)}</span>
            {v.ok ? <span className="chip ok">核验通过</span> : <span className="chip warn">待核验</span>}
            {isLocked && <span className="chip lock">已冻结 · 引文只读</span>}
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(formatCitation(cur)); notify('引用文本已复制'); }}>▣ 复制引用</button>
        </div>
        <h2>{cur.title}</h2>
        <p className="authors">{cur.authors} · {cur.year}</p>
        {!v.ok && <div className="verify-card">
          <strong>出处缺项，不得核验通过</strong>
          <div className="missing">{v.missing.map(m => <span key={m}>缺 {m}</span>)}</div>
        </div>}
        <div className="detail-section">
          <h4>引用文本 <span>CITATION</span></h4>
          <div className="cite-box">{formatCitation(cur)}</div>
        </div>
        <div className="detail-section">
          <h4>摘要 <span>ABSTRACT</span></h4>
          <p>{cur.abstract || '—'}</p>
        </div>
        <div className="detail-section">
          <h4>出处登记 <span>SOURCE</span>{isLocked && <em className="lock-hint">被冻结包引用中，不可修改</em>}</h4>
          <div className="form-grid">
            <RefFields value={edit} disabled={isLocked} onChange={(k, val) => setEdit({ ...edit, [k]: val })}/>
            <label>关键词<input disabled={isLocked} value={edit.tags} onChange={e => setEdit({ ...edit, tags: e.target.value })} placeholder="用逗号分隔"/></label>
            {!isLocked && <button className="primary" onClick={save}>保存出处</button>}
          </div>
        </div>
        <div className="detail-section">
          <h4>加入投稿包 <span>PACKAGE</span></h4>
          {!curPkg && <p className="hint">请先在「投稿包」页创建一个投稿包。</p>}
          {curPkg && inPkg && <p className="hint">已在「{curPkg.name}」中（{inPkg.tier === 'core' ? '核心' : '支撑'}引用）。</p>}
          {curPkg && !inPkg && curPkg.status === 'frozen' &&
            <p className="hint">「{curPkg.name}」已冻结，请到投稿包页走补录流程（须填原因，生成新版本）。</p>}
          {curPkg && !inPkg && curPkg.status !== 'frozen' &&
            <div className="cite-actions">
              <button onClick={() => onAddEntry(cur.id, 'core')}>＋ 作为核心引用</button>
              <button onClick={() => onAddEntry(cur.id, 'supporting')}>＋ 作为支撑引用</button>
            </div>}
        </div>
      </section>}
    </div>
    {show && <div className="modal-bg"><div className="modal">
      <button className="close" onClick={() => setShow(false)}>×</button>
      <span className="crumb">NEW REFERENCE</span>
      <h2>登记文献出处</h2>
      <RefFields value={addForm} onChange={(k, val) => setAddForm({ ...addForm, [k]: val })}/>
      <label>关键词<input value={addForm.tags} onChange={e => setAddForm({ ...addForm, tags: e.target.value })} placeholder="用逗号分隔"/></label>
      <label>摘要<textarea rows="3" value={addForm.abstract} onChange={e => setAddForm({ ...addForm, abstract: e.target.value })}/></label>
      <p className="hint">期刊须登记卷、期、页码；图书须登记出版社；会议须登记地点，否则不得核验通过。</p>
      <button className="primary full" onClick={add}>保存文献</button>
    </div></div>}
  </main>;
}
