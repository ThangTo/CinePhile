// Mock API service. Replace with real HTTP calls later.

export async function fetchMovieById(movieId) {
  await new Promise((r) => setTimeout(r, 300));
  return {
    id: movieId,
    title: "Thần Đèn ơi, Ước Đi",
    englishTitle: "Genie, Make a Wish",
    poster: "https://static.nutscdn.com/vimg/400-0/578c5ff63df52ac7ef86bfc0e84a5638.jpg",
    bgImage: "https://static.nutscdn.com/vimg/1920-0/39c40962744ddc96cd3f75d97e56bbcf.webp",
    rating: 9.0,
    imdb: 6.4,
    ageRating: "T16",
    year: 2025,
    part: "Phần 1",
    totalEpisodes: 13,
    completed: true,
    duration: "1h 00m",
    country: "Hàn Quốc",
    networks: "Netflix",
    production: "CJ ENM, Hwa&Dam Pictures, Studio Dragon",
    director: "Lee Byeong-heon, Kim Eun-sook",
    genres: ["Tình Cảm", "Hài", "Kỳ Ảo", "Lãng Mạn", "Giả Tưởng"],
    synopsis:
      "Sau ngàn năm, vị thần đèn khoa trương trở lại ban điều ước cho một cô gái khắc kỷ. Liệu phép thuật của ngài có thể khiến thế giới cứng nhắc của cô tràn ngập tình yêu và mộng tưởng?",
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
        content: "Xem",
        likes: 12,
        replies: 1,
      },
    ],
  };
}

export async function fetchEpisodes(movieId) {
  await new Promise((r) => setTimeout(r, 200));
  return Array.from({ length: 13 }, (_, i) => ({
    id: i + 1,
    title: `Tập ${i + 1}`,
    duration: "45m",
  }));
}
