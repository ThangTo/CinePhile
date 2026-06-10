import React from "react";
import { Link } from "react-router-dom";
import { getPremiumSummary } from "utils/premiumUtils";

const PremiumStatusSummary = ({ user, className = "", showAction = true }) => {
  const summary = getPremiumSummary(user);
  const isActive = summary.isActive;

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        isActive
          ? "border-primaryColor/30 bg-primaryColor/10"
          : "border-white/10 bg-white/[0.03]"
      } ${className}`}
    >
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              isActive ? "bg-primaryColor text-black" : "bg-white/10 text-primaryColor"
            }`}
          >
            <i className={`fa-solid ${isActive ? "fa-crown" : "fa-star"}`} />
          </span>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
              Trạng thái Premium
            </p>
            <h3 className={`mt-1 text-lg font-bold ${isActive ? "text-primaryColor" : "text-white"}`}>
              {summary.title}
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {isActive
                ? `Còn ${summary.remainingDays} ngày, hết hạn ${summary.expiresAtLabel}`
                : "Bạn chưa kích hoạt gói Premium."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm md:min-w-[320px]">
          <div className="rounded-xl bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Gói</p>
            <p className="mt-1 font-semibold text-white">
              {isActive ? summary.title : "Free"}
            </p>
          </div>
          <div className="rounded-xl bg-black/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Còn lại</p>
            <p className={`mt-1 font-semibold ${isActive ? "text-primaryColor" : "text-gray-300"}`}>
              {isActive ? `${summary.remainingDays} ngày` : "0 ngày"}
            </p>
          </div>
          {isActive && (
            <div className="col-span-2 rounded-xl bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Ngày hết hạn</p>
              <p className="mt-1 font-semibold text-white">{summary.expiresAtLabel}</p>
            </div>
          )}
        </div>

        {showAction && (
          <Link
            to="/premium"
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
              isActive
                ? "bg-black/25 text-primaryColor hover:bg-black/35"
                : "bg-primaryColor text-black hover:bg-hoverPrimaryColor"
            }`}
          >
            <i className={`fa-solid ${isActive ? "fa-gear" : "fa-crown"}`} />
            {isActive ? "Quản lý gói" : "Mở Premium"}
          </Link>
        )}
      </div>
    </div>
  );
};

export default PremiumStatusSummary;
