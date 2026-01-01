import React, { useState } from "react";
import notificationService from "services/notification.service";
import { userAPI } from "services/admin.service";
import {
  FiBell,
  FiType,
  FiAlignLeft,
  FiUsers,
  FiUser,
  FiMail,
  FiFilm,
  FiLink,
  FiSend,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

// Helper component cho Input field để code gọn hơn
const InputGroup = ({ label, icon: Icon, children }) => (
  <div className="flex flex-col gap-2">
    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-primaryColor" />} {label}
    </label>
    {children}
  </div>
);

const AdminNotificationTab = () => {
  // --- GIỮ NGUYÊN LOGIC CŨ ---
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    type: "system",
    target: "all", // "all" | "user"
    userEmail: "",
    movieId: "",
    targetUrl: "",
  });
  const [notificationError, setNotificationError] = useState("");
  const [notificationSuccess, setNotificationSuccess] = useState("");

  const handleNotificationChange = (e) => {
    const { name, value } = e.target;
    setNotificationForm((prev) => ({ ...prev, [name]: value }));
    setNotificationError("");
    setNotificationSuccess("");
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    setNotificationError("");
    setNotificationSuccess("");

    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      setNotificationError("Tiêu đề và nội dung không được để trống");
      return;
    }

    if (notificationForm.target === "user" && !notificationForm.userEmail.trim()) {
      setNotificationError("Cần nhập email khi gửi cho người dùng cụ thể");
      return;
    }

    let resolvedUserId = null;
    if (notificationForm.target === "user") {
      try {
        const usersRes = await userAPI.getAll({
          search: notificationForm.userEmail.trim(),
          limit: 1,
        });
        const user =
          (usersRes?.data && Array.isArray(usersRes.data) && usersRes.data[0]) ||
          (Array.isArray(usersRes) && usersRes[0]) ||
          null;
        if (!user) {
          setNotificationError("Không tìm thấy người dùng với email này");
          return;
        }
        resolvedUserId = user.id || user._id;
        if (!resolvedUserId) {
          setNotificationError("Không lấy được userId từ kết quả tìm kiếm");
          return;
        }
      } catch (lookupErr) {
        const msg =
          lookupErr?.response?.data?.message || lookupErr?.message || "Không thể tìm người dùng";
        setNotificationError(msg);
        return;
      }
    }

    const payload = {
      title: notificationForm.title.trim(),
      message: notificationForm.message.trim(),
      type: notificationForm.type || "system",
      userId: notificationForm.target === "user" ? resolvedUserId : null,
      movieId: notificationForm.movieId.trim() || null,
      targetUrl: notificationForm.targetUrl.trim() || null,
    };

    setIsSendingNotification(true);
    try {
      await notificationService.create(payload);
      setNotificationSuccess("Đã gửi thông báo thành công");
      setNotificationForm((prev) => ({
        ...prev,
        title: "",
        message: "",
        userEmail: "",
        movieId: "",
        targetUrl: "",
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Gửi thông báo thất bại";
      setNotificationError(msg);
    } finally {
      setIsSendingNotification(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in pb-10">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <span className="bg-primaryColor/20 p-2 rounded-lg text-primaryColor">
              <FiBell className="w-6 h-6" />
            </span>
            Quản Lý Thông Báo
          </h1>
          <p className="text-gray-400 text-sm pl-1">
            Gửi thông báo đẩy đến toàn bộ hệ thống hoặc cá nhân người dùng CinePhine.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái: Form chính */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleNotificationSubmit}
            className="bg-bgColor3 border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primaryColor/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Thông báo lỗi/thành công */}
            {(notificationError || notificationSuccess) && (
              <div
                className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  notificationError
                    ? "bg-red-500/10 border-red-500/50 text-red-200"
                    : "bg-green-500/10 border-green-500/50 text-green-200"
                }`}
              >
                {notificationError ? <FiAlertCircle size={20} /> : <FiCheckCircle size={20} />}
                <span className="font-medium text-sm">
                  {notificationError || notificationSuccess}
                </span>
              </div>
            )}

            <div className="space-y-6">
              {/* Row 1: Title & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputGroup label="Tiêu đề thông báo *" icon={FiType}>
                  <input
                    name="title"
                    value={notificationForm.title}
                    onChange={handleNotificationChange}
                    className="w-full bg-bgColor border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor transition-all placeholder-gray-600"
                    placeholder="Ví dụ: Bảo trì hệ thống..."
                  />
                </InputGroup>

                <InputGroup label="Loại thông báo" icon={FiInfo}>
                  <div className="relative">
                    <select
                      name="type"
                      value={notificationForm.type}
                      onChange={handleNotificationChange}
                      className="w-full bg-bgColor border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor appearance-none cursor-pointer"
                    >
                      <option value="system">Hệ thống (System)</option>
                      <option value="movie_update">Cập nhật phim (Movie Update)</option>
                      <option value="new_episode">Tập mới (New Episode)</option>
                      <option value="comment_reply">Phản hồi bình luận</option>
                      <option value="payment">Thanh toán (Payment)</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </InputGroup>
              </div>

              {/* Row 2: Message */}
              <InputGroup label="Nội dung chi tiết *" icon={FiAlignLeft}>
                <textarea
                  name="message"
                  value={notificationForm.message}
                  onChange={handleNotificationChange}
                  rows={5}
                  className="w-full bg-bgColor border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor transition-all resize-none placeholder-gray-600 leading-relaxed"
                  placeholder="Nhập nội dung thông báo sẽ hiển thị đến người dùng..."
                ></textarea>
              </InputGroup>

              <div className="border-t border-white/10 my-6"></div>

              {/* Row 3: Target Selection (Custom Cards) */}
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-primaryColor" /> Đối tượng nhận tin
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card: All Users */}
                  <div
                    onClick={() => setNotificationForm((prev) => ({ ...prev, target: "all" }))}
                    className={`cursor-pointer rounded-xl p-4 border transition-all flex items-center gap-4 ${
                      notificationForm.target === "all"
                        ? "bg-primaryColor/10 border-primaryColor ring-1 ring-primaryColor/50"
                        : "bg-bgColor border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-full ${
                        notificationForm.target === "all"
                          ? "bg-primaryColor text-black"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      <FiUsers size={20} />
                    </div>
                    <div>
                      <h4
                        className={`font-semibold ${
                          notificationForm.target === "all" ? "text-primaryColor" : "text-white"
                        }`}
                      >
                        Toàn bộ người dùng
                      </h4>
                      <p className="text-xs text-gray-500">Gửi Broadcast đến tất cả user</p>
                    </div>
                  </div>

                  {/* Card: Specific User */}
                  <div
                    onClick={() => setNotificationForm((prev) => ({ ...prev, target: "user" }))}
                    className={`cursor-pointer rounded-xl p-4 border transition-all flex items-center gap-4 ${
                      notificationForm.target === "user"
                        ? "bg-primaryColor/10 border-primaryColor ring-1 ring-primaryColor/50"
                        : "bg-bgColor border-white/10 hover:border-white/30"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-full ${
                        notificationForm.target === "user"
                          ? "bg-primaryColor text-black"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      <FiUser size={20} />
                    </div>
                    <div>
                      <h4
                        className={`font-semibold ${
                          notificationForm.target === "user" ? "text-primaryColor" : "text-white"
                        }`}
                      >
                        Người dùng cụ thể
                      </h4>
                      <p className="text-xs text-gray-500">Chỉ gửi cho email được chỉ định</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditional Row: Email (Only show if target is user) */}
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  notificationForm.target === "user" ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <InputGroup label="Email người nhận" icon={FiMail}>
                  <input
                    name="userEmail"
                    value={notificationForm.userEmail}
                    onChange={handleNotificationChange}
                    className="w-full bg-bgColor border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primaryColor placeholder-gray-600"
                    placeholder="nhap_email_user@example.com"
                  />
                </InputGroup>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSendingNotification}
                  className="relative group overflow-hidden rounded-xl bg-primaryColor px-8 py-3.5 text-black font-bold shadow-lg shadow-primaryColor/20 transition-all hover:shadow-primaryColor/40 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <div className="relative flex items-center gap-2">
                    {isSendingNotification ? (
                      <>
                        <svg
                          className="animate-spin h-5 w-5 text-black"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span>Đang gửi...</span>
                      </>
                    ) : (
                      <>
                        <FiSend className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        <span>Gửi Thông Báo</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Cột phải: Thông tin bổ sung (Metadata) - Hidden per requirement */}
        <div className="lg:col-span-1">
          <div className="bg-bgColor3 border border-white/5 rounded-2xl p-6 shadow-lg sticky top-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiLink className="text-primaryColor" />
              Metadata (Tuỳ chọn)
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Gắn kèm liên kết hoặc ID phim để người dùng chuyển hướng ngay khi nhấn vào thông báo.
            </p>

            <div className="space-y-5">
              <InputGroup label="Movie ID" icon={FiFilm}>
                <input
                  name="movieId"
                  value={notificationForm.movieId}
                  onChange={handleNotificationChange}
                  className="w-full bg-bgColor border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primaryColor placeholder-gray-600"
                  placeholder="ObjectId phim (nếu có)"
                />
              </InputGroup>

              <InputGroup label="Target URL" icon={FiLink}>
                <input
                  name="targetUrl"
                  value={notificationForm.targetUrl}
                  onChange={handleNotificationChange}
                  className="w-full bg-bgColor border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primaryColor placeholder-gray-600"
                  placeholder="/movie/slug-name"
                />
              </InputGroup>

              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-200 leading-relaxed">
                  <span className="font-bold">Mẹo:</span> Nếu nhập <strong>Movie ID</strong>, hệ
                  thống sẽ ưu tiên mở trang chi tiết phim. Nếu nhập <strong>Target URL</strong>,
                  người dùng sẽ được điều hướng đến trang đó.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationTab;
