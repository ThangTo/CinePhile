const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/user.model');
const cookieParser = require('cookie-parser');
const authService = require('./services/auth.service');

// Middleware
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.use(passport.initialize());
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
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${apiBaseUrl}/api/v1/auth/google/callback`,
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

// Routes
const movieRoutes = require('./routes/movie.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');
const adminRoutes = require('./routes/admin.routes');
const crawlerRoutes = require('./routes/crawler.routes');

// API endpoints
app.use('/api/v1/movies', movieRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/crawl', crawlerRoutes);

app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

module.exports = app;
