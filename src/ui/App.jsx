// 界面层：应用外壳 —— 组装三切片状态，转发领域操作
import React, { useEffect, useMemo, useState } from 'react';
import { seedRefs, seedPackages, seedQuota } from '../data/seed.js';
import { attemptFreeze, supplement, exportSnapshot, lockedRefIds } from '../domain/packages.js';
import { loadSlice, saveSlice } from '../store/storage.js';
import LibraryView from './LibraryView.jsx';
import PackageView from './PackageView.jsx';

export default function App() {
  // 三个切片分别加载，互不干扰（刷新不串台）
  const [refs, setRefs] = useState(() => loadSlice('library', seedRefs));
  const [packages, setPackages] = useState(() => loadSlice('packages', seedPackages));
  const [quota, setQuota] = useState(() => loadSlice('quota', seedQuota));
  const [view, setView] = useState('library');
  const [selectedRef, setSelectedRef] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => saveSlice('library', refs), [refs]);
  useEffect(() => saveSlice('packages', packages), [packages]);
  useEffect(() => saveSlice('quota', quota), [quota]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3600);
    return () => clearTimeout(t);
  }, [notice]);

  const refsById = useMemo(() => Object.fromEntries(refs.map(r => [r.id, r])), [refs]);
  const locked = useMemo(() => lockedRefIds(packages), [packages]);
  const curPkg = packages.find(p => p.id === selectedPkg) ?? packages[0] ?? null;
  const frozenCount = packages.filter(p => p.status === 'frozen').length;

  const updatePkg = (id, next) => setPackages(ps => ps.map(p => (p.id === id ? next : p)));

  // —— 文献库操作 ——
  const handleSaveRef = (id, patch) => {
    if (locked.has(id)) { setNotice('该文献已被冻结包引用，引文只读，修改被拦截'); return; }
    setRefs(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
    setNotice('出处已保存');
  };
  const handleAddRef = form => {
    const ref = {
      ...form, id: 'r' + Date.now(),
      year: +form.year || new Date().getFullYear(),
      tags: String(form.tags).split(',').map(s => s.trim()).filter(Boolean),
      status: '待读',
    };
    setRefs(rs => [...rs, ref]);
    setSelectedRef(ref.id);
    setNotice('文献已登记入库');
  };

  // —— 投稿包操作 ——
  const handleAddEntry = (refId, tier) => {
    if (!curPkg) return;
    if (curPkg.status !== 'draft') { setNotice('投稿包已冻结，请走补录流程'); return; }
    if (curPkg.entries.some(e => e.refId === refId)) { setNotice('该文献已在投稿包中'); return; }
    updatePkg(curPkg.id, { ...curPkg, entries: [...curPkg.entries, { refId, tier }] });
    setNotice(`已作为${tier === 'core' ? '核心' : '支撑'}引用加入「${curPkg.name}」`);
  };
  const handleRemoveEntry = refId =>
    updatePkg(curPkg.id, { ...curPkg, entries: curPkg.entries.filter(e => e.refId !== refId) });
  const handleMoveTier = (refId, tier) =>
    updatePkg(curPkg.id, { ...curPkg, entries: curPkg.entries.map(e => (e.refId === refId ? { ...e, tier } : e)) });
  const handleFreeze = () => {
    const { pkg, ev } = attemptFreeze(curPkg, refsById, quota);
    updatePkg(curPkg.id, pkg);
    setNotice(ev.reason);
  };
  const handleSupplement = (refId, tier, reason) => {
    const { pkg, ev, error } = supplement(curPkg, refsById, [{ refId, tier }], reason, quota);
    if (error) { setNotice(error); return; }
    updatePkg(curPkg.id, pkg);
    setNotice(ev.decision === 'freeze'
      ? `补录通过，已生成 v${pkg.versions.length} 新版本`
      : `补录被驳回并回滚：${ev.reason}`);
  };
  const handleExport = () => {
    if (!curPkg) return;
    const text = exportSnapshot(curPkg);
    if (!text) { setNotice('尚无冻结快照可导出'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `${curPkg.name}-v${curPkg.versions.length}-snapshot.txt`;
    a.click();
    setNotice('已按最新冻结快照导出');
  };
  const handleNewPackage = name => {
    if (!name.trim()) { setNotice('请填写投稿包名称'); return; }
    const p = { id: 'p' + Date.now(), name: name.trim(), status: 'draft', entries: [], versions: [], log: [] };
    setPackages(ps => [...ps, p]);
    setSelectedPkg(p.id);
    setNotice('投稿包已创建');
  };

  return <div className="app">
    <aside>
      <div className="logo"><span>∴</span> CITATION DESK</div>
      <div className="library-head">
        <span>投稿引文核验与冻结台</span>
        <strong>{refs.length}<small> 篇登记文献</small></strong>
      </div>
      <nav>
        <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>
          ▤ <span>文献库</span><b>{refs.length}</b></button>
        <button className={view === 'packages' ? 'active' : ''} onClick={() => setView('packages')}>
          ▦ <span>投稿包</span><b>{packages.length}</b></button>
      </nav>
      <div className="side-tags">
        <small>核验配额</small>
        <div className="side-quota">支撑待核验 ≤ {quota.supportingPendingMax} 条</div>
        <div className="side-quota">已冻结投稿包 {frozenCount} 个</div>
      </div>
      <div className="side-foot">
        <small>本地三切片隔离存储<br/>library · packages · quota</small>
      </div>
    </aside>
    {view === 'library'
      ? <LibraryView refs={refs} locked={locked} selectedId={selectedRef} onSelect={setSelectedRef}
          onSave={handleSaveRef} onAdd={handleAddRef} onAddEntry={handleAddEntry}
          curPkg={curPkg} notify={setNotice}/>
      : <PackageView packages={packages} pkg={curPkg} onSelectPkg={setSelectedPkg} onNewPackage={handleNewPackage}
          refs={refs} refsById={refsById} quota={quota} onQuota={setQuota}
          onFreeze={handleFreeze} onRemoveEntry={handleRemoveEntry} onMoveTier={handleMoveTier}
          onAddEntry={handleAddEntry} onSupplement={handleSupplement} onExport={handleExport}/>}
    {notice && <div className="toast">{notice}</div>}
  </div>;
}
