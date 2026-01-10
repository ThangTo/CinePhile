const Cast = require('../models/cast.model');
const { searchPersonByName, getCreditsFromTmdb } = require('./tmdb.service');
const {
  isLatinName,
  findLatinName,
  containsCJKCharacters,
  normalizeRole,
} = require('../utils/castUtils');
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

  // Xử lý tên Latin: nếu name không phải Latin thì tìm tên Latin
  if (!isLatinName(tmdbPerson.name)) {
    // Lấy tên Latin đầu tiên từ alsoKnownAs
    let latinName = findLatinName(tmdbPerson.alsoKnownAs || []);

    // Nếu không có trong alsoKnownAs, lấy từ DB (nameLatin hiện có)
    if (!latinName) {
      const query = tmdbPerson.tmdbId
        ? { tmdbId: tmdbPerson.tmdbId }
        : {
            name: tmdbPerson.name,
          };
      const existing = await Cast.findOne(query).lean();
      if (existing && existing.nameLatin && isLatinName(existing.nameLatin)) {
        latinName = existing.nameLatin;
      }
    }

    // Nếu vẫn không có, dùng lại name ban đầu
    if (!latinName) {
      latinName = tmdbPerson.name;
    }

    update.nameLatin = latinName;
    // eslint-disable-next-line no-console
    console.log(`  📝 Chuẩn hóa tên: "${tmdbPerson.name}" → "${latinName}"`);
  }

  // Không ghi đè alsoKnownAs, sẽ merge bằng $addToSet ở dưới

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
      // Merge alsoKnownAs mới vào array cũ (không ghi đè)
      ...(Array.isArray(tmdbPerson.alsoKnownAs) &&
        tmdbPerson.alsoKnownAs.length > 0 && {
          $addToSet: {
            alsoKnownAs: { $each: tmdbPerson.alsoKnownAs },
          },
        }),
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

  // Import getPersonDetails để lấy alsoKnownAs đầy đủ
  const { getPersonDetails } = require('./tmdb.service');

  const castDocs = [];

  // Lưu cast với đầy đủ thông tin (tên, vai diễn, hình ảnh, alsoKnownAs)
  for (const person of credits.cast) {
    // Lấy thông tin chi tiết từ person API để có also_known_as đầy đủ
    let personDetails = null;
    if (person.tmdbId) {
      try {
        personDetails = await getPersonDetails(person.tmdbId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`⚠️  Không thể lấy person details cho ${person.name}:`, error.message);
      }
    }

    const castDoc = await upsertCastFromTmdb(
      {
        ...person,
        // Ưu tiên alsoKnownAs từ person details (đầy đủ hơn từ credits API)
        alsoKnownAs: personDetails?.alsoKnownAs || person.alsoKnownAs || [],
        // Merge thêm các field chi tiết nếu có
        ...(personDetails && {
          biography: personDetails.biography,
          birthday: personDetails.birthday,
          deathday: personDetails.deathday,
          place_of_birth: personDetails.place_of_birth,
          imdbId: personDetails.imdbId,
          gender: personDetails.gender,
          images: personDetails.images,
        }),
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

    // Delay để tránh rate limit TMDb API
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Lưu crew (directors, producers, etc.)
  const directors = credits.crew.filter(
    (p) => p.department === 'Directing' || p.job?.toLowerCase().includes('director'),
  );
  for (const person of directors) {
    // Lấy thông tin chi tiết từ person API
    let personDetails = null;
    if (person.tmdbId) {
      try {
        personDetails = await getPersonDetails(person.tmdbId);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`⚠️  Không thể lấy person details cho ${person.name}:`, error.message);
      }
    }

    const castDoc = await upsertCastFromTmdb(
      {
        ...person,
        alsoKnownAs: personDetails?.alsoKnownAs || person.alsoKnownAs || [],
        ...(personDetails && {
          biography: personDetails.biography,
          birthday: personDetails.birthday,
          deathday: personDetails.deathday,
          place_of_birth: personDetails.place_of_birth,
          imdbId: personDetails.imdbId,
          gender: personDetails.gender,
          images: personDetails.images,
        }),
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

    // Delay để tránh rate limit TMDb API
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return castDocs;
}

module.exports = {
  ensureCastForName,
  ensureCastForNames,
  upsertCastFromTmdb,
  ensureCastFromTmdbId,
};
