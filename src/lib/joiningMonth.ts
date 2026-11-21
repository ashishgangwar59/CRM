// Helpers to compare an employee's joining date with a payroll month (YYYY-MM).

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Returns the joining month as "YYYY-MM" (IST), or null if no valid date. */
export function getJoiningMonth(dateOfJoining: unknown): string | null {
  if (!dateOfJoining) return null;
  const date = new Date(dateOfJoining as any);
  if (Number.isNaN(date.getTime())) return null;
  // Shift to IST so a date saved as local midnight doesn't fall into the previous day/month.
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 7);
}

/** True when the employee joined after the given month (so they have no salary for it). */
export function joinedAfterMonth(dateOfJoining: unknown, monthYear: string): boolean {
  const joiningMonth = getJoiningMonth(dateOfJoining);
  if (!joiningMonth || !monthYear) return false;
  return joiningMonth > monthYear;
}
