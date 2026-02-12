const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisService = require('./services/redis.service');

const app = express();

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/user.model');
const cookieParser = require('cookie-parser');
const authService = require('./services/auth.service');
const { getGoogleCallbackUrl } = require('./utils/authUtils');
const { optionalAuth } = require('./middleware/auth.middleware');

// Thêm dòng này nếu chưa có
const { exec } = require('child_process'); 

// --- ĐOẠN CODE TEST KẾT NỐI ---
console.log("🚀 ĐANG TEST CURL ĐẾN SERVER PHIM...");

// Lệnh Curl giả lập trình duyệt (Có User-Agent và Referer xịn)
const cmd = `curl -I -v -L \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Referer: https://kkphim.vip" \ 
  "https://s6.kkphimplayer6.com/20251204/wM0RTCwd/index.m3u8"`;

exec(cmd, (error, stdout, stderr) => {
    console.log("----------------------------------------");
    console.log("📡 KẾT QUẢ CURL:");
    
    if (error) {
        console.error(`❌ Lỗi thực thi lệnh: ${error.message}`);
        return;
    }
    
    // In ra output (Header trả về)
    console.log(stdout || stderr); 
    console.log("----------------------------------------");
});
// ------------------------------


// Compression middleware - Nén responses để giảm bandwidth
// Skip compression for SSE (Server-Sent Events) endpoints
app.use(
  compression({
    filter: (req, res) => {
      // Don't compress SSE responses
      if (req.headers.accept === 'text/event-stream') {
        return false;
      }
      if (req.path.includes('/thumbnails/process')) {
        return false;
      }
      if (req.path.includes('/update-episodes')) {
        return false;
      }
      if (req.path.includes('/update-quality')) {
        return false;
      }
      if (req.path.includes('/crawl/by-page')) {
        return false;
      }
      // Use default filter for other requests
      return compression.filter(req, res);
    },
  }),
);

// Trust proxy - for rate limiting by IP
app.set('trust proxy', true);

// CORS middleware
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.CLIENT_URL_LOCAL || 'http://localhost:5001',
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Body parser middleware - Tối ưu limit
app.use(express.json({ limit: '10mb' })); // Giảm từ 50mb xuống 10mb
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Cookie parser
app.use(cookieParser());

// Optional auth middleware - Parse user if available (for rate limiting by userId)
app.use(optionalAuth);

// Rate limiting - Bảo vệ khỏi DDoS và abuse
// Use Redis store if available, otherwise use memory store
// Rate limit by userId if logged in, otherwise by IP
const createRateLimiter = (windowMs, max, message) => {
  const store =
    redisService.isConnected && redisService.client
      ? new RedisStore({
          sendCommand: (...args) => redisService.client.sendCommand(args),
        })
      : undefined; // Use default memory store

  return rateLimit({
    store,
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    // Key generator: Use userId if logged in, otherwise use IP
    keyGenerator: (req) => {
      // If user is logged in, use userId for rate limiting
      if (req.user && req.user._id) {
        return `user:${req.user._id}`;
      }

      // Get IP from X-Forwarded-For if available
      const forwardedFor = req.headers['x-forwarded-for'];
      if (forwardedFor) {
        const ip = forwardedFor.split(',')[0].trim();
        return ip;
      }

      // Otherwise, use IP address
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
    skip: (req) => {
      // Skip rate limiting for health check endpoint
      return req.path === '/' || req.path === '/health';
    },
  });
};

// General API rate limiter - 600 requests per 15 minutes
// Rate limit by userId if logged in, otherwise by IP
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.RATE_LIMIT_MAX || 600, // 600 requests
  'Too many requests, please try again later.',
);

// Strict rate limiter for auth endpoints - 10 requests per 15 minutes
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  process.env.RATE_LIMIT_MAX_AUTH || 10, // 10 requests (login attempts)
  'Too many login attempts, please try again later.',
);

