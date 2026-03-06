import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { statsAPI } from "services/admin.service";
import { FiMapPin, FiUsers } from "react-icons/fi";
import { BarSpinner } from "components/common/LoadingState";

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Create a custom modern pulsing icon for users
const createPulsingIcon = (count) => {
  return L.divIcon({
    className: "custom-leaflet-icon",
    html: `
      <div class="relative flex h-8 w-8 items-center justify-center">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
        <div class="relative inline-flex flex-col items-center justify-center rounded-full h-8 w-8 bg-emerald-500 border-2 border-white shadow-lg text-white font-bold text-[10px] leading-tight z-10">
          ${count > 99 ? "99+" : count}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

const PERIODS = [
  { id: "realtime", label: "Real-time" },
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
];

const AnalyticsMap = () => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("realtime");

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const fetchLocations = async () => {
      try {
        setIsLoading(true);
        const data = await statsAPI.getAnalyticsLocations(period);
        if (isMounted && data && data.success) {
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu bản đồ:", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLocations();

    // Đối với realtime, tự động tải lại mỗi 10 giây
    if (period === "realtime") {
      timeoutId = setInterval(fetchLocations, 10000);
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearInterval(timeoutId);
    };
  }, [period]);

  return (
    <div className="bg-[#ffffff05] rounded-2xl p-6 border border-white/5 shadow-xl flex flex-col relative overflow-hidden h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
            <FiMapPin size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Bản Đồ Phân Bố</h3>
            <p className="text-xs text-gray-400">Vị trí địa lý của người dùng</p>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex bg-[#ffffff0a] p-1 rounded-lg border border-white/5 overflow-x-auto w-full sm:w-auto">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                period === p.id
                  ? "bg-emerald-500 text-white shadow-md"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="w-full h-[350px] sm:h-[400px] rounded-xl overflow-hidden border border-white/5 relative z-10 bg-[#1a1c23]">
        {isLoading && locations.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-sm">
            <BarSpinner />
          </div>
        ) : null}

        <MapContainer
          center={[16.047079, 108.20623]} // Tọa độ trung tâm Việt Nam
          zoom={5}
          minZoom={2}
          style={{ height: "100%", width: "100%", background: "#0f1014" }}
          zoomControl={false}
          attributionControl={false}
        >
          {/* CartoDB Dark Matter Base Map */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {locations.map((loc, index) => {
            if (!loc.lat || !loc.lon) return null;
            return (
              <Marker
                key={`${loc.lat}-${loc.lon}-${index}`}
                position={[loc.lat, loc.lon]}
                icon={createPulsingIcon(loc.count || 1)}
              >
                <Popup
                  className="custom-leaflet-popup"
                  autoPanPadding={[20, 20]}
                >
                  <div className="p-1">
                    <h4 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-1">
                      <FiMapPin className="text-emerald-500" />
                      {loc.city !== "Unknown City" ? loc.city : "Không xác định"}
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">{loc.country}</p>
                    <div className="bg-emerald-50 rounded p-2 flex items-center justify-between mt-2">
                       <span className="text-xs font-medium text-emerald-800 flex items-center gap-1">
                         <FiUsers /> Lượng truy cập
                       </span>
                       <span className="font-bold text-emerald-600">
                         {loc.count || 1}
                       </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        
        {/* Helper overlay for empty state */}
        {!isLoading && locations.length === 0 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center z-[400] pointer-events-none">
             <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs text-gray-300 shadow-xl">
                Không có dữ liệu vị trí cho thời gian này
             </div>
          </div>
        )}
      </div>
      
      {/* Global CSS for Leaflet Popups to match dark theme loosely */}
      <style jsx="true" global="true">{`
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 12px;
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
};

export default AnalyticsMap;
