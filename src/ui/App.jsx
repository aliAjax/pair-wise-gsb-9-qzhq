// 界面层 · 应用外壳：状态编排，把领域判定与持久化接到视图上

import React, { useEffect, useMemo, useState } from 'react';
import { SOURCE_FIELDS, blankVerify } from '../domain/model.js';
import { verifyReference, missingLabels } from '../domain/verify.js';
import * as PKG from '../domain/packages.js';
import { loadLibrary, saveLibrary, loadQuota, saveQuota, loadPackages, savePackages, KEYS } from '../store/storage.js';
import LibraryView from './LibraryView.jsx';
import PackagesView from './PackagesView.jsx';
import { AddRefModal, Toast } from './widgets.jsx';

// 非引文字段：冻结后仍可写（私人笔记、阅读状态不属于引文）
const FREE_KEYS = ['notes', 'status'];

export default function App() {
  const [view, setView] = useState('library');
  const [items, setItems] = useState(loadLibrary);
  const [packages, setPackages] = useState(loadPackages);
  const [quota, setQuota] = useState(loadQuota);
  const [selectedRef, setSelectedRef] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState('');

  // 三个命名空间各自独立落盘，刷新后文献、配额、冻结包互不串台
  useEffect(() => saveLibrary(items), [items]);
  useEffect(() => savePackages(packages), [packages]);
  useEffect(() => saveQuota(quota), [quota]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3600);
    return () => clearTimeout(t);
  }, [notice]);

  const refsById = useMemo(() => Object.fromEntries(items.map((x) => [x.id, x])), [items]);
  // 已进入任一冻结快照的文献：引文只读
  const frozenRefIds = useMemo(() => {
    const s = new Set();
    packages.forEach((p) => p.versions.forEach((v) => v.entries.forEach((e) => s.add(e.refId))));
    return s;
  }, [packages]);

  const say = setNotice;

  /* ---------- 文献 ---------- */
  const updateRef = (id, patch) => {
    if (frozenRefIds.has(id) && Object.entries(patch).some(([k, v]) => !FREE_KEYS.includes(k) && v !== undefined)) {
      say('该文献已进入冻结快照，引文只读；如需变更请在投稿包中补录新版本');
      return;
    }
    setItems((xs) => xs.map((x) => {
      if (x.id !== id) return x;
      const touchesSource = Object.keys(patch).some((k) => SOURCE_FIELDS.includes(k));
      return touchesSource ? { ...x, ...patch, verify: blankVerify() } : { ...x, ...patch };
    }));
  };

  const verifyOne = (id) => {
    setItems((xs) => xs.map((x) => (x.id === id ? verifyReference(x) : x)));
    say('核验完成');
  };

  const verifyAll = () => {
    setItems((xs) => xs.map((x) => verifyReference(x)));
    say('已重新核验全部文献');
  };

  const addRef = (form) => {
    const base = {
      id: `r${Date.now()}`,
      title: form.title.trim(),
      authors: form.authors.trim() || '佚名',
      year: +form.year || new Date().getFullYear(),
      sourceType: form.sourceType,
      venue: form.venue.trim(), volume: form.volume.trim(), issue: form.issue.trim(),
      pages: form.pages.trim(), publisher: form.publisher.trim(), location: form.location.trim(),
      tags: form.tags.split(',').map((x) => x.trim()).filter(Boolean),
      abstract: form.abstract.trim(), notes: '', status: '待读',
    };
    const ref = verifyReference(base);
    setItems((xs) => [...xs, ref]);
    setSelectedRef(ref.id);
    setShowAdd(false);
    say(ref.verify.status === 'passed' ? '文献已登记，核验通过' : `文献已登记，核验未通过：缺少 ${missingLabels(ref).join('、')}`);
  };

  /* ---------- 投稿包 ---------- */
  const patchPkg = (id, fn) => setPackages((ps) => ps.map((p) => (p.id === id ? fn(p) : p)));

  const createPkg = () => {
    const p = PKG.createPackage(`投稿包 ${packages.length + 1}`);
    setPackages((ps) => [...ps, p]);
    setSelectedPkg(p.id);
    say('投稿包已创建，请加入核心与支撑引用');
  };

  const addEntry = (id, refId, role) => { patchPkg(id, (p) => PKG.addEntry(p, refId, role)); say('已加入投稿包'); };
  const removeEntry = (id, refId) => patchPkg(id, (p) => PKG.removeEntry(p, refId));
  const setRole = (id, refId, role) => patchPkg(id, (p) => PKG.setRole(p, refId, role));

  const freeze = (id) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    const { pkg: next, error } = PKG.freezePackage(pkg, refsById, quota);
    if (error?.type === 'rejected') {
      patchPkg(id, () => next); // 仅写入驳回审计记录，条目录保持回滚后原样
      say('支撑待核验超过配额：整次驳回，已回滚');
      return;
    }
    if (error) { say(error.gate.problems.join('；')); return; }
    patchPkg(id, () => next);
    say('投稿包已冻结，引文转为只读');
  };

  const supplement = (id, refId, role, reason) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    const { pkg: next, error } = PKG.supplementPackage(pkg, refId, role, reason, refsById);
    if (error) { say(error); return; }
    patchPkg(id, () => next);
    say(`已补录并生成 v${PKG.latestVersion(next).version}`);
  };

  const exportPkg = (id) => {
    const pkg = packages.find((p) => p.id === id);
    const text = pkg && PKG.exportText(pkg);
    if (!text) return;
    const v = PKG.latestVersion(pkg);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    a.download = `${pkg.name}-v${v.version}-snapshot.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    say('已导出冻结快照');
  };

  return (
    <div className="app">
      <aside>
        <div className="logo"><span>∴</span> CITATION DESK</div>
        <div className="library-head">
          <span>投稿引文核验与冻结台</span>
          <strong>{items.length}<small> 篇登记文献</small></strong>
        </div>
        <nav>
          <button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>▤ <span>文献库</span><b>{items.length}</b></button>
          <button className={view === 'packages' ? 'active' : ''} onClick={() => setView('packages')}>▣ <span>投稿包</span><b>{packages.length}</b></button>
        </nav>
        <div className="quota-box">
          <small>核验配额 · QUOTA</small>
          <label>支撑待核验上限
            <input
              type="number" min="0" max="99" value={quota.maxPendingSupport}
              onChange={(e) => {
                const n = Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0));
                setQuota({ maxPendingSupport: n });
              }}
            />
          </label>
          <p>冻结时支撑引用待核验超过该上限，整次驳回并回滚</p>
        </div>
        <div className="side-foot">
          <small>
            本地隔离存储 · 刷新不串台<br />
            {KEYS.library}<br />{KEYS.quota}<br />{KEYS.packages}
          </small>
        </div>
      </aside>

      <main>
        {view === 'library' ? (
          <LibraryView
            items={items} frozenRefIds={frozenRefIds} selectedId={selectedRef}
            onSelect={setSelectedRef} onUpdate={updateRef}
            onVerifyOne={verifyOne} onVerifyAll={verifyAll} onAdd={() => setShowAdd(true)}
          />
        ) : (
          <PackagesView
            packages={packages} items={items} refsById={refsById} quota={quota}
            selectedId={selectedPkg} onSelect={setSelectedPkg} onCreate={createPkg}
            onAddEntry={addEntry} onRemoveEntry={removeEntry} onSetRole={setRole}
            onFreeze={freeze} onSupplement={supplement} onExport={exportPkg}
          />
        )}
      </main>

      {showAdd && <AddRefModal onClose={() => setShowAdd(false)} onSave={addRef} />}
      <Toast text={notice} />
    </div>
  );
}
