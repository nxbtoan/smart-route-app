import React, { useState } from 'react';
import axios from 'axios';
import useRouteStore from '../store/useRouteStore';
import { FaTimes, FaUser, FaLock, FaTruck, FaSpinner } from 'react-icons/fa';
import './AuthModal.scss';

const AuthModal = () => {
    const { isAuthModalOpen, toggleAuthModal, setUser } = useRouteStore();
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isAuthModalOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
        
        try {
            const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            const res = await axios.post(`${BASE_URL}${endpoint}`, { username, password });
            if (res.data.status === 'success') {
                if (isLoginMode) {
                    setUser(res.data.username); 
                    toggleAuthModal(false); // Đăng nhập xong thì tự động đóng Popup
                } else {
                    setIsLoginMode(true); 
                    setError('Đăng ký thành công! Vui lòng đăng nhập.');
                    setPassword(''); 
                }
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Có lỗi xảy ra, vui lòng thử lại!');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleMode = () => {
        setIsLoginMode(!isLoginMode); 
        setError('');
        setUsername('');
        setPassword('');
    };

    return (
        <div className="auth-overlay">
            <div className="auth-modal">
                {/* Nút Đóng */}
                <button className="btn-close" onClick={() => toggleAuthModal(false)}>
                    <FaTimes size={18} />
                </button>
                
                {/* Header */}
                <div className="modal-header">
                    <div className="header-icon">
                        <FaTruck />
                    </div>
                    <h2>{isLoginMode ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
                    <p>{isLoginMode ? 'Mừng bạn quay trở lại hệ thống' : 'Đăng ký để lưu trữ lộ trình của bạn'}</p>
                </div>

                {/* Thông báo lỗi / thành công */}
                {error && (
                    <div className={`message-box ${error.includes('thành công') ? 'success' : 'error'}`}>
                        {error}
                    </div>
                )}

                {/* Form nhập liệu */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <FaUser className="input-icon" />
                        <input 
                            className="auth-input" type="text" placeholder="Tên đăng nhập" 
                            value={username} onChange={(e) => setUsername(e.target.value)} required
                        />
                    </div>
                    <div className="input-group">
                        <FaLock className="input-icon" />
                        <input 
                            className="auth-input" type="password" placeholder="Mật khẩu" 
                            value={password} onChange={(e) => setPassword(e.target.value)} required
                        />
                    </div>
                    
                    <button type="submit" disabled={isLoading} className={`btn-submit ${isLoading ? 'loading' : ''}`}>
                        {isLoading ? (
                            <><FaSpinner className="animate-spin" /> ĐANG XỬ LÝ...</>
                        ) : (
                            isLoginMode ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ TÀI KHOẢN'
                        )}
                    </button>
                </form>

                {/* Chuyển đổi Đăng nhập / Đăng ký */}
                <div className="toggle-section">
                    {isLoginMode ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                    <span className="toggle-link" onClick={handleToggleMode}>
                        {isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;