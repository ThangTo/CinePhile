// backend/services/chat.service.js
const Movie = require('../models/movie.model');
const UserHistory = require('../models/user_history.model');
const UserFavorite = require('../models/user_favorite.model');


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Model ID: gemini-2.5-flash
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash';


const SYSTEM_PROMPT =
  `Bạn là trợ lý AI thân thiện của nền tảng xem phim CinePhile.

MỤC TIÊU:
- Trả lời câu hỏi về phim, thể loại, quốc gia, đánh giá, bình luận, tài khoản và cách sử dụng website CinePhile.
- Luôn trả lời bằng tiếng Việt, văn phong tự nhiên, dễ hiểu, ngắn gọn.
- Ưu tiên sử dụng dữ liệu thật được backend cung cấp trong phần [DB_CONTEXT]. Không bịa thêm phim hoặc thông tin không có trong dữ liệu này.

CÁCH SỬ DỤNG NGỮ CẢNH:
- Backend sẽ gửi cho bạn hai phần:
  [USER_QUERY]  = câu hỏi gốc của người dùng.
  [DB_CONTEXT]  = dữ liệu đã truy vấn từ database/API CinePhile (JSON hoặc text có cấu trúc).
- Bạn KHÔNG tự gọi HTTP hay truy cập database, chỉ suy luận từ USER_QUERY và DB_CONTEXT.

HƯỚNG DẪN TRẢ LỜI:
- Nếu DB_CONTEXT có dữ liệu phim liên quan:
  * Trích xuất các thông tin quan trọng: tên phim, năm, thể loại, quốc gia, rating, mô tả ngắn...
  * Gợi ý hoặc giải thích dựa trên đúng dữ liệu đó.
  * Nếu danh sách quá dài, chỉ chọn 3–5 mục tiêu biểu.
- Nếu DB_CONTEXT trống hoặc không phù hợp:
  * Nói rõ là hiện tại không tìm thấy dữ liệu phù hợp trong hệ thống CinePhile.
  * Có thể đưa ra gợi ý chung (ví dụ: cách tìm kiếm khác), nhưng không bịa dữ liệu chi tiết.
- Với câu hỏi thuần về cách sử dụng website (đăng nhập, xem phim, thêm yêu thích...),
  bạn có thể trả lời dựa trên hiểu biết chung về một website xem phim chuẩn.

ĐỊNH DẠNG TRẢ LỜI:
- Không lặp lại nguyên văn USER_QUERY hay DB_CONTEXT.
- Không hiển thị JSON hoặc cấu trúc kỹ thuật nội bộ trừ khi người dùng yêu cầu rõ ràng.
- Khi liệt kê phim, dùng dạng:
  1. Tên phim – Năm – Thể loại chính.
- Nếu không chắc chắn, hãy nói rõ "Mình không có đủ dữ liệu trong hệ thống CinePhile để trả lời chính xác."`;

// Phân loại intent cơ bản bằng keyword (fallback nếu Gemini lỗi)
function detectIntentByKeyword(message = '') {
  const msg = message.toLowerCase();
  if (
    msg.includes('phim') ||
    msg.includes('xem') ||
    msg.includes('thể loại') ||
    msg.includes('hành động') ||
    msg.includes('kinh dị') ||
    msg.includes('gợi ý') ||
    msg.includes('recommend') ||
    msg.includes('film') ||
    msg.includes('tv') ||
    msg.includes('series') ||
    msg.includes('mùa') ||
    msg.includes('tập') ||
    msg.includes('trailer') ||
    msg.includes('đánh giá') ||
    msg.includes('bình luận') ||
    msg.includes('quốc gia') ||
    msg.includes('năm') ||
    msg.includes('phát hành')
  ) {
    return 'movie_info';
  }

  // có thể thêm: 'account_help', 'general_help', ...
  return 'general';
}

