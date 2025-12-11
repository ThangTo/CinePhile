/**
 * Format thời gian relative (time ago)
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @returns {string} Formatted time string
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const dateObj = date instanceof Date ? date : new Date(date);
  const diff = now - dateObj;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  // const seconds = Math.floor(diff / 1000);

  if (days > 0) {
    return `${days} ngày trước`;
  } else if (hours > 0) {
    return `${hours} giờ trước`;
  } else if (minutes > 0) {
    return `${minutes} phút trước`;
    // } else if (seconds > 0) {
    //   return `${seconds} giây trước`;
  } else {
    return "Vừa xong";
  }
};
