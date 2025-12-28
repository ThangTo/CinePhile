import React, { useState, useEffect } from "react";
import { commentAPI } from "services/admin.service";
import { BarSpinner } from "components/common/LoadingState";
// Import Icons
import { 
  FiCheck, 
  FiTrash2, 
  FiEyeOff, 
  FiAlertCircle, 
  FiMessageSquare,
  FiUser,
  FiClock,
  FiFilter,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

const CommentTable = () => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });

  const loadComments = async (page = 1, status = "all") => {
    setIsLoading(true);
    try {
      const response = await commentAPI.getAll({ 
        page, 
        limit: 10, 
        status: status !== 'all' ? status : undefined 
      });
      if (response && response.data) {
        setComments(response.data);
        setPagination({
          currentPage: response.pagination.page,
          totalPages: response.pagination.totalPages,
          totalItems: response.pagination.totalItems,
          limit: response.pagination.limit
        });
      }
    } catch (err) {
      console.error("API Error", err);
      setError("Không thể tải danh sách bình luận");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments(1, filterStatus);
  }, [filterStatus]);

  const handleStatusUpdate = async (id, newStatus) => {
    setIsLoading(true);
    try {
      await commentAPI.updateStatus(id, newStatus);
      setComments(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      setError("Không thể cập nhật trạng thái: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này vĩnh viễn?")) return;
    setIsLoading(true);
    try {
      await commentAPI.delete(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      setError("Không thể xóa bình luận: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper: Tạo avatar từ tên user
  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      banned: "bg-red-500/10 text-red-500 border-red-500/20",
      dismissed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      allowed: "bg-green-500/10 text-green-500 border-green-500/20",
    };

    const labels = {
      pending: "Chờ duyệt",
      banned: "Đã chặn",
      dismissed: "Đã ẩn",
      allowed: "Hoạt động",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${styles[status] || styles.dismissed}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status === 'allowed' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-current'}`}></span>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 shadow-xl flex flex-col h-full">
      
      {/* --- HEADER & FILTERS --- */}
      <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FiMessageSquare className="text-primaryColor" />
          Quản lý Bình luận
        </h2>
        
        <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
          {[
            { id: "all", label: "Tất cả" },
            { id: "pending", label: "Chờ duyệt" },
            { id: "allowed", label: "Đã duyệt" }, // Thêm tab nếu muốn
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                filterStatus === tab.id
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- ERROR MESSAGE --- */}
      {error && (
        <div className="mx-5 mt-5 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <FiAlertCircle />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="hover:text-white transition-colors">
            ✕
          </button>
        </div>
      )}

      {/* --- TABLE CONTENT --- */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nội dung / Lý do</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Người dùng</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Thời gian</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Hành động</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-white/5">
            {isLoading && comments.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-20 text-center">
                  <BarSpinner />
                </td>
              </tr>
            ) : comments.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-16 text-center text-gray-500 flex flex-col items-center justify-center">
                  <FiMessageSquare className="text-4xl mb-3 opacity-20" />
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              comments.map((comment) => (
                <tr key={comment.id} className="group hover:bg-white/[0.02] transition-colors">
                  
                  {/* Cột Nội Dung */}
                  <td className="px-6 py-4 max-w-sm">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm text-gray-200 line-clamp-2 leading-relaxed" title={comment.fullContent}>
                        {comment.content}
                      </p>
                      <div className="flex items-center gap-2">
                        {comment.flag && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                            <FiAlertCircle className="w-3 h-3" /> Flag: {comment.flag}
                          </span>
                        )}
                        {comment.reason && (
                          <span className="text-xs text-gray-500 italic flex items-center gap-1">
                             • Lý do: {comment.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Cột Người Dùng */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-white/10 text-xs font-bold text-white">
                        {getInitials(comment.user.name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{comment.user.name}</span>
                        <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                          <FiUser className="w-2.5 h-2.5" /> {comment.user.role}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Cột Trạng Thái */}
                  <td className="px-6 py-4">
                    {getStatusBadge(comment.status)}
                  </td>

                  {/* Cột Thời Gian */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-xs text-gray-400">
                      <span className="text-gray-300 font-medium">{comment.createdAt.split(" ")[0]}</span>
                      <span className="flex items-center gap-1 mt-0.5">
                        <FiClock className="w-3 h-3" /> {comment.createdAt.split(" ")[1]}
                      </span>
                    </div>
                  </td>

                  {/* Cột Hành Động (Icons) */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      
                      <button
                        onClick={() => handleStatusUpdate(comment.id, "allowed")}
                        title="Chấp nhận"
                        className="p-2 rounded-lg text-green-500 hover:bg-green-500/10 hover:scale-110 transition-all"
                      >
                        <FiCheck size={18} />
                      </button>

                      <button
                        onClick={() => handleStatusUpdate(comment.id, "dismissed")}
                        title="Ẩn bình luận"
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 hover:scale-110 transition-all"
                      >
                        <FiEyeOff size={18} />
                      </button>

                      <div className="w-px h-4 bg-white/10 mx-1"></div>

                      <button
                        onClick={() => handleDelete(comment.id)}
                        title="Xóa vĩnh viễn / Chặn"
                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 hover:scale-110 transition-all"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- FOOTER / PAGINATION --- */}
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
        <div className="text-xs text-gray-500">
          Hiển thị <span className="text-white font-bold">{comments.length}</span> trên tổng <span className="text-white font-bold">{pagination.totalItems}</span> bình luận
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadComments(pagination.currentPage - 1, filterStatus)}
            disabled={pagination.currentPage === 1}
            className="p-1.5 rounded-md hover:bg-white/5 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <FiChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-1">
             {/* Giả lập pagination logic đơn giản */}
             {Array.from({ length: pagination.totalPages > 5 ? 5 : pagination.totalPages }, (_, i) => {
               const pageNum = i + 1; // Logic thực tế cần complex hơn
               return (
                 <button
                   key={pageNum}
                   onClick={() => loadComments(pageNum, filterStatus)}
                   className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${
                     pagination.currentPage === pageNum
                       ? "bg-primaryColor text-white shadow-sm"
                       : "text-gray-400 hover:bg-white/5 hover:text-white"
                   }`}
                 >
                   {pageNum}
                 </button>
               )
             })}
          </div>

          <button 
            onClick={() => loadComments(pagination.currentPage + 1, filterStatus)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="p-1.5 rounded-md hover:bg-white/5 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

    </div>
  );
};

export default CommentTable;