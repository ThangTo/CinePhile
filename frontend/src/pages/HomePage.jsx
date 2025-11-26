import React from "react";
import Banner from "components/home-page/BannerHome";
import CategoryChips from "components/home-page/CategoryChips";
import SectionRow from "components/home-page/SectionRow";
import Top10Movie from "components/home-page/Top10Movie";
// import QuickAdminLogin from "components/general/QuickAdminLogin";

/**
 * Home Page
 * Uses mock data from SectionRow component via sectionType prop
 */
const HomePage = () => {
  return (
    <div className="min-h-screen bg-bgColor overflow-visible">
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

      {/* Quick Admin Login - Development Tool */}
      {/* {process.env.NODE_ENV === "development" && <QuickAdminLogin />} */}
    </div>
  );
};

export default HomePage;
