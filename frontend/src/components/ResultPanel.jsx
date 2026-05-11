import React, { useState } from 'react';
import { Clock, Map, Save, X, Zap, CheckCircle2, AlertCircle, Layers, Route as RouteIcon, AlertTriangle } from 'lucide-react';
import useRouteStore from '../store/useRouteStore';
import axios from 'axios';

// Cấu hình màu sắc đồng bộ với bản đồ
const modeConfig = {
  balanced: { label: 'Cân bằng', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  fastest: { label: 'Nhanh nhất', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  shortest: { label: 'Ngắn nhất', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
};

const ResultPanel = () => {
  const { routesData, activeView, setActiveView, clearRoute } = useRouteStore();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Ẩn Panel nếu chưa có dữ liệu tính toán
  if (!routesData) return null;

  const handleSaveRoute = async () => {
    // Ràng buộc: Phải chọn 1 lộ trình cụ thể mới được lưu
    if (activeView === 'all') {
      alert("Vui lòng chọn một mô hình cụ thể (Cân bằng/Nhanh/Ngắn) trước khi lưu!");
      return;
    }

    const currentUser = localStorage.getItem('username') || "taixe_001"; 
    const selectedData = routesData[activeView];

    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        username: currentUser,
        total_distance_km: selectedData.metrics.total_distance_km,
        total_duration_minutes: selectedData.metrics.total_duration_minutes,
        mode_used: selectedData.mode_used,
        optimized_route: selectedData.optimized_route,
        route_geometry: selectedData.route_geometry
      };

      const response = await axios.post('http://localhost:8000/api/routes/save', payload);
      
      if (response.data.status === 'success') {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Lấy dữ liệu của mô hình đang chọn (nếu không phải 'all')
  const currentData = activeView !== 'all' ? routesData[activeView] : null;

  return (
    <div className="w-[420px] flex flex-col bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-5 text-gray-800 animate-in fade-in slide-in-from-right-8 duration-500 absolute top-4 right-4 z-10 max-h-[calc(100vh-32px)]">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
          <Zap size={22} className="text-yellow-500 fill-yellow-500" /> 
          Kết quả Phân tích AI
        </h2>
        <button onClick={clearRoute} className="p-1.5 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-500 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* --- TAB ĐIỀU HƯỚNG --- */}
      <div className="flex bg-gray-100/80 p-1 rounded-xl mb-5 border border-gray-200 shadow-inner">
        <button 
          onClick={() => setActiveView('all')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${activeView === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Layers size={14} /> Tổng quan
        </button>
        {Object.keys(routesData).map(mode => (
          <button 
            key={mode}
            onClick={() => setActiveView(mode)}
            className={`flex-1 flex items-center justify-center py-2 text-xs font-bold rounded-lg transition-all capitalize ${activeView === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {modeConfig[mode].label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {/* --- CHẾ ĐỘ VIEW TẤT CẢ (SO SÁNH) --- */}
        {activeView === 'all' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-600 mb-3">So sánh tương quan giữa các mô hình:</p>
            {Object.entries(routesData).map(([mode, data]) => (
              <div 
                key={mode} 
                onClick={() => setActiveView(mode)}
                className={`p-4 rounded-xl border ${modeConfig[mode].border} ${modeConfig[mode].bg} cursor-pointer hover:shadow-md transition-all group`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-black uppercase ${modeConfig[mode].color}`}>{modeConfig[mode].label}</span>
                  <RouteIcon size={16} className={`opacity-50 group-hover:opacity-100 transition-opacity ${modeConfig[mode].color}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-gray-500 font-bold">QUÃNG ĐƯỜNG</span>
                    <p className="text-lg font-black text-gray-800">{data.metrics.total_distance_km} <span className="text-xs font-normal">km</span></p>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-500 font-bold">THỜI GIAN</span>
                    <p className="text-lg font-black text-gray-800">{data.metrics.total_duration_minutes} <span className="text-xs font-normal">phút</span></p>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
              💡 <strong>Mẹo:</strong> Hãy bấm vào một thẻ ở trên hoặc chọn Tab để xem chi tiết thứ tự giao hàng và lưu lộ trình.
            </div>
          </div>
        )}

        {/* --- CHẾ ĐỘ VIEW CHI TIẾT (MỘT MÔ HÌNH) --- */}
        {activeView !== 'all' && currentData && (
          <div className="animate-in fade-in duration-300">
            {/* Box Chỉ số (Metrics) */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center shadow-sm">
                <Map size={24} className={modeConfig[activeView].color + " mb-1"} />
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tổng quãng đường</span>
                <span className="text-xl font-black text-gray-900">{currentData.metrics.total_distance_km} <span className="text-sm font-medium text-gray-500">km</span></span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col items-center shadow-sm">
                <Clock size={24} className={modeConfig[activeView].color + " mb-1"} />
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Thời gian dự kiến</span>
                <span className="text-xl font-black text-gray-900">{currentData.metrics.total_duration_minutes} <span className="text-sm font-medium text-gray-500">phút</span></span>
              </div>
            </div>

            {/* Timeline thứ tự đi */}
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Lộ trình di chuyển</label>
            <div className="relative border-l-2 border-dashed border-gray-300 ml-3.5 space-y-5 pb-2">
              {currentData.optimized_route.map((loc, index) => (
                <div key={`${loc.id}-${index}`} className="relative pl-6">
                  {/* Vòng tròn Marker trên trục thời gian */}
                  <div className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white
                    ${index === 0 || index === currentData.optimized_route.length - 1 ? 'bg-slate-800' : 'bg-indigo-500'}`} 
                  >
                    {index > 0 && index < currentData.optimized_route.length - 1 ? index : ''}
                  </div>
                  
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
                    <p className="text-[11px] font-black text-gray-800 uppercase tracking-wide">
                      {index === 0 ? 'Xuất phát từ Kho' : index === currentData.optimized_route.length - 1 ? 'Trở về Kho' : `Điểm giao #${index}`}
                    </p>
                    <p className="text-[13px] text-gray-600 line-clamp-2 mt-1 leading-tight">{loc.name}</p>
                    
                    {/* GIAO DIỆN CẢNH BÁO TRỄ GIỜ (Chỉ hiện cho điểm giao và điểm về) */}
                    {index > 0 && (
                      <div className="mt-2.5 flex items-center gap-2">
                        {loc.lateness_minutes > 0 ? (
                          <div className="flex-1 flex items-center gap-1.5 bg-red-50 border border-red-100 p-2 rounded-md text-red-600 shadow-sm animate-pulse">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-[10px] font-black uppercase tracking-wide">
                              Cảnh báo trễ: {loc.lateness_minutes} phút
                            </span>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 p-2 rounded-md text-emerald-600 shadow-sm">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">
                              Dự kiến đúng giờ
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- NÚT HÀNH ĐỘNG FOOTER --- */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {saveStatus === 'success' && (
          <div className="mb-3 text-xs font-bold text-green-700 bg-green-100 p-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-inner">
            <CheckCircle2 size={16} /> Đã lưu lộ trình vào Lịch sử!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mb-3 text-xs font-bold text-red-700 bg-red-100 p-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-inner">
            <AlertCircle size={16} /> Lỗi kết nối CSDL. Vui lòng đăng nhập!
          </div>
        )}

        <button 
          onClick={handleSaveRoute}
          disabled={saving || activeView === 'all'}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-white transition-all 
            ${activeView === 'all' 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-900 hover:bg-black active:scale-[0.98] shadow-lg shadow-gray-900/30'
            }
          `}
        >
          <Save size={18} />
          {saving ? 'Đang đồng bộ...' : activeView === 'all' ? 'Chọn 1 lộ trình để lưu' : `Lưu lộ trình ${modeConfig[activeView].label}`}
        </button>
      </div>

    </div>
  );
};

export default ResultPanel;