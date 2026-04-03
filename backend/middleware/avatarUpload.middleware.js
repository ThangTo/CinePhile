const multer = require('multer');
const avatarService = require('../services/avatar.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: avatarService.MAX_AVATAR_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    const normalizedMimeType = String(file.mimetype || "").toLowerCase();
    if (!avatarService.ALLOWED_AVATAR_MIME_TYPES.includes(normalizedMimeType)) {
      callback(new Error('Invalid avatar file type'));
      return;
    }

    callback(null, true);
  },
});

const avatarUploadMiddleware = (req, res, next) => {
  upload.single('avatar')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Avatar file is too large' });
    }

    return res.status(400).json({ message: error.message || 'Invalid avatar upload' });
  });
};

module.exports = avatarUploadMiddleware;
