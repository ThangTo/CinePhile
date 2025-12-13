import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "hooks/useAuth";
import userService from "services/user.service";
import { BarSpinner } from "components/common/LoadingState";

// Import React Icons
import { 
  FiCheck, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiCreditCard,
  FiGift,
  FiZap,
  FiShield,
  FiTrendingUp,
  FiPlus
} from "react-icons/fi";
import { FaCoins } from "react-icons/fa";

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
      
      if (result.user) {
        updateUser(result.user);
      } else {
        const updatedUser = await userService.getProfile();
        updateUser(updatedUser);
      }

      setSelectedAmount(null);
      setCustomAmount("");

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
      <div className="min-h-screen bg-[#111] flex items-center justify-center">
        <BarSpinner />
      </div>
    );
  }

  const userCoins = user.coin || 0;
  const finalAmount = selectedAmount || parseInt(customAmount) || 0;
  const selectedPackage = coinPackages.find((pkg) => pkg.amount === selectedAmount);
  const totalAfterRecharge = userCoins + finalAmount + (selectedPackage?.bonus || 0);

  return (
    <div className="min-h-screen bg-[#111] relative overflow-hidden font-sans text-gray-200 selection:bg-primaryColor/30">
      
      {/* --- Background Effects --- */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primaryColor/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 py-12 relative z-10 max-w-6xl">
        
        {/* --- Header Section --- */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Nạp <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryColor to-yellow-200">Coin</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Nạp coin nhanh chóng, an toàn để nâng cấp Premium và mở khóa các tính năng độc quyền.
          </p>
          
          {/* Current Coin Display Widget */}
          <div className="mt-8 inline-flex items-center gap-4 bg-[#1a1a1a] border border-white/10 px-2 py-2 pr-6 rounded-full shadow-lg backdrop-blur-md">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <FaCoins className="text-black text-lg" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Số dư hiện tại</span>
              <span className="text-lg font-bold text-white leading-none">
                {userCoins.toLocaleString()} <span className="text-xs text-yellow-500">Coin</span>
              </span>
            </div>
          </div>
        </div>

        {/* --- Main Content Grid --- */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Selection Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* 1. Predefined Packages */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FiZap className="text-primaryColor" /> Chọn gói nạp nhanh
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {coinPackages.map((pkg) => {
                  const isSelected = selectedAmount === pkg.amount;
                  return (
                    <button
                      key={pkg.amount}
                      onClick={() => handleSelectPackage(pkg.amount)}
                      className={`
                        relative p-5 rounded-2xl border transition-all duration-300 group overflow-hidden
                        ${isSelected
                          ? "bg-primaryColor/10 border-primaryColor shadow-lg shadow-primaryColor/20 scale-[1.02]"
                          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                        }
                      `}
                    >
                      {/* Popular Badge */}
                      {pkg.popular && (
                        <div className="absolute top-0 right-0 bg-primaryColor text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg shadow-sm">
                          HOT
                        </div>
                      )}

                      <div className="flex flex-col items-center text-center relative z-10">
                        <span className={`text-2xl font-bold mb-1 ${isSelected ? "text-primaryColor" : "text-white group-hover:text-primaryColor transition-colors"}`}>
                          {pkg.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 uppercase font-medium tracking-wider">Coin</span>
                        
                        {/* Bonus Display */}
                        {pkg.bonus > 0 ? (
                          <div className="mt-3 py-1 px-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold flex items-center gap-1">
                            <FiTrendingUp /> +{pkg.bonus.toLocaleString()}
                          </div>
                        ) : (
                           <div className="mt-3 h-6 opacity-0">spacer</div> 
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Custom Amount Input */}
            <div className="bg-[#1a1a1a]/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Hoặc nhập số lượng tùy ý</h3>
              <div className="relative">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmount}
                  placeholder="Nhập số coin (10 - 100,000)"
                  className="w-full pl-12 pr-4 py-4 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor transition-all font-mono text-lg"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                   <FaCoins />
                </div>
                {customAmount && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primaryColor font-bold text-sm">
                        COIN
                    </div>
                )}
              </div>
              <div className="flex justify-between mt-3 text-xs text-gray-500 font-medium px-1">
                <span>Tối thiểu: 10 Coin</span>
                <span>Tối đa: 100,000 Coin</span>
              </div>
            </div>
            
             {/* Messages Area (Mobile/Tablet position or just extra feedback) */}
             {(error || success) && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${error ? "bg-red-500/10 border border-red-500/30 text-red-200" : "bg-green-500/10 border border-green-500/30 text-green-200"}`}>
                    {error ? <FiAlertCircle className="w-5 h-5 flex-shrink-0" /> : <FiCheckCircle className="w-5 h-5 flex-shrink-0" />}
                    <span>{error || success}</span>
                </div>
             )}
          </div>

          {/* RIGHT COLUMN: Summary & Payment (Sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primaryColor/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                  <FiCreditCard className="text-primaryColor" /> Thông tin thanh toán
                </h3>
                
                {/* Receipt Details */}
                <div className="space-y-4 mb-8 relative z-10">
                  <div className="flex justify-between items-center text-gray-400 text-sm">
                    <span>Số coin nạp:</span>
                    <span className="text-white font-medium">
                      {finalAmount > 0 ? finalAmount.toLocaleString() : "0"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Khuyến mãi:</span>
                    <span className="text-green-400 font-medium">
                      {selectedPackage?.bonus ? `+${selectedPackage.bonus.toLocaleString()}` : "0"}
                    </span>
                  </div>

                  <div className="w-full h-px bg-white/10 border-t border-dashed border-gray-700 my-2" />
                  
                  <div className="flex justify-between items-end">
                    <span className="text-gray-300 font-medium">Tổng nhận:</span>
                    <div className="text-right">
                      <span className="block text-2xl font-bold text-primaryColor leading-none">
                        {(finalAmount > 0 ? finalAmount + (selectedPackage?.bonus || 0) : 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 uppercase font-bold">Coin</span>
                    </div>
                  </div>

                   <div className="flex justify-between items-center text-xs text-gray-500 mt-2 bg-white/5 p-2 rounded-lg">
                    <span>Số dư sau nạp:</span>
                    <span className="text-white font-medium">
                      {totalAfterRecharge.toLocaleString()} Coin
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleRecharge}
                  disabled={!finalAmount || finalAmount < 10 || loading}
                  className={`
                    w-full py-4 rounded-xl font-bold text-md tracking-wide transition-all duration-300
                    flex items-center justify-center gap-2 shadow-lg relative z-10
                    ${finalAmount >= 10 && !loading
                      ? "bg-primaryColor hover:bg-hoverPrimaryColor text-black shadow-primaryColor/25 hover:shadow-primaryColor/40 hover:-translate-y-1"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                    }
                  `}
                >
                  {loading ? (
                    <><BarSpinner className="w-5 h-5" /> Đang xử lý...</>
                  ) : (
                    <>
                       Thanh toán ngay <FiZap className={finalAmount >= 10 ? "fill-black" : ""} />
                    </>
                  )}
                </button>

                {/* Secure Note */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                    <FiShield className="text-green-500" /> Giao dịch được bảo mật an toàn
                </div>
              </div>

               {/* Info Note */}
               <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-200/70 leading-relaxed">
                  <p className="font-bold text-blue-300 mb-1 flex items-center gap-1"><FiAlertCircle /> Lưu ý:</p>
                  Coin không có hạn sử dụng và không thể quy đổi ngược lại thành tiền mặt.
               </div>
            </div>
          </div>
        </div>

        {/* --- Benefits Footer Section --- */}
        <div className="mt-20 border-t border-white/10 pt-10">
          <h2 className="text-xl font-bold text-white mb-8 text-center">
            Quyền lợi khi sở hữu Coin
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <div className="text-yellow-400"><FiCheck /></div>,
                title: "Nâng Cấp Premium",
                description: "Sử dụng coin để mua các gói Premium tuần, tháng hoặc năm với giá ưu đãi.",
              },
              {
                icon: <div className="text-pink-400"><FiGift /></div>,
                title: "Tặng Quà (Donate)",
                description: "Dùng coin để tặng quà cho các bộ phim hoặc người dùng khác trong cộng đồng.",
              },
              {
                icon: <div className="text-purple-400"><FiZap /></div>,
                title: "Tính Năng VIP",
                description: "Mở khóa các tính năng nâng cao như đổi tên màu, khung avatar đặc biệt.",
              },
            ].map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">{benefit.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default RechargeCoinPage;