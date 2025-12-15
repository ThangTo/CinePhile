import React, { useEffect, useState } from 'react';
import DemoMessage from '../components/Demo/DemoMessage';
import demoService from '../services/demo.service';

const DemoPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect chạy khi trang vừa được tải
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Bắt đầu lấy dữ liệu...");
        const response = await demoService.getDemoData();
        setData(response.data);
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // [] nghĩa là chỉ chạy 1 lần khi mount

  return (
    <div className="min-h-screen bg-gray-50 pt-20 px-4">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Trang Demo Kết Nối Frontend - Backend
        </h1>

        {loading ? (
          <div className="text-center text-gray-600">Đang tải dữ liệu...</div>
        ) : (
          <div className="space-y-4">
            <DemoMessage message={data?.message || "Không có dữ liệu"} />
            
            <div className="text-center text-sm text-gray-400 mt-4">
              Dữ liệu cập nhật lúc: {data?.timestamp}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoPage;
