const exception_date = '2026-02-26';
const splitDateObj = new Date(exception_date);
const dayBeforeObj = new Date(splitDateObj);
dayBeforeObj.setDate(dayBeforeObj.getDate() - 1);
const dayBeforeStr = dayBeforeObj.toISOString().split('T')[0];
console.log(dayBeforeStr);
