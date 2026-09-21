// 数据层：文献库、投稿包与核验配额的初始数据
// 文献按出处类型登记：journal 期刊 / book 图书 / conference 会议

export const seedRefs = [
  {
    id: 'r1', title: 'The Extended Mind', authors: 'Clark, A. & Chalmers, D.', year: 1998,
    sourceType: 'journal', journal: 'Analysis', volume: '58', issue: '1', pages: '7–19',
    publisher: '', conference: '', location: '',
    tags: ['具身认知', '经典'], status: '已读',
    abstract: '本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',
  },
  {
    id: 'r2', title: 'Situated Learning', authors: 'Lave, J. & Wenger, E.', year: 1991,
    sourceType: 'book', journal: '', volume: '', issue: '', pages: '',
    publisher: 'Cambridge University Press', conference: '', location: '',
    tags: ['学习科学', '社会'], status: '待读',
    abstract: '学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',
  },
  {
    id: 'r3', title: 'Designing with Data', authors: 'Miller, S.', year: 2022,
    sourceType: 'book', journal: '', volume: '', issue: '', pages: '',
    publisher: 'MIT Press', conference: '', location: '',
    tags: ['设计研究', '方法'], status: '已读',
    abstract: '一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',
  },
  {
    id: 'r4', title: 'Gradient-Based Learning Applied to Document Recognition',
    authors: 'LeCun, Y.; Bottou, L.; Bengio, Y. & Haffner, P.', year: 1998,
    sourceType: 'journal', journal: 'Proceedings of the IEEE', volume: '86', issue: '11', pages: '',
    publisher: '', conference: '', location: '',
    tags: ['机器学习'], status: '阅读中',
    abstract: '卷积神经网络在文档识别中的奠基性工作。',
  },
  {
    id: 'r5', title: 'Attention Is All You Need', authors: 'Vaswani, A. et al.', year: 2017,
    sourceType: 'conference', journal: '', volume: '', issue: '', pages: '',
    publisher: '', conference: 'NeurIPS', location: '',
    tags: ['机器学习', '经典'], status: '待读',
    abstract: '提出 Transformer 架构，以自注意力机制取代循环结构。',
  },
  {
    id: 'r6', title: 'The Design of Everyday Things', authors: 'Norman, D. A.', year: 2013,
    sourceType: 'book', journal: '', volume: '', issue: '', pages: '',
    publisher: '', conference: '', location: '',
    tags: ['设计研究'], status: '待读',
    abstract: '日常之物的设计心理学：示能、意符与反馈。',
  },
];

export const seedPackages = [
  {
    id: 'p1', name: '2026 春季投稿包', status: 'draft',
    entries: [
      { refId: 'r1', tier: 'core' },
      { refId: 'r2', tier: 'core' },
      { refId: 'r3', tier: 'supporting' },
      { refId: 'r4', tier: 'supporting' },
    ],
    versions: [], log: [],
  },
];

export const seedQuota = { supportingPendingMax: 5 };
