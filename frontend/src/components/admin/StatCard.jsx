import React from "react";

// Color gradients for stat cards
const COLOR_GRADIENTS = {
  blue: "from-blue-500 to-cyan-500",
  green: "from-green-500 to-emerald-500",
  purple: "from-purple-500 to-pink-500",
  yellow: "from-primaryColor to-hoverPrimaryColor",
  red: "from-red-500 to-rose-500",
};

const StatCard = ({ title, value, icon, color = "blue", trend }) => {
  const isPositive = trend?.startsWith("+");

  return (
    <div className="bg-bgColor3 rounded-xl p-6 border border-white/10 hover:border-primaryColor/50 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${COLOR_GRADIENTS[color]} flex items-center justify-center`}
        >
          <i className={`fa-solid ${icon} text-white text-xl`}></i>
        </div>
        {trend && (
          <span
            className={`text-sm font-semibold ${isPositive ? "text-green-400" : "text-red-400"}`}
          >
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      <p className="text-3xl font-bold text-white">{value.toLocaleString()}</p>
    </div>
  );
};

export default StatCard;
