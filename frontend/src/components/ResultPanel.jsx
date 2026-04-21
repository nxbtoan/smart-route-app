import React, { useState } from 'react';
import useRouteStore from '../store/useRouteStore';
import axios from 'axios';
import { 
    FaMapMarkedAlt, FaSyncAlt, FaDirections, 
    FaSave, FaLock, FaWarehouse, FaCheckSquare, FaRegSquare 
} from 'react-icons/fa';
import './ResultPanel.scss';

const ResultPanel = () => {
    const { 
        optimizedResult, error, isLoading, 
        toggleDeliveryStatus, reOptimize, 
        user, toggleAuthModal, optimizationMode 
    } = useRouteStore();
    
    const [isSaving, setIsSaving] = useState(false);

    if (isLoading) return null;
    if (error) return (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 shadow-sm flex items-center gap-2 text-sm font-medium">
            <span>❌</span> {error}
        </div>
    );
    if (!optimizedResult) return null;

    const { metrics, optimized_route } = optimizedResult;

    const openGoogleMaps = (lat, lng) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        window.open(url, '_blank');
    };

    const handleSaveRoute = async () => {
        if (!user) {
            toggleAuthModal(true);
            return;
        }

        setIsSaving(true);
        try {
            await axios.post('http://localhost:8000/api/auth/routes/save', {
                username: user,
                total_distance_km: metrics.total_distance_km,
                total_duration_minutes: metrics.total_duration_minutes,
                mode_used: optimizationMode,
                optimized_route: optimized_route,
                route_geometry: optimizedResult.route_geometry
            });
            alert('🎉 Đã lưu lộ trình thành công!');
        } catch (err) {
            alert('Lỗi khi lưu lộ trình!');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="result-panel-container">
            {/* HEADER */}
            <div className="panel-header">
                <h3><FaMapMarkedAlt /> Lộ trình tài xế</h3>
            </div>
            
            {/* THỐNG KÊ */}
            <div className="stats-box">
                <div className="stat-col">
                    <div className="stat-label">Quãng đường</div>
                    <div className="stat-value">{metrics.total_distance_km} <span>km</span></div>
                </div>
                <div className="stat-col time">
                    <div className="stat-label">Thời gian</div>
                    <div className="stat-value">{metrics.total_duration_minutes} <span>phút</span></div>
                </div>
            </div>

            {/* NÚT RE-OPTIMIZE */}
            <button 
                onClick={reOptimize}
                disabled={isLoading}
                className={`btn-reoptimize ${isLoading ? 'loading' : ''}`}
            >
                <FaSyncAlt className={isLoading ? 'animate-spin' : ''} /> 
                {isLoading ? 'ĐANG TÍNH TOÁN LẠI...' : 'TỐI ƯU LẠI TỪ VỊ TRÍ HIỆN TẠI'}
            </button>

            {/* DANH SÁCH ĐIỂM DỪNG */}
            <div className="route-list">
                {optimized_route.map((loc, index) => {
                    const isKho = index === 0 || index === optimized_route.length - 1;
                    const isDelivered = loc.isDelivered;

                    return (
                        <div key={index} className={`route-item ${isDelivered ? 'delivered' : 'pending'}`}>
                            
                            {/* Icon Trạng thái / Kho */}
                            {isKho ? (
                                <FaWarehouse className="depot-icon" />
                            ) : (
                                <div 
                                    className={`checkbox-wrapper ${isDelivered ? 'checked' : ''}`}
                                    onClick={() => toggleDeliveryStatus(loc.id)}
                                >
                                    {isDelivered ? <FaCheckSquare /> : <FaRegSquare />}
                                </div>
                            )}

                            {/* Tên địa điểm */}
                            <div className={`loc-info ${isDelivered ? 'strike' : ''}`}>
                                {loc.id} 
                                {isKho && <span className="depot-badge">Kho</span>}
                            </div>

                            {/* Nút Dẫn đường (Google Maps) */}
                            {(!isKho || index === optimized_route.length - 1) && !isDelivered && (
                                <button 
                                    onClick={() => openGoogleMaps(loc.lat, loc.lng)}
                                    title="Chỉ đường bằng Google Maps"
                                    className="btn-navigate"
                                >
                                    <FaDirections size={16} /> Đi ngay
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* NÚT LƯU LỘ TRÌNH */}
            <div className="save-section">
                <button 
                    onClick={handleSaveRoute}
                    disabled={isSaving}
                    className={`btn-save ${user ? 'auth' : 'no-auth'} ${isSaving ? 'loading' : ''}`}
                >
                    {isSaving ? (
                        <>⏳ Đang lưu...</>
                    ) : user ? (
                        <><FaSave size={16} /> LƯU VÀO LỊCH SỬ</>
                    ) : (
                        <><FaLock size={16} /> ĐĂNG NHẬP ĐỂ LƯU</>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ResultPanel;