import http from "../lib/axios";

// Hàm này giả lập việc gọi API lấy dữ liệu
// Trong thực tế, bạn sẽ thay 'mock-data' bằng đường dẫn API thật, ví dụ: '/movies/trending'
const getDemoData = async () => {
  // Giả lập độ trễ mạng 1 giây
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: {
          message: "Hello from Backend (Simulated)!",
          timestamp: new Date().toISOString()
        }
      });
    }, 1000);
  });

  // Code thật sẽ trông như thế này:
  // return http.get('/demo-endpoint');
};

const demoService = {
  getDemoData,
};

export default demoService;
