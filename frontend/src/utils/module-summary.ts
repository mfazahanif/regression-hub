export type ModuleSummary = {
  total: number;
  executed: number;
  'PASSED': number;
  'PASSED WITH NOTES': number;
  'FAILED': number;
  'BLOCKED': number;
  'DROPPED': number;
  'TO DO': number;
};

export function getModuleExecutionStatus(module: any) {
  const breakdown = Object.entries(module?.statusBreakdown || {}).reduce(
    (counts: Record<string, number>, [status, count]) => {
      counts[status.toUpperCase()] = Number(count) || 0;
      return counts;
    },
    {}
  );
  const passed = breakdown.PASSED || 0;
  const passedWithNotes = breakdown['PASSED WITH NOTES'] || 0;
  const failed = breakdown.FAILED || 0;
  const blocked = breakdown.BLOCKED || 0;
  const dropped = breakdown.DROPPED || 0;
  const toDo = (breakdown['TO DO'] || 0) + (breakdown.UNTESTED || 0);
  const executed = Object.entries(breakdown).reduce(
    (total, [status, count]) => total + (status === 'TO DO' || status === 'UNTESTED' ? 0 : count),
    0
  );

  if (failed > 0) return 'FAILED';
  if (blocked > 0) return 'BLOCKED';
  if (passedWithNotes > 0) return 'PASSED WITH NOTES';
  if (passed > 0) return 'PASSED';
  if (executed > 0 && dropped === executed) return 'DROPPED';
  if (executed > dropped) return 'BLOCKED';
  if (toDo > 0 || executed === 0) return 'TO DO';
  return 'TO DO';
}

export function getModuleSummary(modules: any[] = []): ModuleSummary {
  const summary: ModuleSummary = {
    total: modules.length,
    executed: 0,
    PASSED: 0,
    'PASSED WITH NOTES': 0,
    FAILED: 0,
    BLOCKED: 0,
    DROPPED: 0,
    'TO DO': 0,
  };

  modules.forEach(module => {
    const status = getModuleExecutionStatus(module) as keyof Omit<ModuleSummary, 'total' | 'executed'>;
    summary[status] += 1;
    if (status !== 'TO DO') summary.executed += 1;
  });

  return summary;
}
