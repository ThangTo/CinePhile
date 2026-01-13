import React from "react";
import DetailTabs from "./DetailTabs";
import TabContent from "./TabContent";
import CommentsSection from "./CommentsSection";

/**
 * Reusable content component for both mobile and desktop views
 * Handles tabs, tab content, and comments section
 */
const MovieDetailContent = ({
  movie,
  activeTab,
  setActiveTab,
  audioType,
  onAudioTypeChange,
  commentsSectionClass = "",
  onPartChange,
}) => {
  return (
    <>
      <DetailTabs activeTab={activeTab} setActiveTab={setActiveTab} movie={movie} />

      <TabContent
        activeTab={activeTab}
        movie={movie}
        audioType={audioType}
        onAudioTypeChange={onAudioTypeChange}
        onPartChange={onPartChange}
      />

      <CommentsSection movie={movie} className={commentsSectionClass} />
    </>
  );
};

export default MovieDetailContent;
