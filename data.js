// 示例数据，正式词表由用户提供后替换
window.PLAN = {
  totalDays: 270,
  daysPerMonth: 30,
  stages: [
    { id: 1, name: '第一阶段', fromMonth: 1, toMonth: 2, dailyNew: 10, wordEnd: 600 },
    { id: 2, name: '第二阶段', fromMonth: 3, toMonth: 4, dailyNew: 15, wordEnd: 1500 },
    { id: 3, name: '第三阶段', fromMonth: 5, toMonth: 6, dailyNew: 15, wordEnd: 2400 },
    { id: 4, name: '第四阶段', fromMonth: 7, toMonth: 8, dailyNew: 10, wordEnd: 3000 },
    { id: 5, name: '第九月：全面复习', fromMonth: 9, toMonth: 9, dailyNew: 0, wordEnd: 3000 }
  ],
  categoryTargets: { '名词': 1500, '动词': 500, '形容词': 700, '副词': 300 },
  reviewIntervals: [1, 2, 4, 7, 15, 30],
  checkpointDays: [60, 120, 180, 240, 270],
  testQuestionCount: 20,
  readingStartDay: 91,
  writingStartDay: 151,
  phonicsWeekEndDay: 7,
  consolidationStartDayInMonth: 24
};

window.WORDS = [
  { id: 1, word: 'apple', pos: 'n.', category: '名词', meaning: '苹果', phonetic: '', example: '' },
  { id: 2, word: 'orange', pos: 'n.', category: '名词', meaning: '橙子', phonetic: '', example: '' },
  { id: 3, word: 'book', pos: 'n.', category: '名词', meaning: '书', phonetic: '', example: '' },
  { id: 4, word: 'run', pos: 'v.', category: '动词', meaning: '跑', phonetic: '', example: '' },
  { id: 5, word: 'eat', pos: 'v.', category: '动词', meaning: '吃', phonetic: '', example: '' },
  { id: 6, word: 'make', pos: 'v.', category: '动词', meaning: '做；制造', phonetic: '', example: '' },
  { id: 7, word: 'big', pos: 'adj.', category: '形容词', meaning: '大的', phonetic: '', example: '' },
  { id: 8, word: 'happy', pos: 'adj.', category: '形容词', meaning: '快乐的', phonetic: '', example: '' },
  { id: 9, word: 'quickly', pos: 'adv.', category: '副词', meaning: '快速地', phonetic: '', example: '' },
  { id: 10, word: 'luckily', pos: 'adv.', category: '副词', meaning: '幸运地', phonetic: '', example: '' },
  { id: 11, word: 'table', pos: 'n.', category: '名词', meaning: '桌子', phonetic: '', example: '' },
  { id: 12, word: 'water', pos: 'n.', category: '名词', meaning: '水', phonetic: '', example: '' },
  { id: 13, word: 'go', pos: 'v.', category: '动词', meaning: '去', phonetic: '', example: '' },
  { id: 14, word: 'red', pos: 'adj.', category: '形容词', meaning: '红色的', phonetic: '', example: '' },
  { id: 15, word: 'slowly', pos: 'adv.', category: '副词', meaning: '慢慢地', phonetic: '', example: '' },
  { id: 16, word: 'school', pos: 'n.', category: '名词', meaning: '学校', phonetic: '', example: '' },
  { id: 17, word: 'see', pos: 'v.', category: '动词', meaning: '看见', phonetic: '', example: '' },
  { id: 18, word: 'small', pos: 'adj.', category: '形容词', meaning: '小的', phonetic: '', example: '' },
  { id: 19, word: 'very', pos: 'adv.', category: '副词', meaning: '非常', phonetic: '', example: '' },
  { id: 20, word: 'teacher', pos: 'n.', category: '名词', meaning: '老师', phonetic: '', example: '' }
];
