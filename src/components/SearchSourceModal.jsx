// src/components/SearchSourceModal.jsx
// Bottom sheet modal — ΟΧΙ fullscreen, εμφανίζεται από κάτω
// Props: isOpen, onSelectSource, onClose, currentSource
import React from 'react';
import { X } from 'lucide-react';

const SOURCES = [
  {
    key: 'skroutz',
    icon: '🚀',
    label: 'Skroutz',
    desc: 'Σύγκριση τιμών από εκατοντάδες καταστήματα',
    bg: '#eff6ff', border: '#bfdbfe', active: '#3b82f6', text: '#1d4ed8',
  },
  {
    key: 'stores',
    icon: '🛍️',
    label: 'Καταστήματα',
    desc: 'Public, Plaisio, MediaMarkt, Jumbo κ.ά.',
    bg: '#f0fdf4', border: '#bbf7d0', active: '#22c55e', text: '#15803d',
  },
  {
    key: 'all',
    icon: '🌍',
    label: 'Παντού',
    desc: 'Skroutz + Καταστήματα — πλήρης αγορά',
    bg: '#fff7ed', border: '#fed7aa', active: '#f97316', text: '#c2410c',
  },
];

export default function SearchSourceModal({ isOpen, currentSource, onSelectSource, onClose }) {
  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 9000,
      }} />

      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 9001,
        background: 'white',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        maxWidth: 480,
        margin: '0 auto',
        maxHeight: '52vh',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '14px 20px 10px',
          position: 'sticky', top: 0,
          background: 'white',
          borderBottom: '1px solid #f1f5f9',
          zIndex: 1,
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e2e8f0', margin: '0 auto 12px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#1e293b', margin: 0 }}>🔍 Πού να ψάξω;</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', fontWeight: 600 }}>Επίλεξε πηγή αναζήτησης</p>
            </div>
            <button onClick={onClose} style={{
              background: '#f1f5f9', border: 'none', borderRadius: 10,
              padding: '6px 8px', cursor: 'pointer',
            }}>
              <X size={16} color="#64748b" />
            </button>
          </div>
        </div>

        <div style={{ padding: '10px 16px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SOURCES.map(src => {
            const isActive = currentSource === src.key;
            return (
              <button key={src.key} onClick={() => onSelectSource(src.key)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                borderRadius: 16,
                border: `2px solid ${isActive ? src.active : src.border}`,
                background: isActive ? src.bg : 'white',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: isActive ? `0 2px 10px ${src.border}` : 'none',
                textAlign: 'left', width: '100%',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: isActive ? `${src.border}80` : '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>{src.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 900, color: isActive ? src.text : '#1e293b', margin: 0 }}>{src.label}</p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '1px 0 0', fontWeight: 500 }}>{src.desc}</p>
                </div>
                {isActive && (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: src.active,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 11, flexShrink: 0, fontWeight: 900,
                  }}>✓</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
