import React, { useState, useEffect, useCallback } from "react";
import { paymentAPI } from "services/admin.service";
import { settingsAPI } from "services/admin.service";
import { BarSpinner } from "components/common/LoadingState";
import Select from "components/common/Select";
import StatCard from "./StatCard";
import PaginationV2 from "components/common/PaginationV2";
import { FiDollarSign, FiRefreshCw, FiSearch, FiFilter, FiX } from "react-icons/fi";

const PAYMENT_STATUSES = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "PENDING" },
  { value: "PROCESSING", label: "PROCESSING" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILED", label: "FAILED" },
  { value: "CANCELLED", label: "CANCELLED" },
];

const STATUS_BADGE = {
  SUCCESS: "bg-green-500/20 text-green-400 border-green-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  PROCESSING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  CANCELLED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const LIMIT = 20;

const formatCurrency = (value) => {
  if (value == null) return "0";
  return Number(value).toLocaleString("vi-VN");
};

const formatDateTime = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminPaymentsTab = () => {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [packageId, setPackageId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [packages, setPackages] = useState([]);

  const [paymentEnabled, setPaymentEnabled] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);
  const [togglingConfig, setTogglingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    setStatsLoading(true);
    paymentAPI
      .getStats()
      .then((res) => setStats(res?.data || null))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    setConfigLoading(true);
    paymentAPI
      .getConfig()
      .then((res) => setPaymentEnabled(res?.enabled !== false))
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, []);

  const handleTogglePayment = async () => {
    const nextEnabled = !paymentEnabled;
    setTogglingConfig(true);
    setConfigMessage({ type: "", text: "" });
    try {
      const res = await paymentAPI.updateConfig(nextEnabled);
      setPaymentEnabled(res?.enabled !== false ? res.enabled : nextEnabled);
      setConfigMessage({
        type: "success",
        text: nextEnabled ? "Đã mở chuyển khoản." : "Đã khóa chuyển khoản.",
      });
      setTimeout(() => setConfigMessage({ type: "", text: "" }), 3000);
    } catch (err) {
      setConfigMessage({ type: "error", text: err?.message || "Không thể cập nhật trạng thái." });
    } finally {
      setTogglingConfig(false);
    }
  };

  useEffect(() => {
    settingsAPI
      .getCoinPackages()
      .then((res) =>
        setPackages(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [])
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT };
      if (status) params.status = status;
      if (search) params.search = search;
      if (packageId) params.packageId = packageId;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await paymentAPI.getTransactions(params);
      setTransactions(Array.isArray(res?.data) ? res.data : []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotal(res?.pagination?.total || 0);
    } catch (err) {
      setError(err?.message || "Không thể tải danh sách giao dịch.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, packageId, from, to, page]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleApply = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClear = () => {
    setStatus("");
    setSearchInput("");
    setSearch("");
    setPackageId("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const handleRefresh = () => {
    loadTransactions();
    paymentAPI
      .getStats()
      .then((res) => setStats(res?.data || null))
      .catch(() => {});
  };

  const hasFilters = status || search || packageId || from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <FiDollarSign className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Người Nạp Tiền</h1>
            <p className="text-sm text-gray-400">Quản lý giao dịch nạp coin</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl border border-white/10 transition-all text-sm"
        >
          <FiRefreshCw className="w-4 h-4" />
          Tải lại
        </button>
      </div>

      {/* Payment Toggle */}
      <div className="bg-bgColor3 rounded-xl p-4 border border-white/10 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-white font-medium">Chuyển khoản ngân hàng</h3>
          <p className="text-gray-500 text-xs mt-1">
            Tắt để tạm khóa nạp tiền qua chuyển khoản trên toàn hệ thống.
          </p>
          {!paymentEnabled && !configLoading && (
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-500/20 text-red-400 border-red-500/30">
              Đang khóa nạp tiền
            </span>
          )}
          {configMessage.text && (
            <p
              className={`text-xs mt-2 ${
                configMessage.type === "error" ? "text-red-400" : "text-green-400"
              }`}
            >
              {configMessage.text}
            </p>
          )}
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={paymentEnabled}
            disabled={configLoading || togglingConfig}
            onChange={handleTogglePayment}
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          <span className="ml-3 text-sm font-medium text-gray-300 w-20">
            {paymentEnabled ? "Đang mở" : "Đang khóa"}
          </span>
        </label>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-bgColor3 rounded-xl p-6 border border-white/10 animate-pulse"
            >
              <div className="h-10 w-10 bg-white/5 rounded-lg mb-4" />
              <div className="h-4 w-24 bg-white/5 rounded mb-2" />
              <div className="h-8 w-32 bg-white/5 rounded" />
            </div>
          ))
        ) : stats ? (
          <>
            <StatCard
              title="Tổng doanh thu"
              value={`${formatCurrency(stats.totalRevenue)} ₫`}
              icon="fa-coins"
              color="yellow"
            />
            <StatCard
              title="Tổng coin đã phát hành"
              value={formatCurrency(stats.totalCoin)}
              icon="fa-coins"
              color="blue"
            />
            <StatCard
              title="Số người đã nạp"
              value={stats.paidUserCount}
              icon="fa-users"
              color="purple"
            />
            <StatCard
              title="Giao dịch thành công"
              value={stats.successCount}
              icon="fa-check-circle"
              color="green"
            />
          </>
        ) : null}
      </div>

      <p className="text-xs text-gray-500 italic">
        * Thống kê toàn thời gian, chỉ tính đơn thành công (SUCCESS)
      </p>

      {/* Filters */}
      <div className="bg-bgColor3 rounded-xl p-4 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <FiFilter className="w-4 h-4" />
          Bộ lọc
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={PAYMENT_STATUSES}
            placeholder="Trạng thái"
            size="sm"
            bgColor="bg-bgColor"
            bgDropdown="bg-bgColor"
            width="w-full"
          />

          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm user (tên/email)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-bgColor text-white text-sm border border-white/10 rounded-lg pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-primaryColor/50 placeholder-gray-500"
            />
          </div>

          <Select
            value={packageId}
            onChange={(v) => {
              setPackageId(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "Tất cả gói" },
              ...packages.map((pkg) => ({
                value: pkg.id || pkg.packageId || pkg._id,
                label: pkg.label || pkg.name || `${pkg.amount || 0} coin`,
              })),
            ]}
            placeholder="Chọn gói"
            size="sm"
            bgColor="bg-bgColor"
            bgDropdown="bg-bgColor"
            width="w-full"
          />

          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="bg-bgColor text-white text-sm border border-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primaryColor/50"
          />

          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="bg-bgColor text-white text-sm border border-white/10 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primaryColor/50"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApply}
            className="px-4 py-1.5 bg-primaryColor text-black text-sm font-medium rounded-lg hover:opacity-90 transition-all"
          >
            Áp dụng
          </button>
          {hasFilters && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-4 py-1.5 bg-white/5 text-gray-300 text-sm rounded-lg hover:bg-white/10 transition-all"
            >
              <FiX className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-bgColor3 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <BarSpinner />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FiSearch className="w-12 h-12 text-red-400/50 mb-3" />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={loadTransactions}
              className="mt-3 px-4 py-1.5 bg-white/5 text-gray-300 text-sm rounded-lg hover:bg-white/10 transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FiDollarSign className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 text-sm">Không có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-4 font-medium">Người dùng</th>
                  <th className="text-left py-3 px-4 font-medium">Mã đơn</th>
                  <th className="text-left py-3 px-4 font-medium">Gói</th>
                  <th className="text-right py-3 px-4 font-medium">Số tiền</th>
                  <th className="text-right py-3 px-4 font-medium">Coin</th>
                  <th className="text-center py-3 px-4 font-medium">Trạng thái</th>
                  <th className="text-right py-3 px-4 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const user = tx.user || {};
                  const pkg = packages.find((p) => (p.id || p.packageId || p._id) === tx.packageId);
                  return (
                    <tr
                      key={tx._id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={user.avatar || "/default-avatar.png"}
                            alt={user.username || user.name || "User"}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0 bg-white/5"
                            onError={(e) => {
                              e.target.src = "/default-avatar.png";
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate max-w-[140px]">
                              {user.username || user.name || "N/A"}
                            </p>
                            <p className="text-gray-500 text-xs truncate max-w-[140px]">
                              {user.email || ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-gray-300 text-xs">
                          {tx.orderCode || "--"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-300">
                          {pkg?.label || pkg?.name || tx.packageId || "--"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-white font-medium">
                          {formatCurrency(tx.amount)} ₫
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-yellow-400">
                          {formatCurrency(tx.coinAmount || 0)}
                          {tx.bonusCoin > 0 && (
                            <span className="text-green-400 text-xs ml-1">
                              +{formatCurrency(tx.bonusCoin)}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            STATUS_BADGE[tx.status] || STATUS_BADGE.PENDING
                          }`}
                        >
                          {tx.status || "PENDING"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-gray-400 text-xs whitespace-nowrap">
                          {formatDateTime(tx.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Tổng số: {total} giao dịch</p>
          <PaginationV2 page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default AdminPaymentsTab;
