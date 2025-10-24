import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import SiteFooter from "../components/SiteFooter";
import HeroBanner from "../components/movie-detail/BannerDetail";
import MovieInfo from "../components/movie-detail/MovieInfo";
import DetailTabs from "../components/movie-detail/DetailTabs";
import TabContent from "../components/movie-detail/TabContent";
import CommentsSection from "../components/movie-detail/CommentsSection";

const MovieDetail = () => {
  const { id } = useParams();
  const [movie, setMovie] = useState(null);
  const [activeTab, setActiveTab] = useState("episodes");
  const [loading, setLoading] = useState(true);
  const [audioType, setAudioType] = useState("subtitle");

  useEffect(() => {
    // Mock API call - replace with real API
    const fetchMovie = async () => {
      setLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock data matching your screenshots
        const mockMovie = {
          id: id,
          title: "Thần Đèn ơi, Ước Đi",
          englishTitle: "Genie, Make a Wish",
          poster: "https://static.nutscdn.com/vimg/400-0/578c5ff63df52ac7ef86bfc0e84a5638.jpg",
          bgImage:
            "https://occ-0-8407-2219.1.nflxso.net/dnm/api/v6/6AYY37jfdO6hpXcMjf9Yu5cnmO0/AAAABUmHF7rEroC12rrnTE-ZYRohLAssw_9w8Na6w-JHq4UmLB8XuEs_kdgSmG7i99waZcwpY9vfcM8zDZ1WuaeUjznEkWp7_yFvaRjU.jpg?r=7e5",
          rating: 9.0,
          imdb: 6.4,
          ageRating: "T16",
          year: 2025,
          part: "Phần 1",
          episode: "Tập 13",
          totalEpisodes: 13,
          completed: true,
          duration: "1h 00m",
          country: "Hàn Quốc",
          networks: "Netflix",
          production: "CJ ENM, Hwa&Dam Pictures, Studio Dragon",
          director: "Lee Byeong-heon, Kim Eun-sook",
          genres: ["Tình Cảm", "Hài", "Kỳ Ảo", "Lãng Mạn", "Giả Tưởng"],
          synopsis:
            "Câu chuyện kể về một cô gái gặp phải một vị thần đèn và được ban cho những điều ước. Tuy nhiên, mỗi điều ước đều mang theo những hậu quả không ngờ tới, khiến cô phải đối mặt với những thử thách và bài học cuộc sống.",
          cast: [
            {
              name: "Kim Woo-bin",
              avatar: "https://image.tmdb.org/t/p/w500/AjMMxxWbTNdafyWuY41xAHFPVou.jpg",
            },
            {
              name: "Bae Suzy",
              avatar: "https://image.tmdb.org/t/p/w500/67YkqSOk6LSAoM6WzSeXgerM7nD.jpg",
            },
            {
              name: "Ahn Eun-jin",
              avatar: "https://image.tmdb.org/t/p/w500/3hJo6gErp1Ml8kasgmFYMtcMg9B.jpg",
            },
            {
              name: "Steve Sanghyun Noh",
              avatar: "https://image.tmdb.org/t/p/w500/wdevvu2YLIvAPVEkScjO9JGbioq.jpg",
            },
            {
              name: "Go Gyu-pil",
              avatar: "https://image.tmdb.org/t/p/w500/uP18ldneBx5WcmHmvwoyGVSBArY.jpg",
            },
            {
              name: "Lee Joo-young",
              avatar: "https://image.tmdb.org/t/p/w500/hDLNWV75lnH1zC8DYXnaFfIllvI.jpg",
            },
            {
              name: "Kim Mi-kyeong",
              avatar: "https://image.tmdb.org/t/p/w500/bJLkarteB2O0duu5ABvM5QFRuax.jpg",
            },
          ],
          episodes: Array.from({ length: 13 }, (_, i) => ({
            id: i + 1,
            title: `Tập ${i + 1}`,
            duration: "45m",
          })),
          comments: [
            {
              id: 1,
              user: "sooyeuoii",
              avatar: "https://banobagi.vn/wp-content/uploads/2025/04/anh-dai-dien-2.jpg",
              time: "2 giờ trước",
              content:
                "hay quá bây ơi, đó h t thấy Suzy bthg mà coi hết phim này mê ẻm quá trời, con gái nhà ai mà xinhh iuu vữ vội",
              likes: 24,
              replies: 3,
            },
            {
              id: 2,
              user: "Mê phim",
              avatar:
                "https://m.yodycdn.com/blog/anh-dai-dien-hai-yodyvn3-b3a8cf32-e08a-47fc-a741-71626aadc4de.jpg",
              time: "8 giờ trước",
              episode: "P.1 - Tập 13",
              content: "Xem phim này rất hay, tôi rất thích",
              likes: 12,
              replies: 1,
            },
          ],
        };

        setMovie(mockMovie);
      } catch (error) {
        console.error("Error fetching movie:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center">
        <div className="text-xl">Đang tải...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Không tìm thấy phim</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <HeroBanner movie={movie} />
      <MovieInfo movie={movie} />
      <DetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <TabContent
        activeTab={activeTab}
        movie={movie}
        audioType={audioType}
        onAudioTypeChange={setAudioType}
      />
      <CommentsSection movie={movie} />
      <SiteFooter />
    </div>
  );
};

export default MovieDetail;
