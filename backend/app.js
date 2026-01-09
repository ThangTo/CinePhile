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

// Compression middleware - Nén responses để giảm bandwidth
app.use(compression());

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

module.exports = app;
