/**
 * Formats seconds into M:SS, or H:MM:SS when >= 1 hour.
 * Never returns NaN/undefined/Infinity — falls back to "0:00".
 */
export function formatTime(seconds) {
  if (
    seconds === null ||
    seconds === undefined ||
    Number.isNaN(seconds) ||
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return '0:00';
  }

  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** Safe percentage (0-100) for progress bars. Never NaN/Infinity. */
export function safePercent(current, total) {
  if (
    current === null || current === undefined ||
    total === null || total === undefined ||
    Number.isNaN(current) || Number.isNaN(total) ||
    !Number.isFinite(total) || total <= 0
  ) {
    return 0;
  }
  const clampedCurrent = Math.min(Math.max(current, 0), total);
  return (clampedCurrent / total) * 100;
}
