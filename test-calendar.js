function toISODate(d) {
    const y = d.getFullYear();
    const m2 = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m2}-${dd}`;
}

const month = new Date(2026, 1, 1);
const year = month.getFullYear();
const m = month.getMonth();
const firstDay = new Date(year, m, 1);
const lastDay = new Date(year, m + 1, 0);
const startWeekday = firstDay.getDay(); // 0=Sun
const daysInMonth = lastDay.getDate();

const cells = [];
for (let i = 0; i < startWeekday; i++) {
    const dateObj = new Date(year, m, 1 - (startWeekday - i));
    const dateStr = toISODate(dateObj);
    cells.push({ dateStr, isOtherMonth: true });
}
for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, m, d);
    const dateStr = toISODate(dateObj);
    cells.push({ dateStr, isOtherMonth: false });
}
while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const [lastYear, lastMonth, lastDayDate] = last.dateStr.split('-').map(Number);
    const nextDate = new Date(lastYear, lastMonth - 1, lastDayDate + 1);
    cells.push({ dateStr: toISODate(nextDate), isOtherMonth: true });
}

console.log('First 10:', cells.slice(0, 10));
console.log('Last 10:', cells.slice(-10));
