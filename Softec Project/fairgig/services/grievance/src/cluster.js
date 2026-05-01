function deriveClusterKey(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('deduct') || text.includes('commission') || text.includes('fee')) return 'deduction';
  if (text.includes('late') || text.includes('delay') || text.includes('payout')) return 'delay';
  if (text.includes('harass') || text.includes('unsafe') || text.includes('attack')) return 'safety';
  if (text.includes('app') || text.includes('crash') || text.includes('bug')) return 'app_issue';
  return 'other';
}

module.exports = { deriveClusterKey };
