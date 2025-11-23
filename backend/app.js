const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/user.model');

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(passport.initialize());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
// require('./config/passport')(passport);

// Routes
const movieRoutes = require('./routes/movie.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');
const adminRoutes = require('./routes/admin.routes');
const crawlerRoutes = require('./routes/crawler.routes');

// API endpoints
// app.use('/api/v1/movies', movieRoutes);
app.use('/api/v1/auth', authRoutes); 
// app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/health', healthRoutes);
// app.use('/api/v1/admin', adminRoutes);
// app.use('/api/v1/crawl', crawlerRoutes);

app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

module.exports = app;
