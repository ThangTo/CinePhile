import React from "react";
import EpisodesSection from "./EpisodesSection";
import CastSection from "./CastSection";

const TabContent = ({ activeTab, movie, audioType, onAudioTypeChange }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case "episodes":
        return (
          <EpisodesSection
            movie={movie}
            audioType={audioType}
            onAudioTypeChange={onAudioTypeChange}
          />
        );

      case "cast":
        return <CastSection movie={movie} />;

      case "gallery":
        return (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-gray-100">Gallery</h3>
            <div className="text-gray-400">Gallery content coming soon...</div>
          </div>
        );

      case "recommendations":
        return (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-gray-100">Đề xuất</h3>
            <div className="text-gray-400">Recommendations coming soon...</div>
          </div>
        );

      default:
        return null;
    }
  };

  return <section className="container mx-auto px-4 py-8">{renderTabContent()}</section>;
};

export default TabContent;
