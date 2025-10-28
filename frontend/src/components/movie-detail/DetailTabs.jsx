import React from "react";

const DetailTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "episodes", label: "Tập phim" },
    { id: "gallery", label: "Gallery" },
    { id: "cast", label: "Diễn viên" },
    { id: "recommendations", label: "Đề xuất" },
  ];

  return (
    <section className="container mx-auto px-4">
      <div className="border-b border-white/10">
        <div className="flex gap-10">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "relative py-4 text-sm font-medium transition-colors",
                  active ? "text-amber-400" : "text-gray-300 hover:text-gray-100",
                ].join(" ")}
              >
                {tab.label}
                {/* gạch chân vàng khi active */}
                <span
                  className={[
                    "absolute left-0 -bottom-[1px] h-[2px] w-full transition-opacity",
                    active ? "bg-amber-400 opacity-100" : "opacity-0",
                  ].join(" ")}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DetailTabs;
