import React, { useState, useEffect } from "react";
// Import Icons
import {
  FiX,
  FiSave,
  FiFilm,
  FiGlobe,
  FiClock,
  FiStar,
  FiImage,
  FiLayers,
  FiAlertCircle,
  FiType,
  FiMonitor,
  FiCalendar,
  FiCheck,
  FiLink,
  FiEye,
} from "react-icons/fi";

// --- UI COMPONENTS ---

const FormField = ({ label, name, type = "text", error, icon: Icon, children, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
      {Icon && <Icon className="text-primaryColor" />} {label}
    </label>
    {children ? (
      children
    ) : (
      <input
        type={type}
        name={name}
        className={`w-full bg-black/20 border ${
          error
            ? "border-red-500/50 focus:border-red-500"
            : "border-white/5 focus:border-primaryColor"
        } rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primaryColor/50 transition-all shadow-inner hover:bg-black/30`}
        {...props}
      />
    )}
    {error && (
      <p className="text-red-400 text-xs flex items-center gap-1">
        <FiAlertCircle /> {error}
      </p>
    )}
  </div>
);

// Component mới: Selector dạng Chip/Button để lấp đầy không gian
const ChipSelector = ({ label, icon: Icon, options, value, onChange, name }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
      {Icon && <Icon className="text-primaryColor" />} {label}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange({ target: { name, value: opt.value } })}
          className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
            value === opt.value
              ? "bg-primaryColor text-black border-primaryColor shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" // Giả sử bạn có biến màu, hoặc dùng shadow-yellow-500/30
              : "bg-black/20 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
          }`}
        >
          {value === opt.value && <FiCheck size={12} />}
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const ImagePreview = ({ url, label, aspectRatio = "aspect-[2/3]" }) => (
  <div
    className={`relative w-full ${aspectRatio} bg-black/20 rounded-lg border border-white/5 overflow-hidden group`}
  >
    {url ? (
      <img
        src={url}
        alt="Preview"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        onError={(e) => (e.target.style.display = "none")}
      />
    ) : (
      <div className="flex flex-col items-center justify-center h-full text-gray-600">
        <FiImage size={24} />
        <span className="text-[10px] mt-1 uppercase">No Image</span>
      </div>
    )}
    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm py-1 text-center">
      <span className="text-[10px] text-gray-300 font-medium uppercase tracking-widest">
        {label}
      </span>
    </div>
  </div>
);

const MovieFormModal = ({ isOpen, onClose, movie = null, onSave }) => {
  const [formData, setFormData] = useState({
    title: "",
    englishTitle: "",
    year: new Date().getFullYear(),
    rating: 0,
    country: "",
    genres: "",
    duration: "",
    ageRating: "",
    quality: "HD",
    description: "",
    poster: "",
    backgroundImage: "",
    trailer: "",
    views: 0,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugPreview, setSlugPreview] = useState("");

  useEffect(() => {
    // Logic load data giữ nguyên...
    if (movie) {
      setFormData({
        title: movie.title || movie.name || "",
        englishTitle: movie.englishTitle || movie.original_name || "",
        year: movie.year || new Date().getFullYear(),
        rating: movie.rating || 0,
        country: movie.country || "",
        genres: Array.isArray(movie.genres) ? movie.genres.join(", ") : "",
        duration: movie.duration || movie.time || "",
        ageRating: movie.ageRating || movie.age_rating || "",
        quality: movie.quality || "HD",
        description: movie.description || movie.content || movie.synopsis || "",
        poster: movie.poster || movie.poster_url || "",
        backgroundImage: movie.backgroundImage || movie.thumb_url || "",
        trailer: movie.trailer || movie.trailerUrl || movie.trailer_url || "",
        views: movie.views ?? movie.viewCount ?? 0,
      });
    } else {
      setFormData({
        title: "",
        englishTitle: "",
        year: new Date().getFullYear(),
        rating: 0,
        country: "",
        genres: "",
        duration: "",
        ageRating: "",
        quality: "HD",
        description: "",
        poster: "",
        backgroundImage: "",
        trailer: "",
        views: 0,
      });
    }
    setErrors({});
  }, [movie, isOpen]);

  // Tạo slug tự động để hiển thị preview
  useEffect(() => {
    const slug = formData.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Bỏ dấu tiếng Việt
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    setSlugPreview(slug);
  }, [formData.title]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    // Giữ nguyên logic validate cũ
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Tên phim không được để trống";
    if (!formData.year || formData.year < 1900 || formData.year > 2100)
      newErrors.year = "Năm không hợp lệ";
    if (formData.rating < 0 || formData.rating > 10) newErrors.rating = "Rating từ 0-10";
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
      const movieData = {
        ...formData,
        genres: formData.genres
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        rating: parseFloat(formData.rating),
        year: parseInt(formData.year),
        // Ensure poster, backgroundImage, and trailer are included even if empty
        poster: formData.poster || "",
        backgroundImage: formData.backgroundImage || "",
        trailer: formData.trailer || "",
        views: parseInt(formData.views) || 0,
      };
      await onSave(movieData);
      onClose();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || "Có lỗi xảy ra";
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 mt-0">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl h-[90vh] bg-bgColor3 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/10 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                movie ? "bg-blue-500/20 text-blue-400" : "bg-primaryColor/20 text-primaryColor"
              }`}
            >
              {movie ? <FiFilm size={24} /> : <FiLayers size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {movie ? "Cập Nhật Thông Tin Phim" : "Thêm Phim Mới Vào Kho"}
              </h2>
              <p className="text-xs text-gray-400">Điền đầy đủ thông tin bên dưới.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <form id="movieForm" onSubmit={handleSubmit} className="space-y-8">
            {errors.submit && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-3 text-red-200">
                <FiAlertCircle size={20} /> <span>{errors.submit}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-2 flex flex-col gap-5">
                {/* 1. Core Info */}
                <div className="bg-black/10 rounded-xl p-5 border border-white/5 space-y-4">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <FiType className="text-primaryColor" /> Thông Tin Cơ Bản
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Tên Phim (TV) *"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      error={errors.title}
                      placeholder="Ví dụ: Đào, Phở và Piano"
                    />
                    <FormField
                      label="Tên Tiếng Anh"
                      name="englishTitle"
                      value={formData.englishTitle}
                      onChange={handleChange}
                      placeholder="Ex: Peach, Pho and Piano"
                    />
                  </div>
                  <FormField label="Mô Tả Nội Dung" icon={FiLayers}>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor/50 resize-none transition-all shadow-inner hover:bg-black/30"
                      placeholder="Nhập tóm tắt nội dung phim..."
                    ></textarea>
                  </FormField>
                </div>

                {/* 2. Details & Stats (Phần bạn muốn làm đẹp) */}
                <div className="bg-black/10 rounded-xl p-5 border border-white/5 space-y-5 flex-1 flex flex-col">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                    <FiMonitor className="text-primaryColor" /> Chỉ Số & Phân Loại
                  </h3>

                  {/* Row 1: 4 cột */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      label="Năm SX"
                      name="year"
                      type="number"
                      icon={FiCalendar}
                      value={formData.year}
                      onChange={handleChange}
                      error={errors.year}
                    />
                    <FormField
                      label="Thời lượng"
                      name="duration"
                      icon={FiClock}
                      value={formData.duration}
                      onChange={handleChange}
                      placeholder="90 min"
                    />
                    <FormField
                      label="Rating App"
                      name="rating"
                      type="number"
                      step="0.5"
                      icon={FiStar}
                      value={formData.rating}
                      onChange={handleChange}
                      error={errors.rating}
                    />
                    <FormField
                      label="Lượt xem"
                      name="views"
                      type="number"
                      icon={FiEye}
                      value={formData.views}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </div>

                  {/* Row 2: 2 cột lớn hơn */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      label="Quốc gia"
                      name="country"
                      icon={FiGlobe}
                      value={formData.country}
                      onChange={handleChange}
                    />
                    <FormField
                      label="Thể loại"
                      name="genres"
                      icon={FiLayers}
                      value={formData.genres}
                      onChange={handleChange}
                      placeholder="Hành động, Hài..."
                    />
                  </div>

                  <div className="border-t border-white/5 my-1"></div>

                  {/* Row 3: Chip Selectors (THAY ĐỔI LỚN Ở ĐÂY) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChipSelector
                      label="Độ Tuổi (Age Rating)"
                      icon={FiLayers}
                      name="ageRating"
                      value={formData.ageRating}
                      onChange={handleChange}
                      options={[
                        { value: "T12", label: "12+ (Teen)" },
                        { value: "T16", label: "16+ (Mature)" },
                        { value: "18+", label: "18+ (Adult)" },
                      ]}
                    />

                    <ChipSelector
                      label="Chất Lượng Video"
                      icon={FiMonitor}
                      name="quality"
                      value={formData.quality}
                      onChange={handleChange}
                      options={[
                        { value: "CAM", label: "CAM" },
                        { value: "SD", label: "SD" },
                        { value: "HD", label: "HD" },
                        { value: "FHD", label: "FHD" },
                        { value: "4K", label: "4K" },
                      ]}
                    />
                  </div>

                  <div className="space-y-3">
                    <FormField
                      label="Trailer URL (YouTube)"
                      name="trailer"
                      icon={FiLink}
                      value={formData.trailer}
                      onChange={handleChange}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>

                  {/* Row 4: SEO / Slug Preview (Lấp đầy khoảng trống cuối cùng) */}
                  <div className="mt-auto">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex items-start gap-3">
                      <FiLink className="text-blue-400 mt-1 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-[10px] uppercase font-bold text-blue-400 mb-0.5">
                          SEO Preview / Slug
                        </p>
                        <p className="text-sm text-gray-300 truncate font-mono">
                          domain.com/phim/
                          <span className="text-white font-semibold">
                            {slugPreview || "ten-phim-se-hien-thi-o-day"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-1 flex flex-col gap-5">
                <div className="bg-black/10 rounded-xl p-5 border border-white/5 h-full flex flex-col">
                  <h3 className="text-white font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <FiImage className="text-primaryColor" /> Media & Hình Ảnh
                  </h3>
                  <div className="space-y-6 flex-1">
                    <div className="space-y-3">
                      <FormField
                        label="Poster URL"
                        name="poster"
                        value={formData.poster}
                        onChange={handleChange}
                        placeholder="https://..."
                      />
                      <ImagePreview
                        url={formData.poster}
                        label="Poster Preview"
                        aspectRatio="aspect-[2/3]"
                      />
                    </div>
                    <div className="space-y-3">
                      <FormField
                        label="Backdrop URL"
                        name="backgroundImage"
                        value={formData.backgroundImage}
                        onChange={handleChange}
                        placeholder="https://..."
                      />
                      <ImagePreview
                        url={formData.backgroundImage}
                        label="Backdrop Preview"
                        aspectRatio="aspect-video"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-black/20 border-t border-white/10 flex justify-end gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-all"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="movieForm"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-xl bg-primaryColor text-black font-bold shadow-lg shadow-primaryColor/20 hover:shadow-primaryColor/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              "Đang xử lý..."
            ) : (
              <>
                <FiSave size={20} /> <span>{movie ? "Lưu Thay Đổi" : "Tạo Phim Mới"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieFormModal;
