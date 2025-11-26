import React, { useState, useEffect } from "react";

const MovieFormModal = ({ isOpen, onClose, movie = null, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    englishTitle: "",
    year: new Date().getFullYear(),
    rating: 0,
    imdb: 0,
    country: "",
    genres: "",
    duration: "",
    ageRating: "",
    quality: "HD",
    synopsis: "",
    poster: "",
    backgroundImage: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load dữ liệu khi edit
  useEffect(() => {
    if (movie) {
      setFormData({
        title: movie.title || "",
        englishTitle: movie.englishTitle || "",
        year: movie.year || new Date().getFullYear(),
        rating: movie.rating || 0,
        imdb: movie.imdb || 0,
        country: movie.country || "",
        genres: Array.isArray(movie.genres) ? movie.genres.join(", ") : "",
        duration: movie.duration || "",
        ageRating: movie.ageRating || "",
        quality: movie.quality || "HD",
        synopsis: movie.synopsis || movie.description || "",
        poster: movie.poster || "",
        backgroundImage: movie.backgroundImage || "",
      });
    } else {
      // Reset form khi tạo mới
      setFormData({
        title: "",
        englishTitle: "",
        year: new Date().getFullYear(),
        rating: 0,
        imdb: 0,
        country: "",
        genres: "",
        duration: "",
        ageRating: "",
        quality: "HD",
        synopsis: "",
        poster: "",
        backgroundImage: "",
      });
    }
    setErrors({});
  }, [movie, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error khi user nhập
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Tên phim không được để trống";
    if (!formData.year || formData.year < 1900 || formData.year > 2100) {
      newErrors.year = "Năm không hợp lệ";
    }
    if (formData.rating < 0 || formData.rating > 10) {
      newErrors.rating = "Rating từ 0-10";
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Chuyển genres từ string sang array
      const movieData = {
        ...formData,
        genres: formData.genres
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        rating: parseFloat(formData.rating),
        imdb: parseFloat(formData.imdb),
        year: parseInt(formData.year),
      };

      await onSave(movieData);
      onClose();
    } catch (error) {
      console.error("Error saving movie:", error);
      setErrors({ submit: "Có lỗi xảy ra khi lưu phim" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {movie ? "Chỉnh Sửa Phim" : "Thêm Phim Mới"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <i className="fa-solid fa-times text-2xl"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tên phim */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tên Phim <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full bg-gray-800 border ${
                  errors.title ? "border-red-500" : "border-white/10"
                } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor`}
                placeholder="Nhập tên phim..."
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Tên Tiếng Anh</label>
              <input
                type="text"
                name="englishTitle"
                value={formData.englishTitle}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
                placeholder="English title..."
              />
            </div>
          </div>

          {/* Năm, Rating, IMDb */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Năm</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className={`w-full bg-gray-800 border ${
                  errors.year ? "border-red-500" : "border-white/10"
                } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor`}
              />
              {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rating</label>
              <input
                type="number"
                step="0.1"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                className={`w-full bg-gray-800 border ${
                  errors.rating ? "border-red-500" : "border-white/10"
                } rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor`}
              />
              {errors.rating && <p className="text-red-500 text-sm mt-1">{errors.rating}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">IMDb</label>
              <input
                type="number"
                step="0.1"
                name="imdb"
                value={formData.imdb}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
              />
            </div>
          </div>

          {/* Quốc gia, Thời lượng, Độ tuổi, Chất lượng */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Quốc Gia</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
                placeholder="Hàn Quốc"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Thời Lượng</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
                placeholder="1h 30m"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Độ Tuổi</label>
              <select
                name="ageRating"
                value={formData.ageRating}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
              >
                <option value="">Chọn...</option>
                <option value="P">P - Mọi lứa tuổi</option>
                <option value="T13">T13</option>
                <option value="T16">T16</option>
                <option value="T18">T18</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Chất Lượng</label>
              <select
                name="quality"
                value={formData.quality}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
              >
                <option value="HD">HD</option>
                <option value="4K">4K</option>
                <option value="CAM">CAM</option>
                <option value="SD">SD</option>
              </select>
            </div>
          </div>

          {/* Thể loại */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Thể Loại <span className="text-gray-500">(cách nhau bởi dấu phẩy)</span>
            </label>
            <input
              type="text"
              name="genres"
              value={formData.genres}
              onChange={handleChange}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
              placeholder="Hành Động, Tình Cảm, Hài"
            />
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">URL Poster</label>
              <input
                type="url"
                name="poster"
                value={formData.poster}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">URL Backdrop</label>
              <input
                type="url"
                name="backgroundImage"
                value={formData.backgroundImage}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Mô Tả</label>
            <textarea
              name="synopsis"
              value={formData.synopsis}
              onChange={handleChange}
              rows={4}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primaryColor resize-none"
              placeholder="Nhập mô tả phim..."
            ></textarea>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primaryColor hover:bg-primaryColor/90 text-black font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-save"></i>
                  {movie ? "Cập Nhật" : "Thêm Phim"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovieFormModal;
