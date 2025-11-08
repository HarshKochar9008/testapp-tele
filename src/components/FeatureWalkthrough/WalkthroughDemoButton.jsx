import React, { useState } from 'react';
import { getWalkthroughData, clearAllWalkthroughData, completeWalkthrough, resetWalkthrough } from '../../utils/walkthroughUtils';

/**
 * Simple demo button to test walkthrough localStorage functionality
 * This can be added to any page for testing purposes
 */
const WalkthroughDemoButton = ({ onShowWalkthrough }) => {
  const [walkthroughData, setWalkthroughData] = useState(getWalkthroughData());

  const refreshData = () => {
    setWalkthroughData(getWalkthroughData());
  };

  const handleCompleteWalkthrough = () => {
    completeWalkthrough();
    refreshData();
  };

  const handleResetWalkthrough = () => {
    resetWalkthrough();
    refreshData();
  };

  const handleClearAllData = () => {
    clearAllWalkthroughData();
    refreshData();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: 1000,
      maxWidth: '200px'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#00d4ff' }}>
        🎯 Walkthrough Demo
      </div>
      
      <div style={{ marginBottom: '8px', fontSize: '10px' }}>
        <div>Completed: {walkthroughData.completed ? '✅' : '❌'}</div>
        <div>Version: {walkthroughData.version || 'None'}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button 
          onClick={onShowWalkthrough}
          style={{
            background: '#00d4ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Show Walkthrough
        </button>
        
        <button 
          onClick={handleCompleteWalkthrough}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Mark Complete
        </button>
        
        <button 
          onClick={handleResetWalkthrough}
          style={{
            background: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
        
        <button 
          onClick={handleClearAllData}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '10px',
            cursor: 'pointer'
          }}
        >
          Clear All
        </button>
      </div>

      <div style={{ marginTop: '8px', fontSize: '9px', color: '#ccc' }}>
        localStorage Keys:<br/>
        • eonx_app_walkthrough_completed<br/>
        • eonx_app_walkthrough_version<br/>
        • eonx_app_walkthrough_completed_timestamp
      </div>
    </div>
  );
};

export default WalkthroughDemoButton;
