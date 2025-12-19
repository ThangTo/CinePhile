const Movie = require('../models/movie.model');
const UserHistory = require('../models/user_history.model');
const UserFavorite = require('../models/user_favorite.model');
const Chat = require('../models/chat.model');
const mongoose = require('mongoose');


const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash';

const SYSTEM_PROMPT =
  process.env.CHATBOT_SYSTEM_PROMPT ||
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
- KHÔNG sử dụng bất kỳ định dạng Markdown nào (không dùng **, *, __, ##, tiêu đề, danh sách markdown...).
- KHÔNG bao quanh tên phim hoặc bất kỳ phần nào của câu trả lời bằng cặp ký tự **.
- Khi liệt kê phim, dùng dạng thuần văn bản:
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
    return { intent: detectIntentByKeyword(message), queryType: 'other', genre: null, actor: null, keyword: null };
  }


  const classifierPrompt = `Bạn là bộ phân loại truy vấn cho trợ lý phim CinePhile.
    Người dùng sẽ gửi câu hỏi bằng tiếng Việt hoặc tiếng Anh. Nhiệm vụ của bạn:
    - Phân loại xem câu hỏi có liên quan tới phim trong hệ thống hay không (intent).
    - Nếu liên quan tới phim (intent = "movie_info") thì phân loại chi tiết kiểu truy vấn:
    + "top"    : hỏi top phim / phim hay nhất / trending / nổi tiếng
    + "new"    : hỏi phim mới / phim mới cập nhật / phim mới ra mắt / phim vừa thêm
    + "genre"  : hỏi theo thể loại (ví dụ: phim kinh dị, phim hành động Mỹ, ...)
    + "actor"  : hỏi theo diễn viên / cast (ví dụ: phim có Tom Cruise, phim của Dwayne Johnson, ...)
    + "search" : tìm kiếm phim theo tên / từ khóa cụ thể
    + "other"  : vẫn là movie_info nhưng không rơi vào các loại trên

    Bạn CHỈ được trả về JSON hợp lệ, không có giải thích thêm, KHÔNG dùng markdown.

    Schema JSON:
    {
    "intent": "movie_info" | "general",
    "queryType": "top" | "new" | "genre" | "actor" | "search" | "other",
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

    Input: "Cho mình xem phim mới cập nhật gần đây"
    Output:
    {
    "intent": "movie_info",
    "queryType": "new",
    "genre": null,
    "actor": null,
    "keyword": null
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
    try {
      // Convert string ID to ObjectId nếu cần
      const movieId = mongoose.Types.ObjectId.isValid(metadata.movieId) 
        ? metadata.movieId 
        : null;
      
      if (movieId) {
        const movie = await Movie.findById(movieId).lean();
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
    } catch (e) {
      console.error('Error fetching current movie:', e);
      // Tiếp tục xử lý ngay cả khi không lấy được phim hiện tại
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



  // 2.1. Phim mới cập nhật / phim mới ra mắt
  const newWords = ['phim mới', 'mới cập nhật', 'mới ra mắt', 'vừa thêm', 'mới nhất', 'cập nhật gần đây'];
  if (queryType === 'new' || newWords.some((word) => msg.includes(word))) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Tìm phim mới: ưu tiên isNewRelease=true, sau đó là phim update trong 30 ngày
    // Sử dụng aggregation để sort đúng cách (boolean sort trong MongoDB không hoạt động tốt)
    let newMovies = await Movie.find({
      $or: [
        { isNewRelease: true },
        { updatedAt: { $gte: thirtyDaysAgo } },
        { createdAt: { $gte: thirtyDaysAgo } }, // Cũng xét phim mới tạo
      ],
    })
      .sort({ updatedAt: -1, createdAt: -1 }) // Sort theo thời gian mới nhất
      .limit(20) // Lấy nhiều hơn để filter sau
      .lean();

    // Nếu không có phim trong 30 ngày, fallback: lấy phim mới nhất (60 ngày)
    if (newMovies.length === 0) {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      newMovies = await Movie.find({
        $or: [
          { isNewRelease: true },
          { updatedAt: { $gte: sixtyDaysAgo } },
          { createdAt: { $gte: sixtyDaysAgo } },
        ],
      })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(15)
        .lean();
    }

    // Ưu tiên phim có isNewRelease=true, sau đó sort lại theo updatedAt
    newMovies.sort((a, b) => {
      // Ưu tiên isNewRelease=true
      if (a.isNewRelease && !b.isNewRelease) return -1;
      if (!a.isNewRelease && b.isNewRelease) return 1;
      // Nếu cùng isNewRelease, sort theo updatedAt mới nhất
      const aTime = a.updatedAt || a.createdAt || 0;
      const bTime = b.updatedAt || b.createdAt || 0;
      return bTime - aTime;
    });

    // Giới hạn lại 15 phim
    newMovies = newMovies.slice(0, 15);

    context.newMovies = newMovies.map((m) => ({
      id: m._id.toString(),
      title: m.name,
      year: m.year,
      genres: m.categories,
      country: m.country,
      rating: m.rating,
      viewCount: m.viewCount,
      isNewRelease: m.isNewRelease,
      updatedAt: m.updatedAt,
      createdAt: m.createdAt,
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

      // Field "actor" là mảng string, dùng $elemMatch hoặc regex trực tiếp
      // Mongoose tự động match regex với các phần tử trong mảng
      const actorMovies = await Movie.find({
        actor: { $regex: actorRegex },
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

async function callGemini({ userQuery, dbContext, history = [] }) {
  const contents = [
    { role: 'model', parts: [{ text: SYSTEM_PROMPT }] },
  ];

  // Thêm lịch sử hội thoại nếu có (tối đa 10 tin nhắn gần nhất)
  if (history && history.length > 0) {
    history.slice(-10).forEach((msg) => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    });
  }

  // Thêm câu hỏi hiện tại với DB context
  contents.push({
    role: 'user',
    parts: [
      {
        text:
          `[USER_QUERY]\n${userQuery}\n\n` +
          `[DB_CONTEXT]\n${JSON.stringify(dbContext, null, 2)}`,
      },
    ],
  });

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

  const rawText =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    'Xin lỗi, mình chưa có câu trả lời phù hợp từ dữ liệu hiện tại.';

  // Loại bỏ toàn bộ ký tự ** để tránh định dạng đậm không mong muốn
  const answerText = rawText.replace(/\*\*/g, '');

  return answerText;
}

async function handleChat({ userId, message, history, metadata, sessionId }) {
  // 1. Tìm hoặc tạo chat session trong database
  let chatSession = null;
  try {
    chatSession = await Chat.findOrCreateSession({ userId, sessionId });
    
    // Nếu có lịch sử từ database, ưu tiên dùng lịch sử đó thay vì từ request
    // Lấy 10 tin nhắn gần nhất để làm context
    if (chatSession && chatSession.messages.length > 0) {
      history = chatSession.messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
    } else if (!history || history.length === 0) {
      // Nếu không có history từ DB và không có từ request, khởi tạo mảng rỗng
      history = [];
    }
    // Nếu có history từ request và không có trong DB, giữ nguyên history từ request
  } catch (e) {
    console.error('Error loading chat session:', e);
    // Tiếp tục xử lý ngay cả khi không load được session
    // Nếu không có history từ request, khởi tạo mảng rỗng
    if (!history || history.length === 0) {
      history = [];
    }
  }

  // 2. Lưu tin nhắn của user vào database
  try {
    if (chatSession) {
      await chatSession.addMessage('user', message);
      // Cập nhật metadata nếu có
      if (metadata) {
        const updatedMetadata = { ...chatSession.metadata, ...metadata };
        // Convert movieId string to ObjectId nếu hợp lệ
        if (updatedMetadata.movieId && typeof updatedMetadata.movieId === 'string') {
          if (mongoose.Types.ObjectId.isValid(updatedMetadata.movieId)) {
            updatedMetadata.movieId = new mongoose.Types.ObjectId(updatedMetadata.movieId);
          } else {
            // Nếu không hợp lệ, xóa movieId
            delete updatedMetadata.movieId;
          }
        }
        chatSession.metadata = updatedMetadata;
        await chatSession.save();
      }
    }
  } catch (e) {
    console.error('Error saving user message:', e);
  }

  // 3. Gemini phân loại intent + kiểu truy vấn chi tiết
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

  // 4. Xây dựng DB context dựa trên intent
  let dbContext = {};
  if (intent === 'movie_info') {
    dbContext = await buildDbContextForMovieIntent({ userId, message, metadata, classifier });
    // console.log('dbContext: ', dbContext);
  } else {
    // Intent general → có thể không cần DB hoặc chỉ lấy một chút thông tin user
    dbContext = { note: 'general question, no movie-specific DB context' };
  }

  // 5. Gọi Gemini để sinh câu trả lời
  const answer = await callGemini({ userQuery: message, dbContext, history });
  
  // 6. Lưu câu trả lời của assistant vào database
  try {
    if (chatSession) {
      await chatSession.addMessage('assistant', answer);
    }
  } catch (e) {
    console.error('Error saving assistant message:', e);
  }

  return answer;
}

module.exports = { handleChat };