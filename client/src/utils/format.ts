export function formatDate(date: string | Date | undefined | null) {
  if (!date) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  } catch (e) {
    return 'Invalid Date';
  }
}

export function formatTime(date: string | Date | undefined | null) {
  if (!date) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  } catch (e) {
    return 'Invalid Time';
  }
}

