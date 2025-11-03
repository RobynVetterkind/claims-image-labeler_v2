import React, { useState } from 'react';
import { 
  FiScan, 
  FiBarChart3, 
  FiClock, 
  FiFileText, 
  FiSettings, 
  FiHelpCircle,
  FiTrendingUp,
  FiShield
} from 'react-icons/fi';

const Sidebar = ({ isOpen, onClose }) => {
  const [activeItem, setActiveItem] = useState('detect');

  const navigationItems = [
    {
      id: 'detect',
      label: 'AI Detection',
      icon: FiScan,
      description: 'Upload & analyze images'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: FiBarChart3,
      description: 'View detection stats'
    },
    {
      id: 'history',
      label: 'History',
      icon: FiClock,
      description: 'Past analyses'
    },
    {
      id: 'batch',
      label: 'Batch Processing',
      icon: FiFileText,
      description: 'Bulk analysis'
    }
  ];

  const bottomItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: FiSettings
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: FiHelpCircle
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            display: 'block'
          }}
          onClick={onClose}
          className="md:hidden"
        />
      )}
      
      <aside 
        className={`sidebar ${isOpen ? 'open' : ''}`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease'
        }}
      >
        <div style={{ padding: '24px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Logo Section */}
          <div style={{ padding: '0 20px', marginBottom: '32px' }}>
            <div className="flex align-center gap-2">
              <FiShield size={24} style={{ color: 'var(--primary-purple)' }} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>FRAUDfather</h2>
            </div>
            <p style={{ 
              fontSize: '0.8rem', 
              color: 'var(--text-muted)', 
              marginTop: '4px',
              margin: 0 
            }}>
              AI Image Detection
            </p>
          </div>

          {/* Main Navigation */}
          <nav style={{ flex: 1 }}>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '0 20px',
                marginBottom: '12px'
              }}>
                Main
              </h3>
              
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                
                return (
                  <a
                    key={item.id}
                    href="#"
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveItem(item.id);
                    }}
                    style={{
                      background: isActive ? 'var(--card-bg)' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--primary-purple)' : '3px solid transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    <Icon size={18} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                        {item.label}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-muted)',
                        lineHeight: '1.2'
                      }}>
                        {item.description}
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Stats Card */}
            <div style={{
              margin: '0 20px',
              padding: '16px',
              background: 'rgba(114, 9, 183, 0.1)',
              border: '1px solid rgba(114, 9, 183, 0.2)',
              borderRadius: 'var(--border-radius-sm)',
              marginBottom: '24px'
            }}>
              <div className="flex align-center gap-2 mb-2">
                <FiTrendingUp size={16} style={{ color: 'var(--secondary-purple)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--secondary-purple)' }}>
                  Detection Stats
                </span>
              </div>
              
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div className="flex justify-between mb-1">
                  <span>Images analyzed:</span>
                  <span style={{ color: 'var(--secondary-purple)', fontWeight: '500' }}>1,247</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>AI-generated:</span>
                  <span style={{ color: 'var(--error-color)', fontWeight: '500' }}>23%</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span style={{ color: 'var(--success-color)', fontWeight: '500' }}>98.7%</span>
                </div>
              </div>
            </div>
          </nav>

          {/* Bottom Navigation */}
          <div style={{ 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '16px' 
          }}>
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;
              
              return (
                <a
                  key={item.id}
                  href="#"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveItem(item.id);
                  }}
                  style={{
                    background: isActive ? 'var(--card-bg)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  <Icon size={16} />
                  <span style={{ fontSize: '0.9rem' }}>{item.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;