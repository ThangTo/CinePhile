const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000; // Cổng cho backend

app.use(cors()); // Sử dụng middleware CORS
app.use(express.json()); // Cho phép Express đọc JSON từ request body

// Một API endpoint đơn giản
app.get('/api/message', (req, res) => {
    res.json({ message: 'Hello from Node.js backend!' });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});