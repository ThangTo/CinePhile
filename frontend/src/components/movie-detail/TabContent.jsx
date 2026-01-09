import React from "react";
import EpisodesSection from "./EpisodesSection";
import CastSection from "./CastSection";
import GallerySection from "./GallerySection";
import RecommendationsSection from "../general/RecommendationsSection";

const TabContent = ({ activeTab, movie, audioType, onAudioTypeChange, onPartChange }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case "episodes":
        return (
          <EpisodesSection
            movie={movie}
            audioType={audioType}
            onAudioTypeChange={onAudioTypeChange}
            onPartChange={onPartChange}
          />
        );

      case "cast":
        return <CastSection movie={movie} title={false} layout="detail" />;

      case "gallery":
        return <GallerySection movie={movie} />;

      case "recommendations":
        return <RecommendationsSection movie={movie} />;

      default:
        return null;
    }
  };

  return <section className="container mx-auto px-4 py-2">{renderTabContent()}</section>;
};

export default TabContent;
