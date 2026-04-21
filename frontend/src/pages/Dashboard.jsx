import React from 'react';
import MapPanel from '../components/MapPanel';
import InputPanel from '../components/InputPanel';
import ResultPanel from '../components/ResultPanel';
import AuthModal from '../components/AuthModal';
import useRouteStore from '../store/useRouteStore';
import { FaUserCircle, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';
import './Dashboard.scss';

const Dashboard = () => {
    const { user, setUser, toggleAuthModal } = useRouteStore();

    return (
        <div className="dashboard-container">
            {/* Lớp Bản đồ lót nền */}
            <div className="map-layer">
                <MapPanel />
            </div>

            {/* Cụm Đăng nhập / Tài khoản (Góc trên phải) */}
            <div className="top-right-auth">
                {user ? (
                    <div className="user-profile">
                        <span className="greeting">
                            <FaUserCircle className="avatar-icon" />
                            Chào, {user}
                        </span>
                        <button 
                            onClick={() => setUser(null)} 
                            className="btn-logout" 
                            title="Đăng xuất"
                        >
                            <FaSignOutAlt size={16} />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => toggleAuthModal(true)} 
                        className="btn-login"
                    >
                        <FaSignInAlt size={16} /> Đăng nhập
                    </button>
                )}
            </div>

            {/* Cột Sidebar chứa các Panel (Góc trên trái) */}
            <div className="sidebar-layer">
                <InputPanel />
                <ResultPanel />
            </div>

            {/* Gọi AuthModal (Tự động ẩn/hiện) */}
            <AuthModal />
        </div>
    );
};

export default Dashboard;