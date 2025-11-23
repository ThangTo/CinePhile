const dotenv = require('dotenv');
const app = require('./app');
const { connectDB } = require('./config/db/db');

dotenv.config();
const PORT = process.env.PORT || 5000;

connectDB();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
