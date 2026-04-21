import React, { useState } from 'react';
import useRouteStore from '../store/useRouteStore';
import { 
    FaRoute, FaWarehouse, FaMapMarkerAlt, FaPlus, 
    FaTrashAlt, FaClock, FaChevronUp, FaChevronDown, 
    FaCog, FaLightbulb, FaRocket
} from 'react-icons/fa';
import './InputPanel.scss';

const InputPanel = () => {
    const { 
        locations, removeLocation, optimizationMode, setOptimizationMode, 
        fetchOptimization, isLoading, addLocationSmart, 
        isDefaultDepot, toggleDefaultDepot, updateTimeWindow 
    } = useRouteStore();

    const [addressInput, setAddressInput] = useState('');
    // State quản lý việc thu gọn/mở rộng Panel
    const [isExpanded, setIsExpanded] = useState(true); 

    const handleAdd = () => {
        if (!addressInput.trim()) return;
        addLocationSmart(addressInput);
        setAddressInput('');
    };

    return (
        <div className="input-panel-container">
            {/* HEADER - BẤM VÀO ĐỂ THU GỌN / MỞ RỘNG */}
            <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="title-wrapper">
                    <FaRoute className="main-icon" />
                    <h2>Cấu hình Tuyến</h2>
                </div>
                <button className="toggle-btn" title={isExpanded ? "Thu gọn" : "Mở rộng"}>
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
            </div>

            {/* BODY - CHỈ HIỂN THỊ KHI isExpanded === true */}
            {isExpanded && (
                <div className="panel-body">
                    
                    {/* 1. KHO XUẤT PHÁT */}
                    <div>
                        <label className="section-title">
                            <FaWarehouse className="sec-icon" /> Điểm xuất phát (Kho)
                        </label>
                        <div className="depot-toggle">
                            <button 
                                className={isDefaultDepot ? 'active' : 'inactive'}
                                onClick={() => toggleDefaultDepot(true)}
                            >
                                Kho mặc định
                            </button>
                            <button 
                                className={!isDefaultDepot ? 'active' : 'inactive'}
                                onClick={() => toggleDefaultDepot(false)}
                            >
                                Tự nhập kho
                            </button>
                        </div>
                        {!isDefaultDepot && (
                            <input 
                                className="custom-input"
                                placeholder="Nhập địa chỉ hoặc tọa độ kho..."
                                onBlur={(e) => e.target.value && addLocationSmart(e.target.value)}
                            />
                        )}
                    </div>

                    {/* 2. THÊM ĐIỂM GIAO */}
                    <div>
                        <label className="section-title">
                            <FaMapMarkerAlt className="sec-icon" /> Thêm điểm giao hàng
                        </label>
                        <div className="add-row">
                            <input 
                                className="custom-input"
                                value={addressInput}
                                onChange={(e) => setAddressInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                                placeholder="Nhập tên, tọa độ..."
                                disabled={isLoading}
                            />
                            <button className="btn-add" onClick={handleAdd}>
                                <FaPlus />
                            </button>
                        </div>
                        <div className="text-[11px] text-green-700 bg-green-50 p-2 rounded-lg border border-green-200 flex items-start gap-1.5">
                            <FaLightbulb className="mt-0.5 shrink-0" />
                            <span>Mẹo: Bạn có thể <strong>click trực tiếp lên bản đồ</strong> để cắm cờ thêm điểm!</span>
                        </div>
                    </div>

                    {/* 3. DANH SÁCH & CHẾ ĐỘ */}
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label className="section-title !mb-0">
                                <FaCog className="sec-icon" /> Chế độ & Danh sách ({locations.length})
                            </label>
                        </div>
                        
                        <select 
                            value={optimizationMode} 
                            onChange={(e) => setOptimizationMode(e.target.value)}
                            className="custom-input !bg-gray-50 mb-3"
                        >
                            <option value="balanced">⚖️ Cân bằng (Tối ưu tổng thể)</option>
                            <option value="shortest">📏 Ưu tiên đường ngắn nhất</option>
                            <option value="fastest">⚡ Ưu tiên thời gian nhanh nhất</option>
                        </select>

                        <div className="location-list">
                            {locations.map((loc, index) => {
                                const isKho = index === 0;
                                const minVal = loc.time_window ? loc.time_window[0] / 60 : '';
                                const maxVal = loc.time_window && loc.time_window[1] < 86400 ? loc.time_window[1] / 60 : '';

                                return (
                                    <div key={index} className="loc-item">
                                        <div className="item-header">
                                            <span className={`loc-name ${isKho ? 'is-depot' : ''}`}>
                                                {isKho ? <><FaWarehouse/> {loc.id}</> : `${index}. ${loc.id}`}
                                            </span>
                                            {!isKho && (
                                                <button className="btn-delete" onClick={() => removeLocation(loc.id)}>
                                                    <FaTrashAlt />
                                                </button>
                                            )}
                                        </div>

                                        {!isKho && (
                                            <div className="time-window-box">
                                                <span className="tw-label"><FaClock /> Giao từ:</span>
                                                <input 
                                                    type="number" min="0" placeholder="Phút" 
                                                    className="tw-input" value={minVal}
                                                    onChange={(e) => updateTimeWindow(loc.id, e.target.value, maxVal)}
                                                />
                                                <span className="tw-label">đến</span>
                                                <input 
                                                    type="number" min="0" placeholder="Phút" 
                                                    className="tw-input" value={maxVal}
                                                    onChange={(e) => updateTimeWindow(loc.id, minVal, e.target.value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* NÚT SUBMIT */}
                    <button 
                        onClick={fetchOptimization} 
                        disabled={isLoading || locations.length < 3}
                        className={`btn-submit ${(!isLoading && locations.length >= 3) ? 'ready' : 'disabled'}`}
                    >
                        {isLoading ? (
                            <>⏳ ĐANG XỬ LÝ...</>
                        ) : (
                            <><FaRocket /> TỐI ƯU TUYẾN ĐƯỜNG</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default InputPanel;