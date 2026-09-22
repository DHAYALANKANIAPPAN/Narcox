function analyze(text) {
  const lower = (text || '').toLowerCase();
  const hits = ['heroin', 'mdma', 'cocaine', 'kanja'].filter(w => lower.includes(w));
  return {
    risk: hits.length ? 8 : 0,
    level: hits.length ? 'high' : 'low',
    categories: hits.length ? ['drugs'] : [],
    matches: hits.map(term => ({ term, type: 'keyword' })),
    identifiers: {},
    reasons: hits.length ? [`matched keywords: ${hits.join(', ')}`] : []
  };
}
module.exports = { analyze };
