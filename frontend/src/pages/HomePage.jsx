import React from "react";
import Header from "../components/Header";
import MovieCard from "../components/MovieCard";
import Banner from "../components/BannerHome";
import CategoryChips from "../components/CategoryChips";
import SectionRow from "../components/SectionRow";
import Top10Row from "../components/Top10Row";
import SiteFooter from "../components/SiteFooter";

// Dữ liệu phim giả để test
const dummyMovies = [
  {
    id: 1,
    title: "Lật Mặt 7: Một Điều Ước",
    year: 2024,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
  {
    id: 2,
    title: "Godzilla x Kong: The New Empire",
    year: 2024,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
  {
    id: 3,
    title: "Doraemon: Nobita's Earth Symphony",
    year: 2024,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
  {
    id: 4,
    title: "Kung Fu Panda 4",
    year: 2024,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
  // Thêm vài phim nữa ở đây
  {
    id: 5,
    title: "Phim Số 5",
    year: 2023,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
  {
    id: 6,
    title: "Phim Số 6",
    year: 2023,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
  {
    id: 7,
    title: "Phim Số 7",
    year: 2023,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
  {
    id: 8,
    title: "Phim Số 8",
    year: 2023,
    posterUrl: "https://static.nutscdn.com/vimg/300-0/e638f641bb9792173cab22cb5f4ce738.jpg",
  },
];

const HomePage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Banner movie={dummyMovies[0]} />
      <CategoryChips />

      <SectionRow title="Phim Hàn Quốc mới" movies={dummyMovies} />
      <SectionRow title="Phim Trung Quốc mới" movies={dummyMovies} />
      <Top10Row />

      <main className="container mx-auto px-4 py-6">
        <h3 className="text-xl font-bold mb-3">Mãn nhãn với Phim Chiếu Rạp</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
          {dummyMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default HomePage;
