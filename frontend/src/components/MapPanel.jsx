import React, { useState, useEffect } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, FullscreenControl } from 'react-map-gl';
import { FaWarehouse, FaMapMarkerAlt, FaSun, FaMoon, FaCube, FaLayerGroup, FaCheckCircle } from 'react-icons/fa';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapPanel.scss';
import useRouteStore from '../store/useRouteStore';

const MapPanel = () => {
    const { locations, optimizedResult, mapConfig, setMapStyle, toggle3D } = useRouteStore();
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

    const [viewState, setViewState] = useState({
        longitude: 108.2022,
        latitude: 16.0544,
        zoom: 13,
        pitch: mapConfig.pitch || 0,
        bearing: 0
    });

    // Đồng bộ viewState khi store thay đổi (chuyển 2D/3D)
    useEffect(() => {
        setViewState(prev => ({
            ...prev,
            pitch: mapConfig.is3D ? 45 : 0,
            transitionDuration: 800
        }));
    }, [mapConfig.is3D]);

    const routeData = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: optimizedResult?.route_geometry?.map(c => [c[1], c[0]]) || []
        }
    };

    return (
        <div className="map-panel-container">
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapConfig.style}
                mapboxAccessToken={mapboxToken}
            >
                <NavigationControl position="bottom-right" />
                <FullscreenControl position="top-right" />

                {/* Vẽ tuyến đường */}
                {optimizedResult && (
                    <Source id="route-source" type="geojson" data={routeData}>
                        <Layer
                            id="route-layer"
                            type="line"
                            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                            paint={{ 'line-color': '#2563eb', 'line-width': 6 }}
                        />
                    </Source>
                )}

                {/* Hiển thị Marker dùng React Icons */}
                {(optimizedResult?.optimized_route || locations).map((loc, index) => {
                    const isKho = index === 0;
                    const isDelivered = loc.isDelivered;

                    return (
                        <Marker key={index} longitude={loc.lng} latitude={loc.lat} anchor="bottom">
                            <div className={`marker-wrapper ${isKho ? 'depot-marker' : 'delivery-marker'} ${isDelivered ? 'delivered' : ''}`}>
                                {isKho ? (
                                    <FaWarehouse size={32} />
                                ) : isDelivered ? (
                                    <FaCheckCircle size={24} className="text-green-500" />
                                ) : (
                                    <FaMapMarkerAlt size={28} />
                                )}
                            </div>
                        </Marker>
                    );
                })}

                {/* --- SETTINGS PANEL (DƯỚI GÓC TRÁI) --- */}
                <div className="map-custom-controls">
                    {/* Switch Sáng/Tối */}
                    <div className="control-card">
                        <button 
                            className={!mapConfig.style.includes('night') ? 'active' : ''}
                            onClick={() => setMapStyle('mapbox://styles/mapbox/streets-v12')}
                        >
                            <FaSun /> Sáng
                        </button>
                        <button 
                            className={mapConfig.style.includes('night') ? 'active' : ''}
                            onClick={() => setMapStyle('mapbox://styles/mapbox/navigation-night-v1')}
                        >
                            <FaMoon /> Tối
                        </button>
                    </div>

                    {/* Switch 2D/3D */}
                    <div className="control-card">
                        <button 
                            className={!mapConfig.is3D ? 'active' : ''}
                            onClick={() => toggle3D(false)}
                        >
                            <FaLayerGroup /> 2D
                        </button>
                        <button 
                            className={mapConfig.is3D ? 'active' : ''}
                            onClick={() => toggle3D(true)}
                        >
                            <FaCube /> 3D
                        </button>
                    </div>
                </div>
            </Map>
        </div>
    );
};

export default MapPanel;