import React from 'react';
import './TodoPopup.css';

const TodoPopup = ({ isOpen, onClose, todoList, tierNumber }) => {
    if (!isOpen) return null;

    return (
        <div className="todo-popup-overlay" onClick={onClose}>
            <div className="todo-popup-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="todo-popup-header">
                    <div className="todo-popup-title">
                        <span className="todo-icon">📋</span>
                        <h3>Level {tierNumber} Tasks</h3>
                    </div>
                    <button className="todo-popup-close" onClick={onClose}>
                        <span>✕</span>
                    </button>
                </div>

                {/* Content */}
                <div className="todo-popup-content">
                    {todoList && todoList.length > 0 ? (
                        <div className="todo-list">
                            {todoList.map((todo, index) => (
                                <div key={index} className="todo-item">
                                    <div className="todo-item-icon">
                                        <span>📌</span>
                                    </div>
                                    <div className="todo-item-content">
                                        <p>{todo}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-todos">
                            <div className="no-todos-icon">
                                <span>🎉</span>
                            </div>
                            <p>No tasks available for this level!</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="todo-popup-footer">
                    <button className="todo-popup-ok-btn" onClick={onClose}>
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TodoPopup;
