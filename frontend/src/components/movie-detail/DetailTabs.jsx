import React from "react";

const DetailTabs = ({ activeTab, setActiveTab, movie }) => {
  const tabs = [
    { id: "episodes", label: "Tập phim", hidden: movie?.isHidden }, // Hide if movie is hidden
    // { id: "gallery", label: "Gallery" },
    { id: "cast", label: "Diễn viên" },
    { id: "gallery", label: "Gallery" },
    { id: "recommendations", label: "Đề xuất" },
  ].filter((tab) => !tab.hidden); // Filter out hidden tabs

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
                  active ? "text-primaryColor" : "text-gray-300 hover:text-gray-100",
                ].join(" ")}
              >
                {tab.label}
                {/* gạch chân vàng khi active */}
                <span
                  className={[
                    "absolute left-0 -bottom-[1px] h-[2px] w-full transition-opacity",
                    active ? "bg-primaryColor opacity-100" : "opacity-0",
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
