/**
 * Kiểm tra xem tên có chứa ký tự tượng hình (CJK: Chinese, Japanese, Korean) không
 * @param {string} name
 * @returns {boolean}
 */
function containsCJKCharacters(name) {
  if (!name) return false;
  // Unicode ranges: CJK Unified Ideographs, Hiragana, Katakana, Hangul
  const cjkRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
  return cjkRegex.test(name);
}

/**
 * Kiểm tra xem tên có phải là chữ Latin không (chỉ chứa a-z, A-Z, khoảng trắng, dấu gạch ngang, dấu nháy)
 * @param {string} name
 * @returns {boolean}
 */
function isLatinName(name) {
  if (!name) return false;
  const latinRegex = /^[a-zA-Z\s\-']+$/;
  return latinRegex.test(name.trim());
}

/**
 * Tìm tên Latin đầu tiên từ alsoKnownAs (thường là tên được romanized)
 * @param {string[]} alsoKnownAs
 * @returns {string|null}
 */
function findLatinName(alsoKnownAs) {
  if (!Array.isArray(alsoKnownAs) || alsoKnownAs.length === 0) return null;

  // Tìm tên chỉ chứa chữ Latin (a-z, A-Z, khoảng trắng, dấu gạch ngang)
  for (const alias of alsoKnownAs) {
    if (alias && isLatinName(alias)) {
      return alias.trim();
    }
  }

  return null;
}

/**
 * Chuẩn hoá roles (actor/director)
 * @param {string} role
 * @returns {'actor'|'director'|null}
 */
function normalizeRole(role) {
  if (!role) return null;
  const lower = role.toLowerCase();
  if (lower.includes('actor') || lower.includes('diễn') || lower.includes('dien')) return 'actor';
  if (lower.includes('director') || lower.includes('đạo diễn') || lower.includes('dao dien')) {
    return 'director';
  }
  if (lower === 'actor' || lower === 'cast') return 'actor';
  if (lower === 'director') return 'director';
  return null;
}
module.exports = {
  containsCJKCharacters,
  isLatinName,
  findLatinName,
  normalizeRole,
};
