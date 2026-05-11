import React from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import useRouteStore from '../store/useRouteStore';
import { Warehouse, Package } from 'lucide-react';

// --- CẤU HÌNH STYLE CHO 3 MÔ HÌNH ĐƯỜNG ĐI ---
const routeStyles = {
  balanced: {
    id: 'route-balanced',
    type: 'line',
    paint: {
      'line-color': '#4f46e5', // Tím Indigo (Đậm, làm nền)
      'line-width': 8,
      'line-opacity': 0.6,     
    },
    layout: { 'line-join': 'round', 'line-cap': 'round' }
  },
  fastest: {
    id: 'route-fastest',
    type: 'line',
    paint: {
      'line-color': '#e11d48', // Hồng Rose (Nổi bật, né màu kẹt xe)
      'line-width': 5,
      'line-dasharray': [2, 2], 
    },
    layout: { 'line-join': 'round', 'line-cap': 'round' }
  },
  shortest: {
    id: 'route-shortest',
    type: 'line',
    paint: {
      'line-color': '#0891b2', // Xanh Cyan (Tương phản mạnh)
      'line-width': 3.5,
      'line-dasharray': [1, 1.5], 
    },
    layout: { 'line-join': 'round', 'line-cap': 'round' }
  }
};
const MapPanel = () => {
  const { locations, routesData, activeView } = useRouteStore();

  const createGeoJson = (geometry) => {
    if (!geometry || geometry.length === 0) return null;
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: geometry.map(coord => [coord[1], coord[0]]),
      },
    };
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner bg-gray-100 border border-white/20">
      <Map
        initialViewState={{
          longitude: 108.2022, // Đà Nẵng
          latitude: 16.0544,
          zoom: 13,
        }}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />

        {/* --- PHẦN VẼ CÁC TUYẾN ĐƯỜNG --- */}
        {routesData && ['balanced', 'fastest', 'shortest'].map((mode) => {
          // Kiểm tra xem có dữ liệu mode này không và user có đang chọn xem nó không
          const showLayer = activeView === 'all' || activeView === mode;
          const data = routesData[mode];

          if (data && showLayer) {
            return (
              <Source key={`source-${mode}`} id={`source-${mode}`} type="geojson" data={createGeoJson(data.route_geometry)}>
                <Layer {...routeStyles[mode]} />
              </Source>
            );
          }
          return null;
        })}

        {/* --- PHẦN HIỂN THỊ CÁC ĐIỂM ĐÁNH DẤU (MARKERS) --- */}
        {locations.map((loc, index) => (
          <Marker 
            key={loc.id || index} 
            longitude={loc.lng} 
            latitude={loc.lat} 
            anchor="bottom"
          >
            {index === 0 ? (
              <div className="relative group cursor-pointer flex flex-col items-center">
                <div className="absolute top-1 w-10 h-10 bg-slate-800 rounded-full opacity-20 animate-ping"></div>
                <div className="relative flex items-center justify-center w-11 h-11 bg-slate-800 rounded-full shadow-xl border-[3px] border-white transform transition-transform duration-300 group-hover:scale-110 z-10">
                  <Warehouse size={18} className="text-white" />
                </div>
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-800 -mt-1"></div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 whitespace-nowrap bg-gray-900/95 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                  KHO: {loc.name}
                </div>
              </div>
            ) : (
              <div className="relative group cursor-pointer flex flex-col items-center">
                <div className="relative flex items-center justify-center w-8 h-8 bg-white rounded-full shadow-lg border-[2.5px] border-indigo-600 transform transition-transform duration-300 group-hover:scale-110 z-10">
                  <span className="text-indigo-700 font-black text-sm">{index}</span>
                </div>
                <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-indigo-600 -mt-[2px]"></div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 whitespace-nowrap bg-white/95 backdrop-blur-sm text-indigo-900 border border-indigo-100 text-[10px] font-bold px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center gap-1.5">
                  <Package size={12} className="text-indigo-500"/>
                  Điểm #{index}: {loc.name}
                </div>
              </div>
            )}
          </Marker>
        ))}
      </Map>

      {/* --- CHÚ THÍCH (LEGEND) --- */}
      {routesData && (
        <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-gray-200 shadow-xl flex flex-col gap-2 z-20">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Chú thích mô hình</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-1.5 bg-[#4f46e5] opacity-60 rounded-full"></div>
            <span className="text-xs font-bold text-gray-700">Balanced (Cân bằng)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 border-t-[3px] border-dashed border-[#e11d48]"></div>
            <span className="text-xs font-bold text-gray-700">Fastest (Nhanh nhất)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-0.5 border-t-[3px] border-dotted border-[#0891b2]"></div>
            <span className="text-xs font-bold text-gray-700">Shortest (Ngắn nhất)</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPanel;