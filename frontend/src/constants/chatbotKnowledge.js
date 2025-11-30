/**
 * Knowledge Base cho CinePhine Chatbot
 * Chứa thông tin về website, tính năng, và cách sử dụng
 */

export const CINEPHINE_KNOWLEDGE = {
  website: {
    name: "CinePhine",
    description:
      "CinePhine là một nền tảng xem phim trực tuyến hiện đại, cho phép người dùng xem phim, tìm kiếm, và quản lý danh sách yêu thích.",
    features: [
      "Xem phim trực tuyến với chất lượng cao",
      "Tìm kiếm phim theo tên, thể loại, quốc gia",
      "Xem thông tin chi tiết về phim, diễn viên",
      "Đánh giá và bình luận về phim",
      "Quản lý danh sách yêu thích và lịch sử xem",
      "Hệ thống phân loại theo thể loại (Genre) và quốc gia (Country)",
      "Top 10 phim phổ biến",
      "Phim đang trending",
      "Phim mới phát hành",
    ],
  },
  navigation: {
    pages: [
      {
        name: "Trang chủ",
        path: "/",
        description:
          "Hiển thị banner phim nổi bật, top 10 phim, phim đang trending, và các danh mục phim",
      },
      {
        name: "Chi tiết phim",
        path: "/movie/:id",
        description:
          "Xem thông tin chi tiết về phim, diễn viên, đánh giá, bình luận, và danh sách tập phim",
      },
      {
        name: "Xem phim",
        path: "/watch/:id",
        description: "Trang xem phim với video player, điều khiển phát, và sidebar thông tin",
      },
      {
        name: "Thể loại",
        path: "/genre/:slug",
        description: "Xem danh sách phim theo thể loại (hành động, tình cảm, hài, kinh dị, v.v.)",
      },
      {
        name: "Quốc gia",
        path: "/country/:slug",
        description: "Xem danh sách phim theo quốc gia sản xuất",
      },
      {
        name: "Tài khoản",
        path: "/account",
        description: "Quản lý thông tin cá nhân, mật khẩu, danh sách yêu thích, và lịch sử xem",
      },
    ],
  },
  features: {
    search: {
      description: "Tìm kiếm phim theo tên, diễn viên, hoặc từ khóa",
      howTo: "Sử dụng thanh tìm kiếm ở header, nhập từ khóa và nhấn Enter",
    },
    favorites: {
      description: "Lưu phim yêu thích để xem sau",
      howTo: "Click vào icon trái tim trên card phim hoặc trang chi tiết phim",
    },
    watchlist: {
      description: "Thêm phim vào danh sách xem sau",
      howTo: "Click vào icon bookmark trên card phim",
    },
    rating: {
      description: "Đánh giá phim từ 1-5 sao",
      howTo: "Vào trang chi tiết phim hoặc trang xem phim, click vào phần đánh giá",
    },
    comments: {
      description: "Bình luận và thảo luận về phim",
      howTo: "Vào trang chi tiết phim, scroll xuống phần bình luận",
    },
    continueWatching: {
      description: "Tiếp tục xem phim từ vị trí đã dừng",
      howTo:
        "Phim sẽ tự động lưu tiến độ xem, bạn có thể tiếp tục từ trang chủ hoặc trang tài khoản",
    },
  },
  genres: [
    "Hành động",
    "Tình cảm",
    "Hài",
    "Kinh dị",
    "Khoa học viễn tưởng",
    "Phiêu lưu",
    "Chính kịch",
    "Tài liệu",
    "Hoạt hình",
    "Gia đình",
    "Bí ẩn",
    "Thể thao",
    "Chiến tranh",
    "Western",
  ],
  userGuide: {
    registration:
      "Bạn cần đăng ký tài khoản để sử dụng đầy đủ tính năng như lưu yêu thích, đánh giá, và bình luận",
    login: "Đăng nhập bằng email/password hoặc Google OAuth",
    watching:
      "Chọn phim từ trang chủ hoặc tìm kiếm, click vào phim để xem chi tiết, sau đó click 'Xem phim'",
    filtering:
      "Sử dụng các filter ở trang chủ để lọc phim theo thể loại, quốc gia, hoặc năm phát hành",
  },
  faq: [
    {
      question: "Làm thế nào để tìm phim?",
      answer:
        "Bạn có thể sử dụng thanh tìm kiếm ở header, hoặc duyệt theo thể loại/quốc gia từ menu điều hướng.",
    },
  ],
};

/**
 * Tạo system instruction cho Gemini API
 * Sử dụng cách inject vào chatHistory như code gốc
 */
export const getSystemInstruction = () => {
  return `Bạn là trợ lý AI thân thiện của CinePhine - một nền tảng xem phim trực tuyến.

THÔNG TIN VỀ CINEPHINE:
- Tên: ${CINEPHINE_KNOWLEDGE.website.name}
- Mô tả: ${CINEPHINE_KNOWLEDGE.website.description}

TÍNH NĂNG CHÍNH:
${CINEPHINE_KNOWLEDGE.website.features.map((f) => `- ${f}`).join("\n")}

CÁC TRANG CHÍNH:
${CINEPHINE_KNOWLEDGE.navigation.pages
  .map((p) => `- ${p.name} (${p.path}): ${p.description}`)
  .join("\n")}

HƯỚNG DẪN SỬ DỤNG:
${Object.entries(CINEPHINE_KNOWLEDGE.features)
  .map(([key, value]) => `- ${value.description}: ${value.howTo}`)
  .join("\n")}

THỂ LOẠI PHIM:
${CINEPHINE_KNOWLEDGE.genres.join(", ")}

CÂU HỎI THƯỜNG GẶP:
${CINEPHINE_KNOWLEDGE.faq.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n")}

NHIỆM VỤ CỦA BẠN:
1. Trả lời các câu hỏi về CinePhine một cách thân thiện và hữu ích
2. Hướng dẫn người dùng cách sử dụng các tính năng
3. Giúp người dùng tìm phim theo sở thích
4. Trả lời bằng tiếng Việt, tự nhiên và dễ hiểu
5. Nếu không biết câu trả lời, hãy thừa nhận và đề xuất liên hệ hỗ trợ

Hãy luôn thân thiện, nhiệt tình và sẵn sàng giúp đỡ người dùng!`;
};
