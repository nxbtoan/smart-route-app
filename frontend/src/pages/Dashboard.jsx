import React from 'react';
import MapPanel from '../components/MapPanel';
import InputPanel from '../components/InputPanel';
import ResultPanel from '../components/ResultPanel';
import WeatherPanel from '../components/WeatherPanel';

const Dashboard = () => {
  return (
    <div className="w-screen h-screen relative bg-gray-100 overflow-hidden text-sm">
      {/* Bản đồ nền */}
      <div className="absolute inset-0 z-0">
        <MapPanel />
      </div>

      {/* Widget Thời Tiết lơ lửng ở TOP-CENTER */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <WeatherPanel />
      </div>

      {/* Các Panel cũ giữ nguyên */}
      <div className="absolute top-6 left-6 bottom-6 z-10 pointer-events-auto">
        <InputPanel />
      </div>
      
      <div className="absolute top-6 right-6 z-10 pointer-events-auto">
        <ResultPanel />
      </div>
    </div>
  );
};

export default Dashboard;