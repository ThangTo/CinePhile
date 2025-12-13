import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import { BarSpinner } from "components/common/LoadingState";

const RechargeCoinPage = () => {
  const navigate = useNavigate();
  const { user, updateUser, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState("");

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Predefined coin packages
  const coinPackages = [
    { amount: 100, bonus: 0, label: "100 Coin", popular: false },
    { amount: 500, bonus: 50, label: "500 Coin", popular: false },
    { amount: 1000, bonus: 150, label: "1000 Coin", popular: true },
    { amount: 2000, bonus: 400, label: "2000 Coin", popular: false },
    { amount: 5000, bonus: 1500, label: "5000 Coin", popular: false },
    { amount: 10000, bonus: 4000, label: "10000 Coin", popular: false },
  ];

  const handleSelectPackage = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    setError(null);
  };

  const handleCustomAmount = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Only numbers
    setCustomAmount(value);
    setSelectedAmount(null);
    setError(null);
  };

  const handleRecharge = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const amount = selectedAmount || parseInt(customAmount);
    
    if (!amount || amount <= 0) {
      setError("Vui lòng chọn gói coin hoặc nhập số coin muốn nạp");
      return;
    }

    if (amount < 10) {
      setError("Số coin tối thiểu là 10");
      return;
    }

    if (amount > 100000) {
      setError("Số coin tối đa là 100,000");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await userService.addCoins(amount);
      setSuccess(`Đã nạp thành công ${amount.toLocaleString()} coin vào tài khoản!`);
      
      // Update user in context
      if (result.user) {
        updateUser(result.user);
      } else {
        // Refresh user data
        const updatedUser = await userService.getProfile();
        updateUser(updatedUser);
      }

      // Reset form
      setSelectedAmount(null);
      setCustomAmount("");

      // Show success message for 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra khi nạp coin");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-bgColor flex items-center justify-center">
        <BarSpinner />
      </div>
    );
  }

  const userCoins = user.coin || 0;
  const finalAmount = selectedAmount || parseInt(customAmount) || 0;
  const selectedPackage = coinPackages.find((pkg) => pkg.amount === selectedAmount);
  const totalAfterRecharge = userCoins + finalAmount + (selectedPackage?.bonus || 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-bgColor via-bgColor2 to-bgColor py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Nạp <span className="text-primaryColor">Coin</span>
          </h1>
          <p className="text-gray-300 text-lg">
            Nạp coin để nâng cấp Premium và trải nghiệm dịch vụ tốt nhất
          </p>
          
          {/* Current Coin Display */}
          <div className="mt-6 inline-flex items-center gap-2 bg-bgColor2 px-6 py-3 rounded-full border border-primaryColor/30">
            <i className="fa-solid fa-coins text-primaryColor text-xl"></i>
            <span className="text-white font-semibold text-lg">
              Coin hiện tại: <span className="text-primaryColor">{userCoins.toLocaleString()}</span>
            </span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 mx-auto max-w-2xl bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 mx-auto max-w-2xl bg-green-500/20 border border-green-500 text-green-200 px-6 py-4 rounded-lg">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check"></i>
              <span>{success}</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Coin Packages */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-6">Chọn Gói Coin</h2>
            
            {/* Predefined Packages */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {coinPackages.map((pkg) => {
                const isSelected = selectedAmount === pkg.amount;
                return (
                  <button
                    key={pkg.amount}
                    onClick={() => handleSelectPackage(pkg.amount)}
                    className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-primaryColor bg-primaryColor/20 shadow-lg shadow-primaryColor/20"
                        : "border-white/10 bg-bgColor2 hover:border-primaryColor/50"
                    } ${pkg.popular ? "ring-2 ring-primaryColor/30" : ""}`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-primaryColor to-hoverPrimaryColor text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Phổ Biến
                      </div>
                    )}
                    <div className="mb-2">
                      <div className="text-2xl font-bold text-primaryColor mb-1">
                        {pkg.label}
                      </div>
                      {pkg.bonus > 0 && (
                        <div className="text-sm text-green-400 font-semibold">
                          +{pkg.bonus} coin tặng kèm
                        </div>
                      )}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Tổng nhận: {(pkg.amount + pkg.bonus).toLocaleString()} coin
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount */}
            <div className="bg-bgColor2 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Hoặc nhập số coin tùy chỉnh
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmount}
                  placeholder="Nhập số coin (tối thiểu 10)"
                  className="flex-1 px-4 py-3 bg-bgColor border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor"
                />
                <button
                  onClick={() => {
                    const value = parseInt(customAmount);
                    if (value && value >= 10 && value <= 100000) {
                      handleRecharge();
                    }
                  }}
                  disabled={!customAmount || parseInt(customAmount) < 10}
                  className="px-6 py-3 bg-primaryColor text-white rounded-lg font-semibold hover:bg-hoverPrimaryColor transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Nạp
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Số coin tối thiểu: 10 | Tối đa: 100,000
              </p>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="bg-bgColor2 rounded-xl p-6 border border-white/10 sticky top-4">
              <h3 className="text-xl font-bold text-white mb-6">Tóm Tắt</h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-300">
                  <span>Coin hiện tại:</span>
                  <span className="font-semibold text-white">{userCoins.toLocaleString()}</span>
                </div>
                
                {finalAmount > 0 && (
                  <>
                    <div className="flex justify-between text-gray-300">
                      <span>Số coin nạp:</span>
                      <span className="font-semibold text-white">{finalAmount.toLocaleString()}</span>
                    </div>
                    
                    {selectedPackage?.bonus > 0 && (
                      <div className="flex justify-between text-green-400">
                        <span>Coin tặng kèm:</span>
                        <span className="font-semibold">+{selectedPackage.bonus.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-white/10 pt-4">
                      <div className="flex justify-between text-lg">
                        <span className="text-white font-semibold">Tổng sau nạp:</span>
                        <span className="font-bold text-primaryColor">
                          {totalAfterRecharge.toLocaleString()} coin
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={handleRecharge}
                disabled={!finalAmount || finalAmount < 10 || loading}
                className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                  finalAmount >= 10
                    ? "bg-gradient-to-r from-primaryColor to-hoverPrimaryColor text-white hover:shadow-lg hover:shadow-primaryColor/50 hover:scale-105"
                    : "bg-gray-600 text-gray-300 cursor-not-allowed"
                } ${loading ? "opacity-50 cursor-wait" : ""}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Đang xử lý...
                  </span>
                ) : (
                  `Nạp ${finalAmount > 0 ? finalAmount.toLocaleString() : ""} Coin`
                )}
              </button>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-primaryColor/10 border border-primaryColor/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-info-circle text-primaryColor mt-1"></i>
                  <div className="text-sm text-gray-300">
                    <p className="font-semibold text-white mb-1">Lưu ý:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Coin được cộng ngay sau khi nạp</li>
                      <li>• Coin không có thời hạn sử dụng</li>
                      <li>• Có thể dùng coin để nâng cấp Premium</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-12 bg-bgColor2 rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Bạn Có Thể Dùng Coin Để
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "fa-crown",
                title: "Nâng Cấp Premium",
                description: "100 coin/tháng hoặc 1000 coin/năm để trải nghiệm Premium",
              },
              {
                icon: "fa-gift",
                title: "Nhận Quà Tặng",
                description: "Đổi coin lấy các phần quà và ưu đãi đặc biệt",
              },
              {
                icon: "fa-star",
                title: "Tính Năng Đặc Biệt",
                description: "Mở khóa các tính năng cao cấp với coin",
              },
            ].map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primaryColor/20 rounded-full flex items-center justify-center">
                  <i className={`fa-solid ${benefit.icon} text-primaryColor text-2xl`}></i>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RechargeCoinPage;

