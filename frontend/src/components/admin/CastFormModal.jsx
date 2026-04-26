import React, { useState, useEffect } from "react";
import {
  FiX,
  FiSave,
  FiUser,
  FiAlertCircle,
  FiCheck,
  FiFilm,
  FiImage,
  FiMapPin,
  FiCalendar,
  FiInfo,
} from "react-icons/fi";
import { BarSpinner } from "components/common/LoadingState";

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
          error ? "border-red-500/50 focus:border-red-500" : "border-white/5 focus:border-primaryColor"
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

const ChipSelector = ({ label, icon: Icon, options, value, onChange, name, multiple = false }) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
      {Icon && <Icon className="text-primaryColor" />} {label}
    </label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = multiple ? value?.includes(opt.value) : value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (multiple) {
                const newVal = isSelected
                  ? value.filter((v) => v !== opt.value)
                  : [...(value || []), opt.value];
                onChange({ target: { name, value: newVal } });
              } else {
                onChange({ target: { name, value: opt.value } });
              }
            }}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
              isSelected
                ? "bg-primaryColor text-black border-primaryColor shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]"
                : "bg-black/20 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
            }`}
          >
            {isSelected && <FiCheck size={12} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  </div>
);

const CastFormModal = ({ isOpen, onClose, cast = null, onSave }) => {
  const [formData, setFormData] = useState({
    name: "",
    nameLatin: "",
    profileUrl: "",
    biography: "",
    birthday: "",
    deathday: "",
    place_of_birth: "",
    knownForDepartment: "Acting",
    roles: ["actor"],
    alsoKnownAs: [],
    popularity: 0,
    tmdbId: "",
    imdbId: "",
    gender: 0,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alsoKnownAsInput, setAlsoKnownAsInput] = useState("");

  useEffect(() => {
    if (cast) {
      setFormData({
        name: cast.name || "",
        nameLatin: cast.nameLatin || "",
        profileUrl: cast.profileUrl || cast.profilePath || "",
        biography: cast.biography || "",
        birthday: cast.birthday || "",
        deathday: cast.deathday || "",
        place_of_birth: cast.place_of_birth || "",
        knownForDepartment: cast.knownForDepartment || "Acting",
        roles: cast.roles || ["actor"],
        alsoKnownAs: cast.alsoKnownAs || [],
        popularity: cast.popularity || 0,
        tmdbId: cast.tmdbId || "",
        imdbId: cast.imdbId || "",
        gender: cast.gender || 0,
      });
    } else {
      setFormData({
        name: "",
        nameLatin: "",
        profileUrl: "",
        biography: "",
        birthday: "",
        deathday: "",
        place_of_birth: "",
        knownForDepartment: "Acting",
        roles: ["actor"],
        alsoKnownAs: [],
        popularity: 0,
        tmdbId: "",
        imdbId: "",
        gender: 0,
      });
    }
    setErrors({});
    setAlsoKnownAsInput("");
  }, [cast, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = "Tên là bắt buộc";
    }
    if (formData.tmdbId && isNaN(Number(formData.tmdbId))) {
      newErrors.tmdbId = "TMDb ID phải là số";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAlias = () => {
    if (alsoKnownAsInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        alsoKnownAs: [...(prev.alsoKnownAs || []), alsoKnownAsInput.trim()],
      }));
      setAlsoKnownAsInput("");
    }
  };

  const handleRemoveAlias = (index) => {
    setFormData((prev) => ({
      ...prev,
      alsoKnownAs: prev.alsoKnownAs.filter((_, i) => i !== index),
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddAlias();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-bgColor3 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FiUser className="text-primaryColor" />
            {cast ? "Chỉnh Sửa Diễn Viên" : "Thêm Diễn Viên Mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Tên */}
          <FormField label="Tên *" name="name" icon={FiUser} value={formData.name} onChange={handleChange} error={errors.name} placeholder="Nhập tên diễn viên" />

          {/* Tên Latin */}
          <FormField label="Tên Latin (Latinized)" name="nameLatin" value={formData.nameLatin} onChange={handleChange} placeholder="Tên đã Latin hóa (Hàn/Trung/Nhật)" />

          {/* Ảnh */}
          <FormField label="URL Ảnh" name="profileUrl" icon={FiImage} value={formData.profileUrl} onChange={handleChange} placeholder="https://image.tmdb.org/t/p/w500/..." />

          {/* Tiểu sử */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
              <FiInfo className="text-primaryColor" /> Tiểu sử
            </label>
            <textarea
              name="biography"
              rows={4}
              className="w-full bg-black/20 border border-white/5 focus:border-primaryColor rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primaryColor/50 transition-all shadow-inner hover:bg-black/30 resize-none"
              value={formData.biography}
              onChange={handleChange}
              placeholder="Tiểu sử diễn viên..."
            />
          </div>

          {/* Ngày sinh / Ngày mất */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Ngày sinh" name="birthday" icon={FiCalendar} type="date" value={formData.birthday} onChange={handleChange} />
            <FormField label="Ngày mất (nếu có)" name="deathday" type="date" value={formData.deathday} onChange={handleChange} />
          </div>

          {/* Quê quán */}
          <FormField label="Quê quán" name="place_of_birth" icon={FiMapPin} value={formData.place_of_birth} onChange={handleChange} placeholder="VD: Seoul, South Korea" />

          {/* Bộ phận nổi tiếng */}
          <ChipSelector
            label="Bộ phận nổi tiếng"
            icon={FiFilm}
            name="knownForDepartment"
            options={[
              { value: "Acting", label: "Diễn xuất" },
              { value: "Directing", label: "Đạo diễn" },
              { value: "Writing", label: "Biên kịch" },
              { value: "Production", label: "Sản xuất" },
              { value: "Camera", label: "Quay phim" },
            ]}
            value={formData.knownForDepartment}
            onChange={handleChange}
          />

          {/* Roles */}
          <ChipSelector
            label="Vai trò trong hệ thống"
            icon={FiUser}
            name="roles"
            multiple
            options={[
              { value: "actor", label: "Diễn viên" },
              { value: "director", label: "Đạo diễn" },
            ]}
            value={formData.roles}
            onChange={handleChange}
          />

          {/* Also Known As */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
              <FiUser className="text-primaryColor" /> Tên khác (Aliases)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-black/20 border border-white/5 focus:border-primaryColor rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primaryColor/50 transition-all"
                placeholder="Thêm tên khác..."
                value={alsoKnownAsInput}
                onChange={(e) => setAlsoKnownAsInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                type="button"
                onClick={handleAddAlias}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm font-medium"
              >
                Thêm
              </button>
            </div>
            {formData.alsoKnownAs && formData.alsoKnownAs.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.alsoKnownAs.map((alias, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs text-gray-300 bg-white/10 px-2 py-1 rounded-lg"
                  >
                    {alias}
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(i)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* TMDb ID / IMDb ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="TMDb ID" name="tmdbId" value={formData.tmdbId} onChange={handleChange} placeholder="ID trên TMDb" error={errors.tmdbId} />
            <FormField label="IMDb ID" name="imdbId" value={formData.imdbId} onChange={handleChange} placeholder="VD: nm0000123" />
          </div>

          {/* Giới tính */}
          <ChipSelector
            label="Giới tính"
            icon={FiUser}
            name="gender"
            options={[
              { value: 0, label: "Không xác định" },
              { value: 1, label: "Nữ" },
              { value: 2, label: "Nam" },
              { value: 3, label: "Non-binary" },
            ]}
            value={formData.gender}
            onChange={(e) => handleChange({ ...e, target: { ...e.target, value: Number(e.target.value) } })}
          />
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all font-medium"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-primaryColor hover:bg-primaryColor/90 text-black font-bold px-6 py-3 rounded-xl shadow-lg shadow-primaryColor/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <BarSpinner size="sm" /> : <FiSave size={18} />}
            {isSubmitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CastFormModal;