// Apply rate limiting - SAU cookie parser và optionalAuth
app.use('/api/v1/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// Logging middleware - Chỉ log trong development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production: chỉ log errors
  app.use(
    morgan('combined', {
      skip: (req, res) => res.statusCode < 400,
    }),
  );
}

// Passport initialization
app.use(passport.initialize());

// Serve static avatar files
app.use('/api/v1/avatars', express.static(path.join(__dirname, 'data/avatars')));

passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
const apiBaseUrl =
  process.env.GOOGLE_CALLBACK_BASE_URL ||
  process.env.API_BASE_URL ||
  `http://localhost:${process.env.PORT || 5000}`;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getGoogleCallbackUrl(apiBaseUrl),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const authResult = await authService.loginWithGoogleProfile(profile);
          return done(null, authResult);
        } catch (error) {
          return done(error, null);
        }
      },
    ),
  );
}
// require('./config/passport')(passport);

// Cache middleware
const { cacheMiddleware } = require('./middleware/cache.middleware');

// Routes
const movieRoutes = require('./routes/movie.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const crawlerRoutes = require('./routes/crawler.routes');
const commentRoutes = require('./routes/comment.routes');
const chatRoutes = require('./routes/chat.routes');
const notificationRoutes = require('./routes/notification.routes');
const castRoutes = require('./routes/cast.routes');

const paymentRoutes = require('./routes/payment.routes');

// API endpoints with caching for popular routes
// Cache popular movie endpoints (high traffic, infrequent updates)
app.use('/api/v1/movies/trending', cacheMiddleware(600)); // 10 minutes
app.use('/api/v1/movies/top-rated', cacheMiddleware(600)); // 10 minutes
app.use('/api/v1/movies/new-releases', cacheMiddleware(300)); // 5 minutes
app.use('/api/v1/movies/meta/top-genres', cacheMiddleware(1800)); // 30 minutes
app.use('/api/v1/movies/meta/theme', cacheMiddleware(1800)); // 30 minutes

app.use('/api/v1/movies', movieRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/crawl', crawlerRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/cast', castRoutes);
// PayOS Routes (Payment)
app.use('/api/v1', paymentRoutes);

// Debug: Log all requests to comments
app.use('/api/v1/comments', (req, res, next) => {
  console.log(`[App] Comments route accessed: ${req.method} ${req.path}`);
  next();
});
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/chat', chatRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
  });
}); 

