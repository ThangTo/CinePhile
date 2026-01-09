const Cast = require('../models/cast.model');
const { searchPersonByName, getCreditsFromTmdb } = require('./tmdb.service');

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
 * Tìm tên Latin từ alsoKnownAs (thường là tên được romanized)
 * @param {string[]} alsoKnownAs
 * @returns {string|null}
 */
function findLatinName(alsoKnownAs) {
  if (!Array.isArray(alsoKnownAs) || alsoKnownAs.length === 0) return null;

  // Tìm tên chỉ chứa chữ Latin (a-z, A-Z, khoảng trắng, dấu gạch ngang)
  const latinRegex = /^[a-zA-Z\s\-']+$/;
  for (const alias of alsoKnownAs) {
    if (alias && latinRegex.test(alias.trim())) {
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

/**
 * Tạo hoặc cập nhật Cast document từ kết quả TMDb
 * @param {Object} tmdbPerson
 * @param {('actor'|'director'|null)} role
 * @returns {Promise<Cast|null>}
 */
async function upsertCastFromTmdb(tmdbPerson, role = null) {
  if (!tmdbPerson) return null;

  const normalizedRole = normalizeRole(role) || null;

  const update = {
    name: tmdbPerson.name,
    tmdbId: tmdbPerson.tmdbId,
    profilePath: tmdbPerson.profilePath,
    profileUrl: tmdbPerson.profileUrl,
    knownForDepartment: tmdbPerson.knownForDepartment,
    popularity: tmdbPerson.popularity,
  };

  // Thêm thông tin chi tiết nếu có
  if (tmdbPerson.biography) update.biography = tmdbPerson.biography;
  if (tmdbPerson.birthday) update.birthday = tmdbPerson.birthday;
  if (tmdbPerson.deathday) update.deathday = tmdbPerson.deathday;
  if (tmdbPerson.place_of_birth) update.place_of_birth = tmdbPerson.place_of_birth;
  if (tmdbPerson.imdbId) update.imdbId = tmdbPerson.imdbId;
  if (tmdbPerson.gender !== undefined) update.gender = tmdbPerson.gender;
  if (tmdbPerson.images && Array.isArray(tmdbPerson.images)) {
    update.images = tmdbPerson.images.map((img) => {
      if (typeof img === 'string') return img;
      return img.file_path ? `https://image.tmdb.org/t/p/w500${img.file_path}` : img;
    });
  }

  // Xử lý tên Latin nếu tên gốc chứa ký tự tượng hình
  if (containsCJKCharacters(tmdbPerson.name)) {
    const latinName = findLatinName(tmdbPerson.alsoKnownAs);
    if (latinName) {
      update.nameLatin = latinName;
      // eslint-disable-next-line no-console
      console.log(`  📝 Chuẩn hóa tên: "${tmdbPerson.name}" → "${latinName}"`);
    }
  }

  if (Array.isArray(tmdbPerson.alsoKnownAs) && tmdbPerson.alsoKnownAs.length > 0) {
    update.alsoKnownAs = tmdbPerson.alsoKnownAs;
  }

  const query = tmdbPerson.tmdbId
    ? { tmdbId: tmdbPerson.tmdbId }
    : {
        name: tmdbPerson.name,
      };

  const castDoc = await Cast.findOneAndUpdate(
    query,
    {
      $set: update,
      ...(normalizedRole && { $addToSet: { roles: normalizedRole } }),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  return castDoc;
}

/**
 * Đảm bảo có Cast cho 1 tên người (từ phimapi) – search TMDb, rồi upsert
 * @param {string} name - Tên người (diễn viên/đạo diễn)
 * @param {'actor'|'director'} role - Loại vai
 * @returns {Promise<Cast|null>}
 */
/**
 * Cập nhật nameLatin cho cast đã có nếu thiếu
 * @param {Cast} castDoc
 * @param {string} originalName - Tên gốc để search TMDb nếu cần
 * @returns {Promise<Cast>}
 */
async function updateMissingLatinName(castDoc, originalName) {
  if (!castDoc) return castDoc;

  // Nếu đã có nameLatin hoặc tên không phải tượng hình, không cần update
  if (castDoc.nameLatin || !containsCJKCharacters(castDoc.name)) {
    return castDoc;
  }

  // Nếu có tmdbId, thử lấy thông tin từ TMDb
  if (castDoc.tmdbId) {
    try {
      const axios = require('axios');
      const TMDB_API_KEY = process.env.TMDB_API_KEY;
      const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

      if (TMDB_API_KEY) {
        const response = await axios.get(`${TMDB_BASE_URL}/person/${castDoc.tmdbId}`, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'vi-VN',
          },
        });

        const person = response.data;
        if (person) {
          const latinName = findLatinName(person.also_known_as || []);
          if (latinName) {
            castDoc.nameLatin = latinName;
            await castDoc.save();
            // eslint-disable-next-line no-console
            console.log(`  🔄 Đã cập nhật nameLatin: "${castDoc.name}" → "${latinName}"`);
            return castDoc;
          }
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`  ⚠️  Không thể lấy thông tin từ TMDb cho ${castDoc.name}:`, error.message);
    }
  }

  // Nếu không có tmdbId hoặc không lấy được, thử search lại
  if (originalName && containsCJKCharacters(originalName)) {
    const tmdbPerson = await searchPersonByName(originalName);
    if (tmdbPerson) {
      const latinName = findLatinName(tmdbPerson.alsoKnownAs || []);
      if (latinName) {
        castDoc.nameLatin = latinName;
        await castDoc.save();
        // eslint-disable-next-line no-console
        console.log(`  🔄 Đã cập nhật nameLatin: "${castDoc.name}" → "${latinName}"`);
      }
    }
  }

  return castDoc;
}

async function ensureCastForName(name, role) {
  if (!name || !name.trim()) return null;

  // Thử tìm sẵn trong DB trước theo name và role
  const normalizedRole = normalizeRole(role);

  // Nếu tên là tượng hình, cũng tìm theo nameLatin
  const isCJK = containsCJKCharacters(name);
  const query = normalizedRole
    ? {
        $or: [{ name }, ...(isCJK ? [{ nameLatin: name }] : [])],
        roles: normalizedRole,
      }
    : {
        $or: [{ name }, ...(isCJK ? [{ nameLatin: name }] : [])],
      };

  const existing = await Cast.findOne(query);
  if (existing) {
    // Nếu tìm thấy nhưng thiếu nameLatin và tên là tượng hình, cập nhật
    if (containsCJKCharacters(existing.name) && !existing.nameLatin) {
      return await updateMissingLatinName(existing, name);
    }
    // Đảm bảo lưu lại tên gốc từ movies vào alsoKnownAs để dễ join ngược
    const trimmed = name.trim();
    if (trimmed && !(existing.alsoKnownAs || []).includes(trimmed)) {
      await Cast.updateOne({ _id: existing._id }, { $addToSet: { alsoKnownAs: trimmed } });
      existing.alsoKnownAs = [...(existing.alsoKnownAs || []), trimmed];
    }
    return existing;
  }

  // Nếu chưa có thì search TMDb
  const tmdbPerson = await searchPersonByName(name);
  if (!tmdbPerson) return null;

  const castDoc = await upsertCastFromTmdb(tmdbPerson, role);

  // Sau khi tạo mới từ TMDb, thêm luôn tên gốc từ movies vào alsoKnownAs
  if (castDoc && name && name.trim()) {
    const trimmed = name.trim();
    if (!(castDoc.alsoKnownAs || []).includes(trimmed)) {
      await Cast.updateOne({ _id: castDoc._id }, { $addToSet: { alsoKnownAs: trimmed } });
      castDoc.alsoKnownAs = [...(castDoc.alsoKnownAs || []), trimmed];
    }
  }

  return castDoc;
}

/**
 * Xử lý danh sách tên (actors/directors) – dùng cho crawl hoặc backfill
 * @param {string[]} names
 * @param {'actor'|'director'} role
 * @returns {Promise<Cast[]>}
 */
async function ensureCastForNames(names, role) {
  if (!Array.isArray(names) || !names.length) return [];

  const uniqueNames = [...new Set(names.map((n) => (n || '').trim()).filter(Boolean))];

  // Tối ưu: Lấy tất cả cast đã có trong DB một lần để tránh query nhiều lần
  const normalizedRole = normalizeRole(role);

  // Tổng số cast hiện có trong DB cho role này (thống kê tổng quát, không phụ thuộc tên thô)
  const totalCastInDbForRole = await Cast.countDocuments(
    normalizedRole ? { roles: normalizedRole } : {},
  );

  const existingCasts = await Cast.find(
    normalizedRole
      ? {
          name: { $in: uniqueNames },
          roles: normalizedRole,
        }
      : { name: { $in: uniqueNames } },
  ).lean();

  // Tạo Map để lookup nhanh
  const existingMap = new Map();
  existingCasts.forEach((cast) => {
    const key = (cast.name || '').trim().toLowerCase();
    if (key) {
      existingMap.set(key, cast);
    }
  });

  // Chỉ xử lý những tên chưa có trong DB
  const namesToProcess = uniqueNames.filter((name) => {
    const key = name.trim().toLowerCase();
    return !existingMap.has(key);
  });

  // eslint-disable-next-line no-console
  console.log('📊 Thống kê backfill:');
  // eslint-disable-next-line no-console
  console.log(`   • Tổng số tên unique lấy từ movies: ${uniqueNames.length}`);
  // eslint-disable-next-line no-console
  console.log(
    `   • Số cast đã có trong DB cho vai "${normalizedRole || 'any'}": ${totalCastInDbForRole}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `   • Số tên trùng với cast hiện có (so theo tên thô + role): ${existingCasts.length}`,
  );
  // eslint-disable-next-line no-console
  console.log(`   • Số tên cần gọi TMDb thêm (thực sự cần xử lý): ${namesToProcess.length}`);

  const result = [...existingCasts.map((c) => Cast.hydrate(c))]; // Convert lean docs back to Mongoose docs

  // Xử lý từng tên chưa có
  let processedCount = 0;
  let successCount = 0;
  for (const name of namesToProcess) {
    try {
      processedCount++;
      const castDoc = await ensureCastForName(name, role);
      if (castDoc) {
        successCount++;
        // eslint-disable-next-line no-console
        console.log(
          `✅ [${processedCount}/${namesToProcess.length}] Đã tìm thấy và lưu: "${name}" (${role})`,
        );
        result.push(castDoc);
      } else {
        // eslint-disable-next-line no-console
        console.log(
          `⚠️  [${processedCount}/${namesToProcess.length}] Không tìm thấy trên TMDb: "${name}" (${role})`,
        );
      }
      // Nhẹ nhàng sleep chút để tránh spam TMDb
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `❌ [${processedCount}/${namesToProcess.length}] Lỗi khi xử lý cast "${name}" (${role}):`,
        error.message,
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `\n📈 Tổng kết: Đã xử lý ${processedCount}/${
      namesToProcess.length
    } tên, thành công: ${successCount}, thất bại: ${processedCount - successCount}`,
  );

  return result;
}

/**
 * Lấy và lưu cast từ TMDb movie/tv ID (ưu tiên hơn search bằng tên)
 * @param {Object} movie - Movie document có tmdb.id
 * @returns {Promise<Array>} Array of Cast documents
 */
async function ensureCastFromTmdbId(movie) {
  if (!movie.tmdb || !movie.tmdb.id) {
    // Fallback về search bằng tên nếu không có tmdb.id
    return ensureCastForNames(movie.actor || [], 'actor');
  }

  const { tmdb } = movie;
  const credits = await getCreditsFromTmdb(tmdb.id, tmdb.type || 'movie', tmdb.season);

  if (!credits) {
    // Fallback về search bằng tên
    return ensureCastForNames(movie.actor || [], 'actor');
  }

  const castDocs = [];

  // Lưu cast với đầy đủ thông tin (tên, vai diễn, hình ảnh)
  for (const person of credits.cast) {
    const castDoc = await upsertCastFromTmdb(
      {
        ...person,
        alsoKnownAs: person.alsoKnownAs || [],
      },
      'actor',
    );
    if (castDoc) {
      castDocs.push({
        castDoc,
        character: person.character,
        order: person.order,
      });
    }
  }

  // Lưu crew (directors, producers, etc.)
  const directors = credits.crew.filter(
    (p) => p.department === 'Directing' || p.job?.toLowerCase().includes('director'),
  );
  for (const person of directors) {
    const castDoc = await upsertCastFromTmdb(
      {
        ...person,
        alsoKnownAs: person.alsoKnownAs || [],
      },
      'director',
    );
    if (castDoc) {
      castDocs.push({
        castDoc,
        character: null,
        order: 999,
      });
    }
  }

  return castDocs;
}

module.exports = {
  ensureCastForName,
  ensureCastForNames,
  upsertCastFromTmdb,
  ensureCastFromTmdbId,
};
