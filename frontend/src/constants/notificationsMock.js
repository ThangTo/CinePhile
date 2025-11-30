/**
 * Mock data cho notifications
 */

export const mockNotifications = [
  {
    id: 1,
    type: "new_episode",
    title: "Phim mới ra mắt",
    message: 'Tập mới của "Thần Đèn dị Ước Đi" đã cập nhật.',
    isRead: false,
    isNew: true,
    createdAt: new Date(Date.now() - 304 * 24 * 60 * 60 * 1000), // 304 ngày trước
    actionUrl: "/watch/123",
    icon: "bell",
  },
  {
    id: 2,
    type: "premium_offer",
    title: "Ưu đãi Premium",
    message: "Giảm 30% gói Premium trong tuần này.",
    isRead: false,
    isNew: true,
    createdAt: new Date(Date.now() - 305 * 24 * 60 * 60 * 1000), // 305 ngày trước
    actionUrl: "/account?tabs=premium",
    icon: "bell",
  },
  {
    id: 3,
    type: "system",
    title: "Thông báo hệ thống",
    message: "Hệ thống sẽ bảo trì lúc 02:00 sáng mai.",
    isRead: false,
    isNew: false,
    createdAt: new Date(Date.now() - 306 * 24 * 60 * 60 * 1000), // 306 ngày trước
    actionUrl: null,
    icon: "bell",
  },
  {
    id: 4,
    type: "new_episode",
    title: "Phim mới ra mắt",
    message: 'Tập mới của "Avengers: Endgame" đã cập nhật.',
    isRead: true,
    isNew: false,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 ngày trước
    actionUrl: "/watch/456",
    icon: "bell",
  },
  {
    id: 5,
    type: "rating",
    title: "Đánh giá mới",
    message: "Bạn có 5 đánh giá mới cho phim bạn đã xem.",
    isRead: true,
    isNew: false,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 ngày trước
    actionUrl: "/account?tabs=ratings",
    icon: "bell",
  },
  {
    id: 6,
    type: "comment",
    title: "Bình luận mới",
    message: "Có người đã trả lời bình luận của bạn.",
    isRead: false,
    isNew: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 ngày trước
    actionUrl: "/movie/789",
    icon: "bell",
  },
  {
    id: 7,
    type: "favorite",
    title: "Phim yêu thích",
    message: 'Phim "Spider-Man: No Way Home" đã có sẵn để xem.',
    isRead: false,
    isNew: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 ngày trước
    actionUrl: "/movie/101",
    icon: "bell",
  },
  {
    id: 8,
    type: "system",
    title: "Cập nhật ứng dụng",
    message: "Phiên bản mới của CinePhine đã có sẵn. Cập nhật ngay!",
    isRead: true,
    isNew: false,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 ngày trước
    actionUrl: null,
    icon: "bell",
  },
];

/**
 * Format thời gian relative
 */
export const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 0) {
    return `${days} ngày trước`;
  } else if (hours > 0) {
    return `${hours} giờ trước`;
  } else if (minutes > 0) {
    return `${minutes} phút trước`;
  } else {
    return "Vừa xong";
  }
};