async function fetchText(targetUrl) {
  try {
    const { gotScraping } = await import('got-scraping');
    // 1. Phân tích URL để lấy domain gốc (Origin)
    // Ví dụ targetUrl = "https://s6.kkphim.com/abc/index.m3u8"
    // -> urlObj.origin = "https://s6.kkphim.com"
    const urlObj = new URL(targetUrl);
    const dynamicOrigin = urlObj.origin;

    // 2. Cấu hình request giả lập Chrome
    const response = await gotScraping({
      url: targetUrl,
      method: 'GET',
      headerGeneratorOptions: {
        browsers: [{ name: 'chrome', minVersion: 110 }],
        devices: ['desktop'],
        operatingSystems: ['windows'],
      },
      headers: {
        'Referer': dynamicOrigin + '/', 
        'Origin': dynamicOrigin,
        // Các header phụ trợ
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      // Tự động xử lý HTTP/2 và TLS Fingerprint (Cực quan trọng để fix lỗi 404 giả)
      http2: true,
      
      // Tăng timeout lên chút phòng khi server phim lag
      timeout: { request: 10000 },
      retry: { limit: 2 } // Thử lại 2 lần nếu lỗi mạng
    });

    // 3. Xử lý kết quả
    if (response.statusCode !== 200) {
       console.error(`[Proxy Error] URL: ${targetUrl} | Status: ${response.statusCode}`);
       throw new Error(`Lỗi tải URL: ${targetUrl} (HTTP ${response.statusCode})`);
    }

    return response.body;

  } catch (error) {
    console.error(`[Fetch Error] ${error.message}`);
    throw error;
  }
}

app.get('/api/v1/proxy-m3u8', async (req, res) => {
  try {
    const originalUrl = req.query.url;
    if (!originalUrl) return res.status(400).send('Thiếu URL');

    // Biến theo dõi URL hiện tại (để tính baseUrl chính xác)
    let currentFetchUrl = originalUrl;
    let content = await fetchText(currentFetchUrl);

    // --- GIAI ĐOẠN 1: Xử lý Master Playlist (nếu có) ---
    if (content.includes('#EXT-X-STREAM-INF')) {
      const lines = content.split('\n');
      let maxBandwidth = 0;
      let bestUri = '';

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('BANDWIDTH=')) {
          const match = lines[i].match(/BANDWIDTH=(\d+)/);
          const bandwidth = match ? parseInt(match[1]) : 0;

          // Kiểm tra dòng tiếp theo có phải link không (không bắt đầu bằng #)
          if (lines[i + 1] && !lines[i + 1].startsWith('#') && bandwidth > maxBandwidth) {
            maxBandwidth = bandwidth;
            bestUri = lines[i + 1].trim();
          }
        }
      }

      if (bestUri) {
        // Cập nhật URL hiện tại sang link con
        // new URL() tự động xử lý việc ghép link tương đối/tuyệt đối
        currentFetchUrl = new URL(bestUri, currentFetchUrl).toString();

        // Tải nội dung của link con (Media Playlist thực sự)
        content = await fetchText(currentFetchUrl);
      }
    }

    // --- GIAI ĐOẠN 2: Chuẩn bị Base URL mới ---
    // BaseUrl phải được lấy từ link CUỐI CÙNG mà ta vừa tải (currentFetchUrl)
    const baseUrl = currentFetchUrl.substring(0, currentFetchUrl.lastIndexOf('/') + 1);

    // --- GIAI ĐOẠN 3: Lọc quảng cáo & Rewrite Link ---
    const lines = content.split('\n');
    const cleanLines = [];
    let skipNext = false;

    // Tinh chỉnh từ khóa (Bỏ 'segment_' để tránh xóa nhầm phim)
    const AD_KEYWORDS = ['/v7/', '/adjump/', 'google', 'ads', 'doubleclick', 'facebook'];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue; // Bỏ dòng trống

      // Xử lý logic lọc
      if (line.startsWith('#EXTINF')) {
        // Kiểm tra dòng URL ngay bên dưới (lines[i+1])
        let nextLine = (lines[i + 1] || '').trim();

        // Chỉ check quảng cáo nếu dòng dưới là link (không phải tag #)
        if (nextLine && !nextLine.startsWith('#')) {
          const isAd = AD_KEYWORDS.some((k) => nextLine.includes(k));
          if (isAd) {
            skipNext = true; // Đánh dấu bỏ qua URL bên dưới
            continue; // Bỏ qua dòng #EXTINF này
          }
        }
      }

      if (skipNext) {
        skipNext = false;
        continue; // Bỏ qua dòng URL quảng cáo
      }

      // Bỏ qua tag ngắt quãng (thường gây lag khi nối video)
      if (line.includes('#EXT-X-DISCONTINUITY')) continue;

      // Xử lý Rewriting (Quan trọng nhất)
      // Nếu là dòng URL (không bắt đầu bằng #) và là link tương đối
      if (!line.startsWith('#')) {
        if (!line.startsWith('http')) {
          // Ghép với baseUrl mới
          line = new URL(line, baseUrl).toString();
        }
        // Nếu link đã tuyệt đối (http...) thì giữ nguyên
        if (line.includes('convertv7/')) {
          // Ví dụ: "convertv7/abc.ts" -> "abc.ts"
          line = line.replace('convertv7/', '');
        }
      }

      cleanLines.push(line);
    }

    // Trả về file m3u8 sạch
    res.set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*', // Cho phép Frontend gọi thoải mái
    });
    res.send(cleanLines.join('\n'));
  } catch (error) {
    console.error('Proxy Error:', error.message);
    res.status(500).send('Lỗi xử lý nguồn phim');
  }
});

module.exports = app;
