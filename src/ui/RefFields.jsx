// 界面层：按出处类型切换的登记字段（期刊/图书/会议）
import React from 'react';
import { SOURCE_TYPES } from '../domain/reference.js';

export default function RefFields({ value, onChange, disabled }) {
  const set = k => e => onChange(k, e.target.value);
  return <>
    <div className="two">
      <label>标题<input disabled={disabled} value={value.title} onChange={set('title')} placeholder="论文或著作标题"/></label>
      <label>作者<input disabled={disabled} value={value.authors} onChange={set('authors')} placeholder="姓, 名. & 姓, 名."/></label>
    </div>
    <div className="two">
      <label>年份<input disabled={disabled} type="number" value={value.year} onChange={set('year')}/></label>
      <label>出处类型
        <select disabled={disabled} value={value.sourceType} onChange={set('sourceType')}>
          {SOURCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
    </div>
    {value.sourceType === 'journal' && (
      <div className="four">
        <label>期刊名<input disabled={disabled} value={value.journal} onChange={set('journal')}/></label>
        <label>卷<input disabled={disabled} value={value.volume} onChange={set('volume')}/></label>
        <label>期<input disabled={disabled} value={value.issue} onChange={set('issue')}/></label>
        <label>页码<input disabled={disabled} value={value.pages} onChange={set('pages')} placeholder="7–19"/></label>
      </div>
    )}
    {value.sourceType === 'book' && (
      <label>出版社<input disabled={disabled} value={value.publisher} onChange={set('publisher')}/></label>
    )}
    {value.sourceType === 'conference' && (
      <div className="two">
        <label>会议名称<input disabled={disabled} value={value.conference} onChange={set('conference')}/></label>
        <label>会议地点<input disabled={disabled} value={value.location} onChange={set('location')} placeholder="城市, 国家"/></label>
      </div>
    )}
  </>;
}
