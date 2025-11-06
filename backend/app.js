const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
const movieRoutes = require('./routes/movie.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');

// API endpoints
app.use('/api/v1/movies', movieRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/health', healthRoutes);

module.exports = app;
