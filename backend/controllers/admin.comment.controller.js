const Comment = require('../models/comment.model');

/**
 * GET /admin/comments
 * Get all comments with pagination and filters
 */
const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const search = req.query.search;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .populate('userId', 'username email avatar role') // Corrected fields
        .populate('movieId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Comment.countDocuments(query)
    ]);

    // Map to frontend expected format if needed, but standard return is fine
    // Frontend expects: { id, content, user: { name }, ... }
    const formattedComments = comments.map(c => ({
      id: c._id,
      content: c.content,
      fullContent: c.content, // Frontend uses fullContent for tooltip
      flag: c.flag,
      reason: c.flagReason,
      status: c.status || 'allowed', // Default to allowed for legacy data
      createdAt: new Date(c.createdAt).toLocaleString('vi-VN'), // Simple format
      user: {
        name: c.userId?.username || 'Unknown', // Changed from name to username
        role: c.userId?.role || 'User', // If role exists
        avatar: c.userId?.avatar
      },
      movieName: c.movieId?.name
    }));

    res.json({
      data: formattedComments,
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE /admin/comments/:id
 * Delete a comment
 */
const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    await Comment.findByIdAndDelete(id);
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PATCH /admin/comments/:id/status
 * Update comment status
 */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'allowed', 'banned', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const comment = await Comment.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAll,
  deleteComment,
  updateStatus
};