// Phân loại intent bằng Gemini: movie_info | general + chi tiết kiểu truy vấn
async function classifyIntentWithGemini(message) {
  if (!GEMINI_API_KEY) {
    // Nếu chưa cấu hình key, fallback sang keyword
    // console.log("debug API key not found");
    return { intent: detectIntentByKeyword(message), queryType: 'other', genre: null, actor: null, keyword: null };
  }


  const classifierPrompt = `Bạn là bộ phân loại truy vấn cho trợ lý phim CinePhile.
    Người dùng sẽ gửi câu hỏi bằng tiếng Việt hoặc tiếng Anh. Nhiệm vụ của bạn:
    - Phân loại xem câu hỏi có liên quan tới phim trong hệ thống hay không (intent).
    - Nếu liên quan tới phim (intent = "movie_info") thì phân loại chi tiết kiểu truy vấn:
    + "top"    : hỏi top phim / phim hay nhất / trending / nổi tiếng
    + "genre"  : hỏi theo thể loại (ví dụ: phim kinh dị, phim hành động Mỹ, ...)
    + "actor"  : hỏi theo diễn viên / cast (ví dụ: phim có Tom Cruise, phim của Dwayne Johnson, ...)
    + "search" : tìm kiếm phim theo tên / từ khóa cụ thể
    + "other"  : vẫn là movie_info nhưng không rơi vào 3 loại trên

    Bạn CHỈ được trả về JSON hợp lệ, không có giải thích thêm, KHÔNG dùng markdown.

    Schema JSON:
    {
    "intent": "movie_info" | "general",
    "queryType": "top" | "genre" | "actor" | "search" | "other",
    "genre": string | null,
    "actor": string | null,
    "keyword": string | null
    }

    Quy tắc:
    - intent = "movie_info" nếu câu hỏi liên quan tới phim/series/tập phim/thể loại/quốc gia/diễn viên/trailer/đánh giá/bình luận... trên một website xem phim.
    - intent = "general" nếu câu hỏi không liên quan tới phim hoặc CinePhile.
    - queryType:
    * "top"   nếu câu hỏi nhấn mạnh top, hay nhất, nổi bật, trending...
    * "genre" nếu câu hỏi nhấn mạnh thể loại (hành động, kinh dị, lãng mạn, ...).
    * "actor" nếu câu hỏi nhấn mạnh diễn viên / cast.
    * "search" nếu người dùng đưa tên/từ khóa phim cụ thể để tìm.
    * "other" nếu không rõ ràng.
    - genre: chuỗi tên thể loại chính (nếu có, ví dụ: "hành động", "kinh dị"), ngược lại null.
    - actor: tên diễn viên nếu có, ngược lại null.
    - keyword: từ khóa/tên phim chính để tìm kiếm nếu có, ngược lại null.

    Ví dụ:
    Input: "Cho mình top phim kinh dị Mỹ hay nhất"
    Output:
    {
    "intent": "movie_info",
    "queryType": "top",
    "genre": "kinh dị",
    "actor": null,
    "keyword": null
    }

    Input: "Có phim nào của diễn viên Tom Cruise không?"
    Output:
    {
    "intent": "movie_info",
    "queryType": "actor",
    "genre": null,
    "actor": "Tom Cruise",
    "keyword": null
    }

    Input: "Tìm phim Avengers phần mới nhất"
    Output:
    {
    "intent": "movie_info",
    "queryType": "search",
    "genre": null,
    "actor": null,
    "keyword": "Avengers"
    }

    Input: "Thời tiết hôm nay như thế nào?"
    Output:
    {
    "intent": "general",
    "queryType": "other",
    "genre": null,
    "actor": null,
    "keyword": null
    }

    Câu hỏi của người dùng:
    ${message}`;


  const contents = [
    {
      role: 'user',
      parts: [{ text: classifierPrompt }],
    },
  ];

  const res = await fetch(`${GEMINI_URL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });
//   console.log('classifier fetch status =', res.status);


  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Gemini intent classifier error');
  }

//   console.log('classifier data =', data);

  const rawText =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    '{"intent":"general","queryType":"other","genre":null,"actor":null,"keyword":null}';

  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || (parsed.intent !== 'movie_info' && parsed.intent !== 'general')) {
      throw new Error('invalid intent');
    }

    return {
      intent: parsed.intent,
      queryType: parsed.queryType || 'other',
      genre: typeof parsed.genre === 'string' ? parsed.genre : null,
      actor: typeof parsed.actor === 'string' ? parsed.actor : null,
      keyword: typeof parsed.keyword === 'string' ? parsed.keyword : null,
    };
  } catch (e) {
    // ignore parse error, fallback phía dưới
  }

//   console.log("debug...");
  return {
    intent: detectIntentByKeyword(message),
    queryType: 'other',
    genre: null,
    actor: null,
    keyword: null,
  };
}




// classifier: kết quả phân loại chi tiết từ Gemini (intent, queryType, genre, actor, keyword)
async function buildDbContextForMovieIntent({ userId, message, metadata, classifier }) {
  const context = {};
  const msg = message.toLowerCase();
  const queryType = classifier?.queryType || 'other';
  const genreFromAi = classifier?.genre || null;
  const actorFromAi = classifier?.actor || null;
  const keywordFromAi = classifier?.keyword || null;

  // 1. Nếu có movieId trong metadata → lấy chi tiết phim hiện tại
  if (metadata?.movieId) {
    const movie = await Movie.findById(metadata.movieId).lean();
    if (movie) {
      context.currentMovie = {
        id: movie._id.toString(),
        title: movie.name,
        original_name: movie.original_name,
        slug: movie.slug,
        year: movie.year,
        genres: movie.categories,
        country: movie.country,
        description: movie.content,
        rating: movie.rating,
        totalRatings: movie.totalRatings,
        viewCount: movie.viewCount,
        type: movie.type,
      };
    }
  }



  // 2. Gợi ý TOP phim toàn site
  // - Nếu Gemini phân loại queryType = "top" thì luôn lấy topMovies
  // - Nếu không, fallback heuristic từ keyword
  const topWords = ['top', 'hay nhất', 'phim hot', 'phổ biến', 'phim trending', 'nổi tiếng'];
  if (queryType === 'top' || topWords.some((word) => msg.includes(word))) {
    const topMovies = await Movie.find()
      .sort({ rating: -1, totalRatings: -1, viewCount: -1 })
      .limit(10)
      .lean();

    context.topMovies = topMovies.map((m) => ({
      id: m._id.toString(),
      title: m.name,
      year: m.year,
      genres: m.categories,
      country: m.country,
      rating: m.rating,
      totalRatings: m.totalRatings,
      viewCount: m.viewCount,
    }));
  }



  // 3. Tìm theo thể loại: "thể loại X", "genre X"
  const genreWords = ['thể loại', 'genre', 'phim'];
  const shouldTryGenre = queryType === 'genre' || genreWords.some((word) => msg.includes(word));
  if (shouldTryGenre) {
    let genreKeyword = genreFromAi;

    // Nếu Gemini chưa extract được genre, fallback regex
    if (!genreKeyword) {
      const genreMatch =
        message.match(/thể loại\s+([^\.,!?\n]+)/i) || message.match(/genre\s+([^\.,!?\n]+)/i);
      if (genreMatch) {
        genreKeyword = genreMatch[1].trim();
      }
    }

    if (genreKeyword) {
      const genreRegex = new RegExp(genreKeyword, 'i');

      const genreMovies = await Movie.find({
        $or: [
          { 'categories.name': genreRegex },
          { 'categories.slug': genreRegex },
        ],
      })
        .sort({ viewCount: -1 })
        .limit(10)
        .lean();

      context.genreKeyword = genreKeyword;
      context.genreTopMovies = genreMovies.map((m) => ({
        id: m._id.toString(),
        title: m.name,
        year: m.year,
        genres: m.categories,
        country: m.country,
        rating: m.rating,
        viewCount: m.viewCount,
      }));
    }
  }




  // 4. Tìm theo diễn viên: "diễn viên X", "actor X", "cast X"
  const shouldTryActor = queryType === 'actor';
  if (shouldTryActor) {
    let actorKeyword = actorFromAi;

    if (!actorKeyword) {
      const actorMatch =
        message.match(/diễn viên\s+([^\.,!?\n]+)/i) ||
        message.match(/actor\s+([^\.,!?\n]+)/i) ||
        message.match(/cast\s+([^\.,!?\n]+)/i);
      if (actorMatch) {
        actorKeyword = actorMatch[1].trim();
      }
    }

    if (actorKeyword) {
      const actorRegex = new RegExp(actorKeyword, 'i');

      // Field "actor" là mảng string, dùng match trực tiếp với regex
      const actorMovies = await Movie.find({
        actor: actorRegex,
      })
        .sort({ viewCount: -1 })
        .limit(10)
        .lean();

      context.actorKeyword = actorKeyword;
      context.actorMovies = actorMovies.map((m) => ({
        id: m._id.toString(),
        title: m.name,
        year: m.year,
        actors: m.actor,
        genres: m.categories,
        country: m.country,
        viewCount: m.viewCount,
      }));
    }
  }




  // 5. Tìm phim theo tên/từ khóa chung (search theo tên / keyword)
  const shouldTrySearch = queryType === 'search' || queryType === 'other';
  if (shouldTrySearch) {
    let keyword = keywordFromAi;

    if (!keyword) {
      const keywordMatch = message.match(/phim\s+(.+)/i);
      if (keywordMatch) {
        keyword = keywordMatch[1].trim();
      }
    }

    if (keyword) {
      const regex = new RegExp(keyword, 'i');

      const movies = await Movie.find({
        $or: [{ name: regex }, { original_name: regex }, { slug: regex }],
      })
        .sort({ viewCount: -1 })
        .limit(10)
        .lean();

      context.searchKeyword = keyword;
      context.matchedMovies = movies.map((m) => ({
        id: m._id.toString(),
        title: m.name,
        original_name: m.original_name,
        year: m.year,
        genres: m.categories,
        country: m.country,
        rating: m.rating,
        viewCount: m.viewCount,
      }));
    }
  }




  // 6. Nếu có userId → lấy lịch sử/xem gần đây/yêu thích
  if (userId) {
    const history = await UserHistory.find({ userId }).sort({ createdAt: -1 }).limit(10).lean();
    context.recentHistory = history.map((h) => ({
      movieId: h.movieId.toString(),
      lastViewedAt: h.createdAt,
    }));

    const favorites = await UserFavorite.find({ userId }).limit(20).lean();
    context.favorites = favorites.map((f) => f.movieId.toString());
  }

  return context;
}

async function callGemini({ userQuery, dbContext }) {
  const contents = [
    { role: 'model', parts: [{ text: SYSTEM_PROMPT }] },
    {
      role: 'user',
      parts: [
        {
          text:
            `[USER_QUERY]\n${userQuery}\n\n` +
            `[DB_CONTEXT]\n${JSON.stringify(dbContext, null, 2)}`,
        },
      ],
    },
  ];

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trong biến môi trường');
  }

  const res = await fetch(`${GEMINI_URL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Gemini API error');
  }

  const answerText =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    'Xin lỗi, mình chưa có câu trả lời phù hợp từ dữ liệu hiện tại.';

  return answerText;
}

async function handleChat({ userId, message, history, metadata }) {
  // Gemini phân loại intent + kiểu truy vấn chi tiết
  let intent = 'general';
  let classifier = null;
  try {
    // console.log('calling classifyIntentWithGemini...')
    const cls = await classifyIntentWithGemini(message);
    // console.log('classifyIntentWithGemini result =', cls);
    intent = cls.intent || 'general';
    classifier = cls;
  } catch (e) {
    // Nếu Gemini lỗi, fallback sang keyword
    // console.error('classifyIntentWithGemini error =', e);
    intent = detectIntentByKeyword(message);
    classifier = {
      intent,
      queryType: 'other',
      genre: null,
      actor: null,
      keyword: null,
    };
  }

  let dbContext = {};
  if (intent === 'movie_info') {
    dbContext = await buildDbContextForMovieIntent({ userId, message, metadata, classifier });
    // console.log('dbContext: ', dbContext);
  } else {
    // Intent general → có thể không cần DB hoặc chỉ lấy một chút thông tin user
    dbContext = { note: 'general question, no movie-specific DB context' };
  }

  const answer = await callGemini({ userQuery: message, dbContext });
  return answer;
}

module.exports = { handleChat };