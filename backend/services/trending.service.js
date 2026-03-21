require('dotenv').config();
const axios = require('axios');
const Parser = require('rss-parser');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db/db');
const MovieModel = require('../models/movie.model');
const TrendingMovieModel = require('../models/trending_movie.model');
const crawlerService = require('./crawler.service'); // Added crawler service

const rssParser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8'
  }
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ============================================================================
// STEP 1: Fetch TMDB Vietnam Trending + Popular
// ============================================================================
async function fetchTMDBVietnam() {
  console.log('🎬 [TRENDING] Bước 1: Đang lấy dữ liệu TMDB khu vực Việt Nam...');

  if (!TMDB_API_KEY) {
    console.warn('⚠️  [TRENDING] TMDB_API_KEY chưa được cấu hình, bỏ qua TMDB.');
    return [];
  }

  const movies = new Map(); // tmdb_id -> movie data (dedup)

  const endpoints = [
    { url: `${TMDB_BASE}/trending/movie/week`, label: 'Trending Week' },
    // { url: `${TMDB_BASE}/movie/popular`, label: 'Popular' },
    { url: `${TMDB_BASE}/trending/movie/day`, label: 'Trending Day' },
  ];

  for (const ep of endpoints) {
    try {
      // Fetch 2 pages = ~40 results per endpoint
      for (let page = 1; page <= 2; page++) {
        const { data } = await axios.get(ep.url, {
          params: {
            api_key: TMDB_API_KEY,
            language: 'vi-VN',
            // region: 'VN',
            page,
          },
          timeout: 10000,
        });

        (data.results || []).forEach((m) => {
          if (!movies.has(m.id)) {
            movies.set(m.id, {
              tmdb_id: m.id,
              title: m.title || m.name || '',
              original_title: m.original_title || m.original_name || '',
              poster_path: m.poster_path,
              backdrop_path: m.backdrop_path,
              overview: m.overview || '',
              popularity: m.popularity || 0,
              vote_average: m.vote_average || 0,
              release_date: m.release_date || m.first_air_date || '',
            });
          }
        });
      }
      console.log(`   ✅ ${ep.label}: Đã lấy. Tổng tích lũy: ${movies.size} phim.`);
    } catch (err) {
      console.warn(`   ⚠️  ${ep.label} thất bại: ${err.message}`);
    }
  }

  const result = Array.from(movies.values());
  console.log('🎬 [LIST] Chi tiết danh sách phim từ TMDB:');
  result.forEach((m, i) => {
    console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${m.title} (${m.original_title}) - Popularity: ${m.popularity}`);
  });
  console.log(`📊 [TRENDING] TMDB trả về tổng cộng ${result.length} phim unique.`);
  return result;
}

// ============================================================================
// STEP 2: Fetch Google Trends Vietnam via RSS
// ============================================================================
async function fetchGoogleTrendsVN() {
  console.log('🔥 [TRENDING] Bước 2: Đang đọc Google Trends Việt Nam qua RSS...');
  try {
    // Sử dụng endpoint chuẩn đã verify hoạt động
    const feed = await rssParser.parseURL('https://trends.google.com/trending/rss?geo=VN');

    const hotKeywords = feed.items.map(item => (item.title || '').toLowerCase());
    const uniqueKeywords = [...new Set(hotKeywords.filter(Boolean))];

    if (uniqueKeywords.length > 0) {
      console.log('🔥 [LIST] Chi tiết từ khóa Google Trends VN:');
      uniqueKeywords.forEach((k, i) => {
        process.stdout.write(`| ${k} `);
        if ((i + 1) % 5 === 0) console.log('|');
      });
      if (uniqueKeywords.length % 5 !== 0) console.log('|');
      console.log('');
    }

    console.log(`✅ [TRENDING] Đã lấy thành công ${uniqueKeywords.length} từ khóa hot từ Google VN.`);
    return uniqueKeywords;
  } catch (err) {
    console.warn(`⚠️  [TRENDING] Google Trends RSS thất bại: ${err.message}`);
    console.log('   → Tiếp tục pipeline chỉ với dữ liệu TMDB.');
    return [];
  }
}

// ============================================================================
// STEP 3: Merge & Match with Local CinePhine Database
// ============================================================================
async function mergeAndMatchLocalDB(tmdbMovies, googleKeywords) {
  console.log('🔗 [TRENDING] Bước 3: Đối chiếu với Database CinePhine...');

  if (tmdbMovies.length === 0) {
    console.warn('⚠️  [TRENDING] Không có phim TMDB nào để đối chiếu.');
    return [];
  }

  // Extract TMDB IDs for batch query
  const tmdbIds = tmdbMovies.map((m) => m.tmdb_id);

  // Find movies in our DB that match TMDB IDs
  const localMoviesByTmdb = await MovieModel.find({ 'tmdb.id': { $in: tmdbIds } })
    .select('_id name original_name slug poster_url thumb_url content tmdb viewCount')
    .lean();

  console.log(`   → Match bằng TMDB ID: ${localMoviesByTmdb.length} phim tìm thấy.`);

  // Build lookup: tmdb_id -> local movie
  const tmdbLookup = new Map();
  localMoviesByTmdb.forEach((m) => {
    if (m.tmdb?.id) tmdbLookup.set(m.tmdb.id, m);
  });

  // For TMDB movies not matched by ID, try fuzzy name match
  const unmatchedTmdb = tmdbMovies.filter((m) => !tmdbLookup.has(m.tmdb_id));
  let nameMatched = 0;

  if (unmatchedTmdb.length > 0) {
    // Fetch all movie names for fuzzy matching (limited scope)
    const allLocalNames = await MovieModel.find({})
      .select('_id name original_name slug poster_url thumb_url content tmdb viewCount')
      .lean();

    const nameIndex = new Map();
    allLocalNames.forEach((m) => {
      const cleanName = (m.name || '').toLowerCase().trim();
      const cleanOriginal = (m.original_name || '').toLowerCase().trim();
      if (cleanName) nameIndex.set(cleanName, m);
      if (cleanOriginal) nameIndex.set(cleanOriginal, m);
    });

    for (const tmdbMovie of unmatchedTmdb) {
      const titleLower = tmdbMovie.title.toLowerCase().trim();
      const originalLower = tmdbMovie.original_title.toLowerCase().trim();

      // Exact name match
      const match = nameIndex.get(titleLower) || nameIndex.get(originalLower);
      if (match && !tmdbLookup.has(tmdbMovie.tmdb_id)) {
        tmdbLookup.set(tmdbMovie.tmdb_id, match);
        nameMatched++;
      }
    }
    console.log(`   → Match bằng tên phim: thêm ${nameMatched} phim.`);
  }

  // ==========================================================================
  // NEW: Auto-Crawl missing trending movies (max 10 per run)
  // ==========================================================================
  const stillUnmatched = tmdbMovies.filter((m) => !tmdbLookup.has(m.tmdb_id));
  if (stillUnmatched.length > 0) {
    console.log(`🔍 [TRENDING] Phát hiện ${stillUnmatched.length} phim hot chưa có trong DB CinePhine.`);
    let crawledCount = 0;

    for (const tmdbMovie of stillUnmatched) {
      try {
        console.log(`   🔍 [${crawledCount + 1}] Đang tìm nguồn cho: "${tmdbMovie.title}"...`);
        const searchResults = await crawlerService.searchMovies(tmdbMovie.title);
        
        // Find best match with similarity >= 0.75
        const bestMatch = searchResults.find(r => r.similarity >= 0.75);
        
        if (bestMatch) {
          console.log(`     ✨ Tìm thấy nguồn: "${bestMatch.name}" (${bestMatch.slug}, similarity: ${bestMatch.similarity.toFixed(2)}). Đang crawl...`);
          const crawlResult = await crawlerService.crawlMovieBySlug(bestMatch.slug);
          
          if (crawlResult && crawlResult.success) {
            // Re-fetch the movie to get all database fields (like tmdb.id)
            const newMovie = await MovieModel.findOne({ slug: bestMatch.slug }).lean();
            if (newMovie) {
              tmdbLookup.set(tmdbMovie.tmdb_id, newMovie);
              console.log(`     ✅ Đã crawl thành công: ${newMovie.name}`);
              crawledCount++;
            }
          } else {
            console.warn(`     ⚠️  Crawl thất bại cho ${bestMatch.slug}: ${crawlResult?.message || 'Unknown error'}`);
          }
        } else {
          console.log(`     ⏭️  Không tìm thấy nguồn đủ tin cậy (>0.75) cho phim này.`);
        }
      } catch (crawlErr) {
        console.warn(`     ❌ Lỗi khi tự động crawl "${tmdbMovie.title}":`, crawlErr.message);
      }
    }
  }

  // Build matched array with Google Trends flag
  const googleKeywordsSet = new Set(googleKeywords);
  const matchedMovies = [];

  for (const tmdbMovie of tmdbMovies) {
    const localMovie = tmdbLookup.get(tmdbMovie.tmdb_id);
    if (!localMovie) continue;

    // Fuzzy match: check all name variants against all Google keywords
    // Logic: keyword contains title token OR title token contains keyword
    // e.g. "zootopia" matches "zootopia phần 2" or vice versa
    const nameTokens = [
      tmdbMovie.title.toLowerCase(),
      tmdbMovie.original_title.toLowerCase(),
      (localMovie.name || '').toLowerCase(),
      (localMovie.original_name || '').toLowerCase(),
    ].filter(Boolean);

    let isGoogleTrending = false;
    let matchedKeyword = null;
    outer: for (const token of nameTokens) {
      for (const keyword of googleKeywords) {
        // Bidirectional substring match (handles partial names)
        if (keyword.includes(token) || token.includes(keyword)) {
          // Extra guard: ignore very short tokens (< 4 chars) to avoid false positives
          if (token.length >= 4 || keyword.length >= 4) {
            isGoogleTrending = true;
            matchedKeyword = keyword;
            break outer;
          }
        }
      }
    }

    if (isGoogleTrending) {
      console.log(`   🔥 GOOGLE MATCH: "${localMovie.name || tmdbMovie.title}" ↔ keyword "${matchedKeyword}"`);
    }

    matchedMovies.push({
      tmdb_id: tmdbMovie.tmdb_id,
      title: localMovie.name || tmdbMovie.title,
      original_title: localMovie.original_name || tmdbMovie.original_title,
      movieId: localMovie._id,
      slug: localMovie.slug,
      poster_url: localMovie.poster_url || (tmdbMovie.poster_path ? `${TMDB_IMG}${tmdbMovie.poster_path}` : ''),
      thumb_url: localMovie.thumb_url || (tmdbMovie.backdrop_path ? `${TMDB_IMG}${tmdbMovie.backdrop_path}` : ''),
      overview: localMovie.content || tmdbMovie.overview || '',
      popularity: tmdbMovie.popularity,
      vote_average: tmdbMovie.vote_average,
      viewCount: localMovie.viewCount || 0,
      isGoogleTrending,
      matchedKeyword,
      source: isGoogleTrending ? 'both' : 'tmdb',
    });
  }

  // Remove unused Set since we iterate googleKeywords directly now
  const matchedByGoogle = matchedMovies.filter((m) => m.isGoogleTrending);
  console.log(`✅ [TRENDING] Đã tìm thấy ${matchedMovies.length} phim khớp trong CinePhine DB.`);
  console.log(`   → Trong đó ${matchedByGoogle.length} phim lọt Top Google Trends VN:`);
  matchedByGoogle.forEach((m) => console.log(`     - ${m.title} (keyword: "${m.matchedKeyword}")`));

  return matchedMovies;
}

// ============================================================================
// STEP 4: Generate AI Assessment via OpenRouter
// ============================================================================
async function generateAIAssessment(matchedMovies) {
  console.log('🤖 [TRENDING] Bước 4: LLM đang chấm điểm viral...');

  if (!OPENROUTER_API_KEY) {
    console.warn('⚠️  [TRENDING] OPENROUTER_API_KEY chưa cấu hình. Dùng fallback scoring.');
    return fallbackScoring(matchedMovies);
  }

  if (matchedMovies.length === 0) {
    console.warn('⚠️  [TRENDING] Không có phim nào để đánh giá.');
    return [];
  }

  // Prepare movie list for LLM — use viral_signal string instead of boolean
  const movieListForAI = matchedMovies.slice(0, 30).map((m, i) => ({
    index: i + 1,
    tmdb_id: m.tmdb_id,
    title: m.title,
    original_title: m.original_title,
    overview: (m.overview || '').substring(0, 150),
    popularity_score: Math.round(m.popularity),
    tmdb_rating: m.vote_average,
    cinephine_views: m.viewCount,
    viral_signal: m.isGoogleTrending
      ? `🔥 ĐANG LỌT TOP TÌM KIẾM GOOGLE VIỆT NAM (keyword: "${m.matchedKeyword}")`
      : 'Phổ biến trên TMDB',
  }));

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const systemPrompt = `Bạn là chuyên gia phân tích xu hướng giải trí và mạng xã hội Việt Nam (TikTok, Facebook, Threads, Google Trends). Ngày hôm nay là ${today}.

NHIỆM VỤ: Dựa vào danh sách phim bên dưới (đã có sẵn trên hệ thống CinePhine), hãy CHỌN ĐÚNG 10 phim đang VIRAL và thu hút giới trẻ Việt Nam nhất HIỆN NAY.

QUY TẮC CHẤM ĐIỂM:
- Phim được đánh dấu "is_google_trending_VN: true" = đang lọt top tìm kiếm Google VN → ưu tiên cao.
- Phim có popularity_score cao + rating tốt → ưu tiên.
- Phim đang được bàn tán nhiều trên MXH VN (nếu bạn biết) → ưu tiên.
- Ưu tiên phim mới chiếu rạp, phim đang hot trên Netflix/các OTT tại VN.

OUTPUT FORMAT (JSON ONLY, không markdown, không giải thích):
[
  {
    "tmdb_id": 12345,
    "trend_score": 9,
    "ai_quote": "Câu slogan GenZ giật tít bắt trend, tối đa 15 chữ"
  },
  ...
]

YÊU CẦU ai_quote:
- Viết bằng tiếng Việt, phong cách GenZ, giật tít MXH.
- Tối đa 15 chữ, phải gây tò mò và muốn click ngay.
- Có thể dùng emoji nhưng tối đa 1-2 emoji.
- Ví dụ: "Xem xong khóc nức nở, ai cũng phải share 😭", "Phim này đỉnh nóc kịch trần bay phấp phới 🔥"`;

  const userPrompt = `Danh sách ${movieListForAI.length} phim có sẵn trên CinePhine:\n\n${JSON.stringify(movieListForAI, null, 2)}`;

  try {
    const { data } = await axios.post(
      OPENROUTER_URL,
      {
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cinephine.io.vn',
          'X-Title': 'CinePhine Trending Pipeline',
        },
        timeout: 30000,
      },
    );

    const content = data?.choices?.[0]?.message?.content || '';
    console.log('   📝 LLM Response received. Parsing...');

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON array from markdown code block
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Không thể parse JSON từ LLM response');
      }
    }

    // Handle both array and object with array property
    const aiResults = Array.isArray(parsed) ? parsed : parsed.movies || parsed.results || parsed.trending || [];

    if (!Array.isArray(aiResults) || aiResults.length === 0) {
      throw new Error('LLM trả về kết quả rỗng');
    }

    console.log(`✅ [TRENDING] LLM đã chọn ${aiResults.length} phim trending!`);
    aiResults.forEach((r, i) => {
      console.log(`   ${i + 1}. [Score: ${r.trend_score}] "${r.ai_quote}"`);
    });

    return aiResults.slice(0, 10);
  } catch (err) {
    console.error(`❌ [TRENDING] LLM Assessment thất bại: ${err.message}`);
    console.log('   → Dùng fallback scoring dựa trên popularity + Google Trends.');
    return fallbackScoring(matchedMovies);
  }
}

/**
 * Fallback scoring when LLM is unavailable
 * Uses TMDB popularity + Google Trends boost + view count
 */
function fallbackScoring(matchedMovies) {
  console.log('🔄 [TRENDING] Đang dùng Fallback Scoring...');

  const scored = matchedMovies.map((m) => {
    let score = Math.min(10, Math.max(1, Math.round(m.popularity / 100)));
    if (m.isGoogleTrending) score = Math.min(10, score + 3);
    if (m.vote_average >= 7) score = Math.min(10, score + 1);

    return {
      tmdb_id: m.tmdb_id,
      trend_score: score,
      ai_quote: m.isGoogleTrending
        ? `🔥 Top tìm kiếm Google VN — ${m.title}`
        : `Đang hot trên TMDB — ${m.title}`,
    };
  });

  // Sort by score desc, take top 10
  scored.sort((a, b) => b.trend_score - a.trend_score);
  return scored.slice(0, 10);
}

// ============================================================================
// STEP 5: Save to Database
// ============================================================================
async function saveTrendingToDB(aiResults, matchedMovies) {
  console.log('💾 [TRENDING] Bước 5: Đang lưu Top 10 vào Database...');

  // Build lookup from matched movies
  const matchLookup = new Map();
  matchedMovies.forEach((m) => matchLookup.set(m.tmdb_id, m));

  const docsToInsert = [];
  for (const ai of aiResults) {
    const matched = matchLookup.get(ai.tmdb_id);
    if (!matched) {
      console.warn(`   ⚠️  tmdb_id ${ai.tmdb_id} từ LLM không khớp movie nào. Bỏ qua.`);
      continue;
    }

    docsToInsert.push({
      tmdb_id: ai.tmdb_id,
      title: matched.title,
      original_title: matched.original_title,
      movieId: matched.movieId,
      slug: matched.slug,
      poster_url: matched.poster_url,
      thumb_url: matched.thumb_url,
      ai_quote: ai.ai_quote || '',
      trend_score: Math.min(10, Math.max(1, ai.trend_score || 5)),
      source: matched.source || 'tmdb',
    });
  }

  if (docsToInsert.length === 0) {
    console.warn('⚠️  [TRENDING] Không có phim nào để lưu!');
    return;
  }

  // Atomic: delete old + insert new
  await TrendingMovieModel.deleteMany({});
  await TrendingMovieModel.insertMany(docsToInsert);

  console.log(`✅ [TRENDING] Đã lưu ${docsToInsert.length} phim trending vào DB!`);
  docsToInsert.forEach((d, i) => {
    console.log(`   ${i + 1}. [${d.trend_score}⭐] ${d.title} — "${d.ai_quote}"`);
  });
}

// ============================================================================
// ORCHESTRATOR: Run Full Pipeline
// ============================================================================
async function runPipeline() {
  const startTime = Date.now();

  // Ensure DB Connection (for standalone execution)
  if (mongoose.connection.readyState === 0) {
    console.log('🔌 [TRENDING] Đang kết nối Database...');
    await connectDB();
  }

  console.log('\n' + '='.repeat(70));
  console.log('🚀 [TRENDING PIPELINE] Khởi chạy Pipeline AI Trending Phim...');
  console.log('   Thời gian: ' + new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
  console.log('='.repeat(70));

  try {
    // Step 1: Fetch TMDB
    const tmdbMovies = await fetchTMDBVietnam();

    // Step 2: Fetch Google Trends (non-blocking if fails)
    const googleKeywords = await fetchGoogleTrendsVN();

    // Step 3: Merge & Match local DB
    const matchedMovies = await mergeAndMatchLocalDB(tmdbMovies, googleKeywords);

    if (matchedMovies.length === 0) {
      console.log('❌ [TRENDING] Không tìm thấy phim nào từ TMDB khớp với DB CinePhine. Pipeline dừng.');
      return;
    }

    // Step 4: AI Assessment
    const aiResults = await generateAIAssessment(matchedMovies);

    // Step 5: Save to DB
    await saveTrendingToDB(aiResults, matchedMovies);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('='.repeat(70));
    console.log(`🎉 [TRENDING PIPELINE] Hoàn tất! Tổng thời gian: ${elapsed}s`);
    console.log('='.repeat(70) + '\n');
  } catch (err) {
    console.error('❌ [TRENDING PIPELINE] Pipeline thất bại:', err.message);
    console.error(err.stack);
  }
}

// ============================================================================
// API: Get Trending Movies (for Frontend)
// ============================================================================
async function getTrendingSocial() {
  const movies = await TrendingMovieModel.find({}).sort({ trend_score: -1 }).limit(10).lean();
  return movies;
}

module.exports = {
  runPipeline,
  getTrendingSocial,
  fetchTMDBVietnam,
  fetchGoogleTrendsVN,
  mergeAndMatchLocalDB,
  generateAIAssessment,
  saveTrendingToDB,
};
