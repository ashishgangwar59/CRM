export const calculateCustomDays = (startStr: string | Date, endStr: string | Date): number => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    const rawDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Custom Business Logic: 
    // If an investment is made at the very end of a month (>= 25th)
    // and matures at the end of the next month (>= 28th),
    // we don't count the 35+ calendar days. 
    // We just return the number of days in the maturity month (e.g. 31 days for Oct).
    if (start.getDate() >= 25 && end.getDate() >= 28) {
        return new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
    }
    
    return Math.max(0, rawDays);
};
