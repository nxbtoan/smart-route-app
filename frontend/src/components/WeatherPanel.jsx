import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Droplets, Wind, MapPin } from 'lucide-react'; // Thêm icon cho xịn

const WeatherPanel = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null); // State bắt lỗi

  useEffect(() => {
    // 1. Đồng hồ đếm nhịp
    const timer = setInterval(() => setTime(new Date()), 1000);

    // 2. Hàm lấy thời tiết
    const fetchWeather = async () => {
      try {
        // const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
        const apiKey = "1d054f70fd611b106df4be38049c2e67";
        
        // Nếu quên nhập API Key hoặc chưa restart server
        if (!apiKey) {
          setError("Chưa nhận được API Key. Hãy restart lại server Vite/Docker!");
          return;
        }

        const res = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=Da Nang,VN&appid=${apiKey}&units=metric&lang=vi`
        );
        
        // Cập nhật dữ liệu xịn xò lấy từ JSON của cậu
        setWeather({
          city: res.data.name,
          temp: Math.round(res.data.main.temp),
          feelsLike: Math.round(res.data.main.feels_like),
          desc: res.data.weather[0].description,
          icon: res.data.weather[0].icon,
          humidity: res.data.main.humidity,
          wind: res.data.wind.speed
        });
        setError(null);
      } catch (e) {
        console.error("Lỗi thời tiết:", e);
        setError("Lỗi mạng hoặc sai API Key!");
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 30 * 60 * 1000);

    return () => {
      clearInterval(timer);
      clearInterval(weatherTimer);
    };
  }, []);

  const timeString = time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateString = time.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

  return (
    <div className="flex items-center gap-4 bg-white/90 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl px-5 py-3 transition-all hover:shadow-xl pointer-events-auto">
      
      {/* Cụm Đồng Hồ */}
      <div className="flex flex-col items-end border-r border-gray-300/60 pr-4">
        <span className="text-2xl font-black text-gray-800 tracking-tight leading-none">
          {timeString}
        </span>
        <span className="text-xs font-bold text-gray-500 uppercase mt-1">
          {dateString}
        </span>
      </div>

      {/* Cụm Thời Tiết */}
      <div className="flex items-center gap-3 min-w-[160px]">
        {error ? (
           <div className="text-xs text-red-500 font-bold leading-tight">
             ❌ {error}
           </div>
        ) : weather ? (
          <>
            <img 
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
              alt="weather" 
              className="w-14 h-14 drop-shadow-md scale-110 -ml-2" 
            />
            <div className="flex flex-col justify-center">
              
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-gray-800 leading-none">
                  {weather.temp}°C
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase">
                  (Cảm giác {weather.feelsLike}°C)
                </span>
              </div>
              
              <span className="text-sm font-black text-blue-600 capitalize mt-0.5">
                {weather.desc}
              </span>

              {/* Hàng thông số phụ */}
              <div className="flex items-center gap-2.5 mt-1 text-[11px] font-bold text-gray-500">
                <span className="flex items-center gap-0.5" title="Thành phố">
                  <MapPin size={12} className="text-red-400"/> {weather.city}
                </span>
                <span className="flex items-center gap-0.5" title="Độ ẩm">
                  <Droplets size={12} className="text-blue-400"/> {weather.humidity}%
                </span>
                <span className="flex items-center gap-0.5" title="Tốc độ gió">
                  <Wind size={12} className="text-teal-500"/> {weather.wind} m/s
                </span>
              </div>
              
            </div>
          </>
        ) : (
          // Khung chờ (Skeleton) đẹp hơn
          <div className="flex flex-col gap-1.5 w-40 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            <div className="h-2 bg-gray-200 rounded w-4/5 mt-1"></div>
          </div>
        )}
      </div>

    </div>
  );
};

export default WeatherPanel;