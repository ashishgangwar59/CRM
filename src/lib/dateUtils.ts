/** Number of calendar days in a "YYYY-MM" month (28/29/30/31). Falls back to 30. */
export function getDaysInMonth(monthYear?: string | null): number {
    const match = /^(\d{4})-(\d{2})/.exec(monthYear || "");
    if (!match) return 30;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return 30;
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Total / Paid / LOP days to show on a salary slip.
 * - Total Days: salary period length (start..end inclusive) when both dates are set,
 *   otherwise the calendar days of the slip's month.
 * - LOP Days: whatever LOP was applied when the slip was generated.
 * - Paid Days: Total Days - LOP Days.
 */
export function getSlipDays(payroll: {
    monthYear?: string;
    totalDays?: number | null;
    paidDays?: number | null;
    salaryPeriodStart?: string | Date | null;
    salaryPeriodEnd?: string | Date | null;
} | null | undefined) {
    if (!payroll) return { totalDays: 30, paidDays: 30, lopDays: 0 };

    let totalDays = getDaysInMonth(payroll.monthYear);
    if (payroll.salaryPeriodStart && payroll.salaryPeriodEnd) {
        const toUtcDay = (v: string | Date) => {
            const d = new Date(v);
            return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        };
        const start = toUtcDay(payroll.salaryPeriodStart);
        const end = toUtcDay(payroll.salaryPeriodEnd);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
            totalDays = Math.round((end - start) / 86400000) + 1;
        }
    }

    const storedTotal = Number(payroll.totalDays) || 0;
    const storedPaid = payroll.paidDays;
    const lopDays = storedTotal > 0 && storedPaid != null
        ? Math.min(Math.max(0, storedTotal - Number(storedPaid)), totalDays)
        : 0;

    return { totalDays, paidDays: totalDays - lopDays, lopDays };
}

export function getDaysBetweenDates(investmentDate: any, maturityDate: any, includeStartDate = false) {
    const startDate: any = new Date(investmentDate);
    const endDate: any = new Date(maturityDate);

    // Remove time portion
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const difference = endDate - startDate;
    let days = difference / (1000 * 60 * 60 * 24);

    if (includeStartDate) {
        days += 1;
    }

    return days;
}