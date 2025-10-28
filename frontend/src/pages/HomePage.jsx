import React from "react";
import Header from "../components/Header";
import Banner from "../components/BannerHome";
import CategoryChips from "../components/CategoryChips";
import SectionRow from "../components/SectionRow";
import Top10Movie from "../components/Top10Movie";
import SiteFooter from "../components/SiteFooter";

/**
 * Home Page
 * Uses mock data from SectionRow component via sectionType prop
 */
const HomePage = () => {
  return (
    <div className="min-h-screen bg-bgColor overflow-visible">
      <Header />
      <Banner />
      <div className="py-8 sm:py-12 bg-bgColor overflow-visible">
        <CategoryChips />

        {/* Trending Section - Uses mock data */}
        <SectionRow title="Phim Đang Thịnh Hành" sectionType="trending" linkHref="/trending" />

        {/* New Releases Section - Uses mock data */}
        <SectionRow title="Phim Mới Cập Nhật" sectionType="newReleases" linkHref="/new-releases" />

        {/* Top 10 Section */}
        <Top10Movie />

        {/* Another Trending Section */}
        <SectionRow title="Mãn Nhãn Với Phim Chiếu Rạp" sectionType="trending" linkHref="/cinema" />
      </div>

      <SiteFooter />
    </div>
  );
};

export default HomePage;
