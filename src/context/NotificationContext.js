import React, { createContext, useContext, useState } from 'react';
import Modal from '../components/Modal/Modal';
import './NotificationContext.css';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    type: 'coming-soon' // 'coming-soon', 'info', 'success', 'error'
  });

  const showComingSoon = (customMessage = null) => {
    setModalContent({
      title: 'Coming Soon',
      message: customMessage || 'Our beta version is live and being tested by a group of selected users!',
      type: 'coming-soon'
    });
    setIsModalOpen(true);
  };

  const showNotification = (title, message, type = 'info') => {
    setModalContent({
      title,
      message,
      type
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const value = {
    showComingSoon,
    showNotification,
    closeModal
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <div className={`notification-modal ${modalContent.type}`}>
          <div className="notification-icon">
            {modalContent.type === 'coming-soon' && (
              <div className="coming-soon-icon">🚀</div>
            )}
            {modalContent.type === 'info' && (
              <div className="info-icon">ℹ️</div>
            )}
            {modalContent.type === 'success' && (
              <div className="success-icon">✅</div>
            )}
            {modalContent.type === 'error' && (
              <div className="error-icon">❌</div>
            )}
          </div>
          <h3 className="notification-title">{modalContent.title}</h3>
          <p className="notification-message">{modalContent.message}</p>
          <button className="notification-button" onClick={closeModal}>
            Got it!
          </button>
        </div>
      </Modal>
    </NotificationContext.Provider>
  );
}; 