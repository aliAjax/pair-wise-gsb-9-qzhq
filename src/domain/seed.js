// 初始数据：覆盖三种出处类型，含字段缺失样本用于演示核验不通过

import { verifyReference } from './verify.js';
import { blankVerify } from './model.js';

const T0 = new Date('2026-09-01T09:00:00').getTime();

const raw = [
  {
    id: 'r1', title: 'The Extended Mind', authors: 'Clark, A. & Chalmers, D.', year: 1998,
    sourceType: 'journal', venue: 'Analysis', volume: '58', issue: '1', pages: '7–19',
    tags: ['具身认知', '经典'], status: '阅读中',
    abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
  },
  {
    id: 'r2', title: 'Situated Learning', authors: 'Lave, J. & Wenger, E.', year: 1991,
    sourceType: 'book', publisher: 'Cambridge University Press',
    tags: ['学习科学', '社会'], status: '待读',
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
  },
  {
    id: 'r3', title: 'Designing with Data', authors: 'Miller, S.', year: 2022,
    sourceType: 'book', publisher: 'MIT Press',
    tags: ['设计研究', '方法'], status: '已读',
    abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
  },
  {
    id: 'r4', title: 'Grapheme–Colour Synaesthesia and the Brain', authors: 'Ward, J.', year: 2013,
    sourceType: 'journal', venue: 'Cognitive Neuropsychology', volume: '30', issue: '', pages: '',
    tags: ['认知'], status: '待读',
    abstract: '综述字形—颜色联觉的稳定关联、个体差异与神经基础。',
  },
  {
    id: 'r5', title: 'Tools for the Body (Schema)', authors: 'Maravita, A. & Iriki, A.', year: 2004,
    sourceType: 'journal', venue: 'Trends in Cognitive Sciences', volume: '8', issue: '2', pages: '79–86',
    tags: ['具身认知'], status: '已读',
    abstract: '工具使用如何重塑身体图式与近身空间的神经表征。',
  },
  {
    id: 'r6', title: 'Sketching in the Wild', authors: 'Chen, L.', year: 2023,
    sourceType: 'conference', venue: 'CHI EA 2023', location: '',
    tags: ['设计研究'], status: '待读',
    abstract: '田野场景下的草图原型实践、约束与机会。',
  },
  {
    id: 'r7', title: 'The Craftsman', authors: 'Sennett, R.', year: 2008,
    sourceType: 'book', publisher: '',
    tags: ['方法'], status: '待读',
    abstract: '匠人精神与技艺实践中的物质思考。',
  },
  {
    id: 'r8', title: 'Resource-Rational Cognition', authors: 'Lieder, F. & Griffiths, T.', year: 2020,
    sourceType: 'conference', venue: 'CogSci 2020', location: 'Toronto, CA',
    tags: ['认知'], status: '待读',
    abstract: '资源理性框架下的认知建模与计算层级分析。',
  },
];

const normalize = (r) => ({
  venue: '', volume: '', issue: '', pages: '', publisher: '', location: '', notes: '',
  ...r,
});

export function seedLibrary() {
  // r8 保持待核验，便于演示“支撑待核验超配额即驳回”
  return raw.map((r, i) => {
    const ref = normalize(r);
    return r.id === 'r8'
      ? { ...ref, verify: blankVerify() }
      : verifyReference(ref, T0 + i * 1000);
  });
}

export function seedPackages() {
  return [
    {
      id: 'p1',
      name: '博士论文初稿投稿包',
      status: 'draft',
      entries: [
        { refId: 'r1', role: 'core' },
        { refId: 'r2', role: 'core' },
        { refId: 'r3', role: 'support' },
        { refId: 'r5', role: 'support' },
      ],
      versions: [],
      history: [{ at: T0, type: 'create', text: '创建投稿包' }],
    },
  ];
}
