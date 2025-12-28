import React from "react";
import Banner from "components/home-page/BannerHome";
import CategoryChips from "components/home-page/CategoryChips";
import SectionRow from "components/home-page/SectionRow";
import Top10Movie from "components/home-page/Top10Movie";
import ContinueWatching from "components/home-page/ContinueWatching";
import LazySection from "components/common/LazySection";
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

        {/* Continue Watching Section - Only shows when user is authenticated */}
        <LazySection rootMargin="150px">
          <ContinueWatching />
        </LazySection>

        {/* Trending Section - Uses mock data */}
        <LazySection rootMargin="200px">
          <SectionRow title="Phim Đang Thịnh Hành" sectionType="trending" linkHref="/trending" />
        </LazySection>

        {/* New Releases Section - Uses mock data */}
        <LazySection rootMargin="200px">
          <SectionRow
            title="Phim Mới Cập Nhật"
            sectionType="newReleases"
            linkHref="/new-releases"
          />
        </LazySection>

        {/* Top 10 Phim Bộ Hôm Nay */}
        <LazySection rootMargin="200px">
          <Top10Movie title="Top 10 Phim Bộ Hôm Nay" linkHref="/top10" type="series" />
        </LazySection>

        {/* Another Trending Section */}
        <LazySection rootMargin="200px">
          <SectionRow
            title="Mãn Nhãn Với Phim Chiếu Rạp"
            sectionType="trending"
            typeMovies="single"
            linkHref="/cinema"
          />
        </LazySection>

        <LazySection rootMargin="200px">
          <SectionRow title="Gia Đình Là Số 1" linkHref="/family" genre="Gia Đình" />
        </LazySection>

        {/* Top 10 Phim Lẻ Hôm Nay */}
        <LazySection rootMargin="200px">
          <Top10Movie title="Top 10 Phim Lẻ Hôm Nay" linkHref="/top10" type="single" />
        </LazySection>
      </div>

      {/* Quick Admin Login - Development Tool */}
      {/* {process.env.NODE_ENV === "development" && <QuickAdminLogin />} */}
    </div>
  );
};

export default HomePage;
