import React, { useState } from 'react';
import { SearchBox } from '@mapbox/search-js-react';
import {
  MapPin, Navigation, Trash2, Loader2, Route as RouteIcon,
  Clock, ChevronUp, ChevronDown, GripVertical, Map, Plus, Crosshair
} from 'lucide-react';
import useRouteStore from '../store/useRouteStore';
import axios from 'axios';
import './InputPanel.scss';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 3600 + m * 60;
};

const MODES = ['balanced', 'fastest', 'shortest'];

const MODE_LABELS = {
  balanced: 'Cân bằng',
  fastest:  'Nhanh nhất',
  shortest: 'Ngắn nhất',
};

const InputPanel = () => {
  const {
    locations, addLocation, removeLocation,
    updateTimeWindow, reorderLocations, setAllRoutesData,
  } = useRouteStore();

  const [loading, setLoading]       = useState(false);
  const [progress, setProgress]     = useState({ current: 0, total: 0, mode: '' });
  const [isExpanded, setIsExpanded] = useState(true);
  const [searchKey, setSearchKey]   = useState(0);
  const [inputType, setInputType]   = useState('mapbox');
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [manualData, setManualData] = useState({ name: '', lat: '', lng: '' });

  // ── 1. Mapbox SearchBox ──────────────────────────────────────────────────
  const handleRetrieve = (res) => {
    const feature = res.features[0];
    const [lng, lat] = feature.geometry.coordinates;
    const addressName = feature.properties.name || feature.properties.full_address;
    addLocation({ id: `loc_${Date.now()}`, name: addressName, lat, lng, time_window: [28800, 61200] });
    setSearchKey(prev => prev + 1);
  };

  // ── 2. Nhập tọa độ thủ công ──────────────────────────────────────────────
  const handleManualAdd = () => {
    if (!manualData.name || !manualData.lat || !manualData.lng)
      return alert('Vui lòng điền đủ thông tin!');
    addLocation({
      id: `loc_${Date.now()}`,
      name: manualData.name,
      lat: parseFloat(manualData.lat),
      lng: parseFloat(manualData.lng),
      time_window: [28800, 61200],
    });
    setManualData({ name: '', lat: '', lng: '' });
  };

  // ── 3. Drag & Drop ───────────────────────────────────────────────────────
  const handleDragStart = (e, index) => {
    if (index === 0) return e.preventDefault();
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (draggedIdx === null || dropIdx === 0 || draggedIdx === dropIdx) return;
    reorderLocations(draggedIdx, dropIdx);
    setDraggedIdx(null);
  };

  // ── 4. Optimize — chạy TUẦN TỰ để tránh CPU contention & rate limit ─────
  const handleOptimize = async () => {
    if (locations.length < 3) return alert('⚠️ Cần ít nhất 1 Kho và 2 Điểm giao!');
    setLoading(true);
    setProgress({ current: 0, total: MODES.length, mode: '' });

    const payloadBase = {
      locations: locations.map(({ id, lat, lng, time_window }) => ({ id, lat, lng, time_window })),
    };

    try {
      const newRoutesData = {};

      // Chạy tuần tự — tránh 3 luồng OR-Tools tranh CPU, tránh Mapbox rate limit
      for (let i = 0; i < MODES.length; i++) {
        const mode = MODES[i];
        setProgress({ current: i + 1, total: MODES.length, mode });

        const res = await axios.post('http://localhost:8000/api/optimize', {
          ...payloadBase,
          mode,
        });

        if (res.data.status === 'success') {
          newRoutesData[mode] = res.data;
        }
      }

      if (Object.keys(newRoutesData).length > 0) {
        setAllRoutesData(newRoutesData);
        setIsExpanded(false);
      } else {
        alert('❌ Thuật toán không tìm được đường. Hãy kiểm tra lại tọa độ các điểm!');
      }
    } catch {
      alert('🔌 Không thể kết nối Backend!');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, mode: '' });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const progressPct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className={`input-panel-container ${isExpanded ? 'expanded' : 'collapsed'}`}>

      {/* ── Header ── */}
      <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="title-wrapper">
          <RouteIcon className="main-icon" />
          <div>
            <h2>Smart Route</h2>
            <p className="panel-subtitle">Tối ưu hoá giao hàng AI</p>
          </div>
        </div>
        <button className="toggle-btn" aria-label="Toggle panel">
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* ── Body ── */}
      {isExpanded && (
        <div className="panel-body">

          {/* Tabs */}
          <div className="input-tabs">
            <button
              className={inputType === 'mapbox' ? 'active' : ''}
              onClick={() => setInputType('mapbox')}
            >
              <MapPin size={13} /> Tìm Địa Chỉ
            </button>
            <button
              className={inputType === 'manual' ? 'active' : ''}
              onClick={() => setInputType('manual')}
            >
              <Crosshair size={13} /> Nhập Tọa Độ
            </button>
          </div>

          {/* Input area */}
          <div className="input-section">
            {inputType === 'mapbox' ? (
              <div className="mapbox-search-wrapper">
                <SearchBox
                  key={searchKey}
                  accessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                  options={{ language: 'vi', country: 'vn', proximity: [108.2022, 16.0544] }}
                  onRetrieve={handleRetrieve}
                  placeholder="📍 Nhập tên đường, tòa nhà..."
                  theme={{
                    variables: {
                      fontFamily: 'inherit', unit: '14px',
                      padding: '0.85em', border: 'none', boxShadow: 'none',
                    },
                  }}
                />
              </div>
            ) : (
              <div className="manual-input-wrapper">
                <input
                  type="text" placeholder="Tên địa điểm..."
                  className="custom-input" value={manualData.name}
                  onChange={e => setManualData({ ...manualData, name: e.target.value })}
                />
                <div className="coord-row">
                  <input
                    type="number" placeholder="Vĩ độ (Lat)"
                    className="custom-input" value={manualData.lat}
                    onChange={e => setManualData({ ...manualData, lat: e.target.value })}
                  />
                  <input
                    type="number" placeholder="Kinh độ (Lng)"
                    className="custom-input" value={manualData.lng}
                    onChange={e => setManualData({ ...manualData, lng: e.target.value })}
                  />
                </div>
                <button onClick={handleManualAdd} className="btn-add-manual">
                  <Plus size={14} /> Thêm Điểm Mới
                </button>
              </div>
            )}
          </div>

          {/* Location list */}
          <div className="location-list custom-scrollbar">
            <label className="section-title">
              Trạm dừng <span className="count-badge">{locations.length}</span>
            </label>

            {locations.length === 0 ? (
              <div className="empty-state">
                <MapPin size={28} strokeWidth={1.2} />
                <p>Chưa có điểm nào được thêm.</p>
              </div>
            ) : (
              <ul>
                {locations.map((loc, index) => (
                  <li
                    key={loc.id}
                    className={`loc-item ${index === 0 ? 'is-depot' : 'is-stop'} ${draggedIdx === index ? 'dragging' : ''}`}
                    draggable={index > 0}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <div className="loc-main">
                      {index > 0 && (
                        <GripVertical size={15} className="drag-handle" />
                      )}

                      <div className={`loc-icon ${index === 0 ? 'depot-icon' : 'stop-icon'}`}>
                        {index === 0 ? <Navigation size={13} /> : <MapPin size={13} />}
                      </div>

                      <div className="loc-info">
                        <span className="loc-label">
                          {index === 0 ? 'Kho Xuất Phát' : `Điểm giao #${index}`}
                        </span>
                        <span className="loc-name" title={loc.name}>{loc.name}</span>
                      </div>

                      <button
                        onClick={() => removeLocation(loc.id)}
                        className="btn-delete"
                        aria-label="Xoá điểm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {index > 0 && (
                      <div className="time-window-box">
                        <Clock size={12} className="tw-icon" />
                        <span className="tw-label">Giao lúc:</span>
                        <input
                          type="time"
                          value={formatTime(loc.time_window[0])}
                          onChange={(e) => updateTimeWindow(loc.id, [parseTime(e.target.value), loc.time_window[1]])}
                          className="tw-input"
                        />
                        <span className="tw-sep">–</span>
                        <input
                          type="time"
                          value={formatTime(loc.time_window[1])}
                          onChange={(e) => updateTimeWindow(loc.id, [loc.time_window[0], parseTime(e.target.value)])}
                          className="tw-input"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="action-footer">

            {/* Progress bar — chỉ hiện khi đang loading */}
            {loading && (
              <div className="progress-wrapper">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="progress-label">
                  [{progress.current}/{progress.total}] Đang tính chế độ{' '}
                  <strong>{MODE_LABELS[progress.mode] ?? progress.mode}</strong>...
                </p>
              </div>
            )}

            <button
              onClick={handleOptimize}
              disabled={loading || locations.length < 3}
              className={`btn-submit ${loading || locations.length < 3 ? 'disabled' : 'ready'}`}
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <Map size={16} />}
              {loading ? 'Đang tính toán...' : 'TỐI ƯU LỘ TRÌNH'}
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default InputPanel;