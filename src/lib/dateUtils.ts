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