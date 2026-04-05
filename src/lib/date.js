export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getShiftedDateKey(date = new Date(), offset = 0) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + offset);
  return getDateKey(nextDate);
}

export function getDateKeyFromIso(isoString) {
  if (!isoString) {
    return '';
  }

  const parsedDate = new Date(isoString);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return getDateKey(parsedDate);
}

export function formatReadableDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);

  return localDate.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
}

export function isEvening(date, thresholdHour) {
  return date.getHours() >= thresholdHour;
}
