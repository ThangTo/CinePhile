const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const app = express();

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/user.model");
const cookieParser = require("cookie-parser");
const authService = require("./services/auth.service");
const { getGoogleCallbackUrl } = require("./utils/authUtils");

// Middleware
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:3000";
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(passport.initialize());

// Serve static avatar files
app.use(
  "/api/v1/avatars",
  express.static(path.join(__dirname, "data/avatars")),
);

passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate()),
);
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



// Routes
const movieRoutes = require("./routes/movie.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const crawlerRoutes = require("./routes/crawler.routes");
const commentRoutes = require("./routes/comment.routes");
const chatRoutes = require("./routes/chat.routes");
const notificationRoutes = require("./routes/notification.routes");

const paymentRoutes = require("./routes/payment.routes");

// API endpoints
app.use("/api/v1/movies", movieRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/crawl", crawlerRoutes);
app.use("/api/v1/notifications", notificationRoutes);
// PayOS Routes (Payment)
app.use("/api/v1", paymentRoutes);

// Debug: Log all requests to comments
app.use("/api/v1/comments", (req, res, next) => {
  console.log(`[App] Comments route accessed: ${req.method} ${req.path}`);
  next();
});
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/chat", chatRoutes);

app.get("/", (req, res) => {
  res.status(200).send("Server is running");
});



module.exports = app;
