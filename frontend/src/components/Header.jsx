import React from 'react';
import { FiShield, FiSettings, FiUser, FiMenu } from 'react-icons/fi';

const Header = ({ onMenuToggle, isMobileMenuOpen }) => {
  return (
    <header className="header">
      <div className="flex align-center gap-2">
        <button 
          className="btn-secondary md:hidden"
          onClick={onMenuToggle}
          style={{ padding: '8px', background: 'transparent', border: 'none' }}
        >
          <FiMenu size={20} />
        </button>
        
        <div className="flex align-center gap-2">
          <FiShield size={32} style={{ color: 'var(--primary-purple)' }} />
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>
            The FRAUDfather
          </h1>
        </div>
        
        <div style={{ 
          background: 'linear-gradient(135deg, var(--primary-purple), var(--secondary-purple))',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '500',
          marginLeft: '12px'
        }}>
          AI Detection Engine
        </div>
      </div>
      
      <div className="flex align-center gap-2">
        <div className="flex align-center gap-1" style={{ 
          fontSize: '0.85rem', 
          color: 'var(--text-muted)',
          marginRight: '16px'
        }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            background: 'var(--success-color)', 
            borderRadius: '50%' 
          }}></div>
          <span>98.7% Accuracy</span>
        </div>
        
        <button className="btn-secondary" style={{ padding: '8px 16px' }}>
          <FiSettings size={16} />
          <span>Settings</span>
        </button>
        
        <button className="btn-secondary" style={{ padding: '8px 12px' }}>
          <FiUser size={16} />
        </button>
      </div>
    </header>
  );
};

export default Header;