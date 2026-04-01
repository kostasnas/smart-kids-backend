import React from 'react';

const SearchSourceModal = ({ isVisible, onSelect, onClose }) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', 
      display: 'flex',
      justifyContent: 'center', 
      alignItems: 'center', 
      zIndex: 99999
    }}>
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: '24px',
        padding: '32px 24px',
        maxWidth: '320px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: 'none'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '800',
          marginBottom: '8px',
          textAlign: 'center',
          color: '#1e293b'
        }}>
          Πηγή Αναζήτησης
        </h2>
        <p style={{
          fontSize: '14px',
          color: '#64748b',
          textAlign: 'center',
          marginBottom: '24px',
          lineHeight: '1.4'
        }}>
          Επέλεξε από πού θέλεις να ψάξουμε για προϊόντα
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => onSelect('skroutz')}
            style={{
              background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.25)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
            }}
          >
            <span style={{ fontSize: '24px' }}>🚀</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '700', 
                color: '#1d4ed8',
                marginBottom: '2px'
              }}>
                Skroutz
              </div>
              <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                Σύγκριση τιμών από χιλιάδες καταστήματα
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('stores')}
            style={{
              background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.25)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.15)';
            }}
          >
            <span style={{ fontSize: '24px' }}>🛍️</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '700', 
                color: '#15803d',
                marginBottom: '2px'
              }}>
                Καταστήματα
              </div>
              <div style={{ fontSize: '12px', color: '#22c55e' }}>
                Απευθείας από Public, Plaisio, MediaMarkt
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('all')}
            style={{
              background: 'linear-gradient(135deg, #fed7aa, #ffedd5)',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.02)';
              e.target.style.boxShadow = '0 6px 20px rgba(249, 115, 22, 0.25)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 4px 12px rgba(249, 115, 22, 0.15)';
            }}
          >
            <span style={{ fontSize: '24px' }}>🌍</span>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: '700', 
                color: '#c2410c',
                marginBottom: '2px'
              }}>
                Παντού
              </div>
              <div style={{ fontSize: '12px', color: '#f97316' }}>
                Συνδυασμός όλων των πηγών
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            marginTop: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            color: '#64748b',
            width: '100%',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#e2e8f0';
          }}
          onMouseOut={(e) => {
            e.target.style.background = '#f1f5f9';
          }}
        >
          Άκυρο
        </button>
      </div>
    </div>
  );
};

export default SearchSourceModal;