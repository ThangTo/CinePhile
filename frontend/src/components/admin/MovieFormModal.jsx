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
  FiTrash2,
  FiEdit2,
  FiUser,
  FiSearch,
} from "react-icons/fi";
import { castAPI } from "services/admin.service";
import { BarSpinner } from "components/common/LoadingState";

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

// Component Quản lý Gallery (Modal con)
const GalleryManageModal = ({ isOpen, onClose, onSave, title, initialString, aspectRatio }) => {
  const [urls, setUrls] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const parsed = initialString
        ? initialString
            .split(/[\n,]+/)
            .map((u) => u.trim())
            .filter(Boolean)
        : [];
      setUrls(parsed);
      setNewUrl("");
      setEditingIndex(null);
    }
  }, [isOpen, initialString]);

  if (!isOpen) return null;

  const handleAddOrUpdate = () => {
    if (newUrl.trim()) {
      if (editingIndex !== null) {
        const updatedUrls = [...urls];
        updatedUrls[editingIndex] = newUrl.trim();
        setUrls(updatedUrls);
        setEditingIndex(null);
      } else {
        setUrls([...urls, newUrl.trim()]);
      }
      setNewUrl("");
    }
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setNewUrl(urls[index]);
  };

  const handleRemove = (index) => {
    setUrls(urls.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setNewUrl("");
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const handleSave = () => {
    onSave(urls.join(",\n"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1a1c23] w-full max-w-4xl rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FiImage className="text-primaryColor" /> Quản Lý Gallery: {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Nhập link ảnh mới..."
              className="flex-1 bg-black/20 border border-white/5 focus:border-primaryColor rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primaryColor/50 transition-all shadow-inner"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOrUpdate())}
            />
            {editingIndex !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(null);
                  setNewUrl("");
                }}
                className="px-6 py-3 rounded-xl bg-gray-500/20 text-gray-300 font-bold border border-white/10 hover:bg-gray-500/40 hover:text-white transition-all shrink-0"
              >
                Hủy Sửa
              </button>
            )}
            <button
              type="button"
              onClick={handleAddOrUpdate}
              disabled={!newUrl.trim()}
              className={`px-6 py-3 rounded-xl font-bold border transition-all disabled:opacity-50 shrink-0 ${
                editingIndex !== null
                  ? "bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500 hover:text-white"
                  : "bg-white/10 text-white border-white/10 hover:bg-white/20"
              }`}
            >
              {editingIndex !== null ? "Cập Nhật" : "Thêm Ảnh"}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {urls.map((url, i) => (
              <div
                key={i}
                className={`relative group rounded-xl overflow-hidden border ${editingIndex === i ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" : "border-white/10"} ${aspectRatio} bg-black/40`}
              >
                <img
                  src={url}
                  alt=""
                  className={`w-full h-full object-cover ${editingIndex === i ? "opacity-30" : ""}`}
                  onError={(e) => (e.target.style.display = "none")}
                />
                {editingIndex === i && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg shadow-blue-500/50">
                    ĐANG SỬA
                  </div>
                )}
                <div
                  className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2 backdrop-blur-sm ${editingIndex === i ? "opacity-100" : ""}`}
                >
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleEdit(i)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                      title="Sửa link ảnh"
                    >
                      <FiEdit2 size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(i)}
                      className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                      title="Xóa ảnh"
                    >
                      <FiTrash2 size={20} />
                    </button>
                  </div>
                  <span
                    className="text-[10px] text-gray-300 truncate w-full px-2 text-center"
                    title={url}
                  >
                    {url}
                  </span>
                </div>
              </div>
            ))}
            {urls.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl">
                <FiImage size={40} className="mb-2 opacity-50" />
                <p>Chưa có ảnh nào trong gallery này.</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-black/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-gray-400 font-medium hover:bg-white/5 transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-primaryColor text-black font-bold shadow-lg shadow-primaryColor/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Lưu Gallery
          </button>
        </div>
      </div>
    </div>
  );
};

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
    status: "ongoing",
    currentEpisode: "",
    totalEpisodes: 0,
    logo: "",
    backdrops: "",
    posters: "",
    castIds: [],
  });
  // Cast management state
  const [castSearch, setCastSearch] = useState("");
  const [castResults, setCastResults] = useState([]);
  const [castLoading, setCastLoading] = useState(false);
  const [characterInput, setCharacterInput] = useState({});
  const [galleryModal, setGalleryModal] = useState({
    isOpen: false,
    type: null, // "posters" or "backdrops"
    title: "",
    aspectRatio: "aspect-[2/3]",
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
        totalWatchTime: movie.totalWatchTime || 0,
        status: movie.status || "ongoing",
        currentEpisode: movie.currentEpisode !== undefined ? String(movie.currentEpisode) : "",
        totalEpisodes: movie.totalEpisodes || 0,
        logo: movie.logo || movie.images?.logo || "",
        backdrops: movie.backdrops?.join(",\n") || movie.images?.backdrops?.join(",\n") || "",
        posters: movie.posters?.join(",\n") || movie.images?.posters?.join(",\n") || "",
        castIds: Array.isArray(movie.castIds)
          ? movie.castIds.map((c) => ({
              castId: c.castId || c._id || c,
              character: c.character || "",
              order: c.order || 0,
            }))
          : [],
      });
      // Reset character input
      if (Array.isArray(movie.castIds)) {
        const charMap = {};
        movie.castIds.forEach((c) => {
          const id = c.castId || c._id || c;
          if (id) charMap[id] = c.character || "";
        });
        setCharacterInput(charMap);
      }
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
        totalWatchTime: 0,
        status: "ongoing",
        currentEpisode: "",
        totalEpisodes: 0,
        logo: "",
        backdrops: "",
        posters: "",
        castIds: [],
      });
      setCharacterInput({});
    }
    setErrors({});
    setCastSearch("");
    setCastResults([]);
  }, [movie, isOpen]);

  // Fetch cast details for display in list
  useEffect(() => {
    if (!isOpen || formData.castIds.length === 0) return;

    const fetchCastDetails = async () => {
      const castIdsToFetch = formData.castIds
        .filter((c) => !c._name && !c._avatar)
        .map((c) => c.castId);

      if (castIdsToFetch.length === 0) return;

      try {
        const promises = castIdsToFetch.map((id) => castAPI.getById(id).catch(() => null));
        const results = await Promise.all(promises);

        setFormData((prev) => ({
          ...prev,
          castIds: prev.castIds.map((c) => {
            const fetched = results.find((r) => r && (r._id === c.castId || r.id === c.castId));
            if (fetched) {
              return {
                ...c,
                _name: fetched.name,
                _avatar: fetched.profileUrl || fetched.profilePath,
              };
            }
            return c;
          }),
        }));
      } catch (err) {
        console.error("Error fetching cast details:", err);
      }
    };

    fetchCastDetails();
  }, [isOpen, formData.castIds]);

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

  // ============ CAST MANAGEMENT ============

  const searchCast = async (query) => {
    if (!query || query.trim().length < 2) {
      setCastResults([]);
      return;
    }
    setCastLoading(true);
    try {
      const response = await castAPI.getAll({ search: query, limit: 10 });
      const results = Array.isArray(response.data) ? response.data : [];
      // Lọc bỏ các cast đã được thêm
      const existingIds = new Set(formData.castIds.map((c) => c.castId));
      setCastResults(results.filter((c) => !existingIds.has(c._id || c.id)));
    } catch (err) {
      console.error("Error searching cast:", err);
      setCastResults([]);
    } finally {
      setCastLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (castSearch.trim().length >= 2) {
        searchCast(castSearch);
      } else {
        setCastResults([]);
      }
    }, 400);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castSearch, formData.castIds]);

  const addCastToMovie = (cast) => {
    const castId = cast._id || cast.id;
    const alreadyAdded = formData.castIds.some((c) => c.castId === castId);
    if (alreadyAdded) return;

    const newOrder = formData.castIds.length;
    setFormData((prev) => ({
      ...prev,
      castIds: [...prev.castIds, { castId, character: "", order: newOrder }],
    }));
    setCastResults([]);
    setCastSearch("");
  };

  const removeCastFromMovie = (castId) => {
    setFormData((prev) => ({
      ...prev,
      castIds: prev.castIds.filter((c) => c.castId !== castId),
    }));
    // Update order
    setFormData((prev) => ({
      ...prev,
      castIds: prev.castIds.map((c, i) => ({ ...c, order: i })),
    }));
  };

  const updateCastCharacter = (castId, character) => {
    setCharacterInput((prev) => ({ ...prev, [castId]: character }));
    setFormData((prev) => ({
      ...prev,
      castIds: prev.castIds.map((c) => (c.castId === castId ? { ...c, character } : c)),
    }));
  };

  const moveCastUp = (index) => {
    if (index <= 0) return;
    setFormData((prev) => {
      const newCastIds = [...prev.castIds];
      [newCastIds[index - 1], newCastIds[index]] = [newCastIds[index], newCastIds[index - 1]];
      return {
        ...prev,
        castIds: newCastIds.map((c, i) => ({ ...c, order: i })),
      };
    });
  };

  const moveCastDown = (index) => {
    if (index >= formData.castIds.length - 1) return;
    setFormData((prev) => {
      const newCastIds = [...prev.castIds];
      [newCastIds[index], newCastIds[index + 1]] = [newCastIds[index + 1], newCastIds[index]];
      return {
        ...prev,
        castIds: newCastIds.map((c, i) => ({ ...c, order: i })),
      };
    });
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
          ? formData.genres
              .split(",")
              .map((g) => g.trim())
              .filter(Boolean)
          : [],
        rating: parseFloat(formData.rating) || 0,
        year: parseInt(formData.year) || new Date().getFullYear(),
        // Ensure poster, backgroundImage, trailer, and logo are included even if empty
        poster: formData.poster || "",
        backgroundImage: formData.backgroundImage || "",
        trailer: formData.trailer || "",
        logo: formData.logo || "",
        backdrops: formData.backdrops
          ? formData.backdrops
              .split(/[\n,]+/)
              .map((u) => u.trim())
              .filter(Boolean)
          : [],
        posters: formData.posters
          ? formData.posters
              .split(/[\n,]+/)
              .map((u) => u.trim())
              .filter(Boolean)
          : [],
        views: parseInt(formData.views) || 0,
        totalEpisodes: parseInt(formData.totalEpisodes) || 0,
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

  const formatWatchTime = (seconds) => {
    if (!seconds) return "0 Phút";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} Giờ ${m} Phút`;
    return `${m} Phút`;
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
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <FiType className="text-primaryColor" /> Thông Tin Cơ Bản
                    </h3>
                    {movie?.tmdb?.id && (
                      <a
                        href={`https://www.themoviedb.org/${movie.tmdb.type || "movie"}/${movie.tmdb.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-white rounded-lg transition-colors border border-blue-500/20"
                        title="Xem trên TMDB"
                      >
                        <FiLink size={12} /> Link TMDB
                      </a>
                    )}
                  </div>
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

                    {/* View & Readonly Watch Time */}
                    <div className="space-y-1 w-full">
                      <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                        <FiEye className="text-primaryColor" /> LƯỢT XEM
                      </label>
                      <input
                        type="number"
                        name="views"
                        value={formData.views}
                        onChange={handleChange}
                        className="w-full bg-black/20 border border-white/5 focus:border-primaryColor rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primaryColor/50 transition-all shadow-inner hover:bg-black/30"
                      />
                      {/* Thẻ Readonly hiển thị Thời Lượng Xem Thực Tế đã được Format */}
                      <p className="text-[10px] text-amber-500/90 font-bold inline-flex items-center gap-1 mt-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <FiClock size={10} /> Thực Tế: {formatWatchTime(formData.totalWatchTime)}
                      </p>
                    </div>
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

                  <div className="border-t border-white/5 my-1"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChipSelector
                      label="Trạng Thái (Status)"
                      icon={FiMonitor}
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      options={[
                        { value: "upcoming", label: "Sắp chiếu" },
                        { value: "ongoing", label: "Đang chiếu" },
                        { value: "completed", label: "Hoàn Thành" },
                      ]}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        label="Tập hiện tại"
                        name="currentEpisode"
                        icon={FiMonitor}
                        value={formData.currentEpisode}
                        onChange={handleChange}
                        placeholder="VD: 7 hoặc Full"
                      />
                      <FormField
                        label="Tổng số tập"
                        name="totalEpisodes"
                        type="number"
                        icon={FiMonitor}
                        value={formData.totalEpisodes}
                        onChange={handleChange}
                        placeholder="VD: 12"
                      />
                    </div>
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

                  {/* Row 4: Cast Management */}
                  <div className="border-t border-white/5 pt-4">
                    <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                      <FiUser className="text-primaryColor" /> Diễn Viên ({formData.castIds.length})
                    </h3>

                    {/* Search Cast */}
                    <div className="relative mb-4">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="text-gray-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="Tìm diễn viên (tên, alias)..."
                        value={castSearch}
                        onChange={(e) => setCastSearch(e.target.value)}
                        className="w-full bg-black/20 border border-white/5 focus:border-primaryColor rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primaryColor/50 transition-all"
                      />
                      {castLoading && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <BarSpinner size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Search Results Dropdown */}
                    {castResults.length > 0 && (
                      <div className="bg-black/40 border border-white/10 rounded-xl max-h-40 overflow-y-auto mb-4 custom-scrollbar">
                        {castResults.map((cast) => (
                          <button
                            key={cast._id || cast.id}
                            type="button"
                            onClick={() => addCastToMovie(cast)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/10 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0">
                              {cast.profileUrl || cast.profilePath ? (
                                <img
                                  src={cast.profileUrl || cast.profilePath}
                                  alt={cast.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                  {(cast.name || "C").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">{cast.name}</div>
                              {cast.knownForDepartment && (
                                <div className="text-[10px] text-gray-500">
                                  {cast.knownForDepartment}
                                </div>
                              )}
                            </div>
                            <FiCheck className="text-primaryColor flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Cast List */}
                    {formData.castIds.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                        {formData.castIds.map((castItem, index) => {
                          const castId = castItem.castId;
                          return (
                            <div
                              key={castId}
                              className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-xl p-3 group hover:border-primaryColor/30 transition-colors"
                            >
                              {/* Order Number */}
                              <div className="w-6 h-6 rounded-full bg-primaryColor/20 text-primaryColor text-xs font-bold flex items-center justify-center flex-shrink-0">
                                {index + 1}
                              </div>

                              {/* Cast Avatar */}
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0">
                                {castItem._avatar ? (
                                  <img
                                    src={castItem._avatar}
                                    alt={castItem._name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                    {(castItem._name || "C").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Cast Info */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white font-medium truncate">
                                  {castItem._name || "Diễn viên"}
                                </div>
                                <input
                                  type="text"
                                  placeholder="Vai diễn..."
                                  value={characterInput[castId] || castItem.character || ""}
                                  onChange={(e) => updateCastCharacter(castId, e.target.value)}
                                  className="w-full bg-transparent text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:text-gray-300"
                                />
                              </div>

                              {/* Move Buttons */}
                              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => moveCastUp(index)}
                                  disabled={index === 0}
                                  className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                                  title="Di chuyển lên"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveCastDown(index)}
                                  disabled={index === formData.castIds.length - 1}
                                  className="p-1 text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                                  title="Di chuyển xuống"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>
                              </div>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeCastFromMovie(castId)}
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Xóa diễn viên"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">
                        <FiUser className="mx-auto mb-2 opacity-50" size={24} />
                        Chưa thêm diễn viên nào. Tìm kiếm và thêm ở trên.
                      </div>
                    )}
                  </div>

                  {/* Row 5: SEO / Slug Preview */}
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
                        label="Primary Backdrop Preview"
                        aspectRatio="aspect-video"
                      />
                    </div>

                    {/* Gallery Manager for Posters */}
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">
                          TMDB Posters Gallery
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryModal({
                              isOpen: true,
                              type: "posters",
                              title: "TMDB Posters",
                              aspectRatio: "aspect-[2/3]",
                            })
                          }
                          className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-primaryColor font-medium transition-colors border border-primaryColor/30"
                        >
                          Quản Lý Gallery (
                          {formData.posters
                            ? formData.posters.split(/[\n,]+/).filter(Boolean).length
                            : 0}
                          )
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {formData.posters ? (
                          formData.posters
                            .split(/[\n,]+/)
                            .map((u) => u.trim())
                            .filter(Boolean)
                            .slice(0, 5)
                            .map((url, i) => (
                              <img
                                key={`p-${i}`}
                                src={url}
                                alt=""
                                className="h-20 aspect-[2/3] object-cover rounded shrink-0 border border-white/10"
                              />
                            ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">Trống</span>
                        )}
                        {formData.posters &&
                          formData.posters.split(/[\n,]+/).filter(Boolean).length > 5 && (
                            <div className="h-20 aspect-[2/3] rounded shrink-0 border border-white/10 flex items-center justify-center bg-white/5 text-gray-400 text-xs font-bold">
                              +{formData.posters.split(/[\n,]+/).filter(Boolean).length - 5}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Gallery Manager for Backdrops */}
                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">
                          TMDB Backdrops Gallery
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryModal({
                              isOpen: true,
                              type: "backdrops",
                              title: "TMDB Backdrops",
                              aspectRatio: "aspect-video",
                            })
                          }
                          className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-primaryColor font-medium transition-colors border border-primaryColor/30"
                        >
                          Quản Lý Gallery (
                          {formData.backdrops
                            ? formData.backdrops.split(/[\n,]+/).filter(Boolean).length
                            : 0}
                          )
                        </button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {formData.backdrops ? (
                          formData.backdrops
                            .split(/[\n,]+/)
                            .map((u) => u.trim())
                            .filter(Boolean)
                            .slice(0, 5)
                            .map((url, i) => (
                              <img
                                key={`b-${i}`}
                                src={url}
                                alt=""
                                className="h-20 aspect-video object-cover rounded shrink-0 border border-white/10"
                              />
                            ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">Trống</span>
                        )}
                        {formData.backdrops &&
                          formData.backdrops.split(/[\n,]+/).filter(Boolean).length > 5 && (
                            <div className="h-20 aspect-video rounded shrink-0 border border-white/10 flex items-center justify-center bg-white/5 text-gray-400 text-xs font-bold">
                              +{formData.backdrops.split(/[\n,]+/).filter(Boolean).length - 5}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-white/5 pt-4">
                      <FormField
                        label="Logo URL"
                        name="logo"
                        value={formData.logo}
                        onChange={handleChange}
                        placeholder="https://..."
                      />
                      <ImagePreview
                        url={formData.logo}
                        label="Logo Preview"
                        aspectRatio="aspect-[3/1]"
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

      {/* Kéo Modal con gọi ở đây để đè lên form */}
      <GalleryManageModal
        isOpen={galleryModal.isOpen}
        title={galleryModal.title}
        aspectRatio={galleryModal.aspectRatio}
        initialString={galleryModal.type ? formData[galleryModal.type] : ""}
        onClose={() => setGalleryModal({ ...galleryModal, isOpen: false })}
        onSave={(newString) => {
          setFormData({ ...formData, [galleryModal.type]: newString });
        }}
      />
    </div>
  );
};

export default MovieFormModal;
