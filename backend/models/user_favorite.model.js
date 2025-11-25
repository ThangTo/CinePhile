const mongoose = require("mongoose");

const userFavoriteSchema = new mongoose.Schema({
    // Tham chiếu đến User (required, indexed)
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    // Tham chiếu đến Movie (required, indexed)
    movieId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Movie', 
        required: true, 
        index: true 
    },
}, { 
    timestamps: true // Tự động thêm createdAt và updatedAt
});

// Unique Compound Index: Đảm bảo { userId, movieId } là duy nhất
userFavoriteSchema.index({ userId: 1, movieId: 1 }, { unique: true });

module.exports = mongoose.model("UserFavorite", userFavoriteSchema);
