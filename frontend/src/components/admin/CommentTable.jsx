import React, { useState, useEffect } from "react";
import { commentAPI } from "services/admin.service";
import { BarSpinner } from "components/common/LoadingState";

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
      const response = await commentAPI.getAll({ page, limit: 10, status: status !== 'all' ? status : undefined });
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
      // Update local state to reflect change immediately or reload
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-500">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            pending
          </span>
        );
      case "banned":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-500">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            banned
          </span>
        );
      case "dismissed":
        return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            dismissed
          </span>
        );
      case "allowed": // 'Accepted' in spec, maybe 'active' or 'allowed'
         return (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-500">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            allowed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-bgColor3 rounded-xl border border-white/10 overflow-hidden">
      {/* Filters */}
      <div className="p-6 border-b border-white/10 flex items-center gap-4">
        <button 
          onClick={() => setFilterStatus("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === "all" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}
        >
          Tất cả
        </button>
        <button 
          onClick={() => setFilterStatus("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === "pending" ? "bg-yellow-500/20 text-yellow-500" : "text-gray-400 hover:text-yellow-500"}`}
        >
          Chờ duyệt
        </button>
        <button 
           onClick={() => setFilterStatus("banned")}
           className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === "banned" ? "bg-red-500/20 text-red-500" : "text-gray-400 hover:text-red-500"}`}
        >
          Đã chặn
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bgColor border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase w-1/3">
                BÌNH LUẬN
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                NGƯỜI DÙNG
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                LÝ DO
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                TRẠNG THÁI
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                NGÀY TẠO
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase">
                HÀNH ĐỘNG
              </th>
            </tr>
          </thead>
          <tbody>
            {comments.map((comment) => (
              <tr
                key={comment.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-white text-sm line-clamp-2" title={comment.fullContent}>{comment.content}</p>
                    {comment.flag && (
                      <span className="text-red-500 text-xs font-medium">Flag: {comment.flag}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-sm">{comment.user.name}</span>
                    <span className="text-gray-500 text-xs">Bởi: {comment.user.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-gray-300 text-sm">{comment.reason}</span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(comment.status)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col text-xs text-gray-300">
                    <span>{comment.createdAt.split(" ")[0]}</span>
                    <span>{comment.createdAt.split(" ")[1]}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleStatusUpdate(comment.id, "allowed")}
                      className="px-3 py-1.5 rounded bg-green-500/20 text-green-500 hover:bg-green-500/30 text-xs font-semibold transition-colors"
                    >
                      Cho phép
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(comment.id, "banned")}
                      className="px-3 py-1.5 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30 text-xs font-semibold transition-colors"
                    >
                      Khoá
                    </button>
                    <button
                       onClick={() => handleStatusUpdate(comment.id, "dismissed")}
                       className="px-3 py-1.5 rounded bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 text-xs font-semibold transition-colors"
                    >
                      Bỏ qua
                    </button>


                  </div>
                </td>
              </tr>
            ))}
            {comments.length === 0 && !isLoading && (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

       {/* Loading state */}
       {isLoading && (
        <section className="flex items-center justify-center p-6">
          <BarSpinner />
        </section>
      )}

       {/* Error message */}
       {error && (
        <div className="mx-6 mb-6 mt-4 bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentTable;
