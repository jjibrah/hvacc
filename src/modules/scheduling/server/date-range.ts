export function getSchedulingDateRange() {
  const now = new Date();
  return {
    now,
    from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  };
}
