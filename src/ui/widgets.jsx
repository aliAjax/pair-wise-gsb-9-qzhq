// 界面层 · 共享小组件：徽标、状态片、提示、登记文献弹窗

import React, { useState } from 'react';
import { SOURCE_TYPES, FIELD_LABELS, VERIFY } from '../domain/model.js';

export const fmtTime = (t) => new Date(t).toLocaleString('zh-CN', { hour12: false });

export function TypeBadge({ type }) {
  const t = SOURCE_TYPES[type];
  return <span className={`typebadge ${type}`}>{t ? t.label : '未登记'}</span>;
}

export function VerifyChip({ verify }) {
  const v = VERIFY[verify?.status] ?? VERIFY.pending;
  return <span className={`chip ${v.cls}`}>{v.label}</span>;
}

export function Toast({ text }) {
  return text ? <div className="toast">{text}</div> : null;
}

export function AddRefModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    title: '', authors: '', year: String(new Date().getFullYear()), sourceType: 'journal',
    venue: '', volume: '', issue: '', pages: '', publisher: '', location: '',
    tags: '', abstract: '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fields = SOURCE_TYPES[form.sourceType].required;
  const label = (f) => (f === 'venue' ? (form.sourceType === 'journal' ? '期刊名' : '会议名') : FIELD_LABELS[f]);

  return (
    <div className="modal-bg">
      <div className="modal">
        <button className="close" onClick={onClose}>×</button>
        <span className="crumb">NEW REFERENCE</span>
        <h2>登记文献出处</h2>
        <div className="typeselect">
          {Object.entries(SOURCE_TYPES).map(([k, t]) => (
            <button key={k} className={form.sourceType === k ? 'on' : ''} onClick={() => set('sourceType', k)}>{t.label}</button>
          ))}
        </div>
        <label>标题<input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="论文或书籍标题" /></label>
        <label>作者<input value={form.authors} onChange={(e) => set('authors', e.target.value)} /></label>
        <div className="two">
          <label>年份<input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></label>
          <label>关键词<input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="逗号分隔" /></label>
        </div>
        <div className="two">
          {fields.map((f) => (
            <label key={f}>{label(f)}<input value={form[f]} onChange={(e) => set(f, e.target.value)} /></label>
          ))}
        </div>
        <label>摘要<textarea rows="2" value={form.abstract} onChange={(e) => set('abstract', e.target.value)} /></label>
        <button className="primary full" onClick={() => form.title.trim() && onSave(form)}>保存并核验</button>
      </div>
    </div>
  );
}
