import React, { useState, useEffect } from 'react';
import { X, Rocket, ShoppingBag, Globe } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SearchSourceModal = ({ visible, onClose, onSelect }) => {
  const [searchSource, setSearchSource] = useState('linkwise');
  const [rememberChoice, setRememberChoice] = useState(false);

  // Load saved preference when modal opens
  useEffect(() => {
    if (visible) {
      loadPreference();
    }
  }, [visible]);

  const loadPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('searchSourcePreference');
      const savedRemember = await AsyncStorage.getItem('rememberSearchSourceChoice');
      
      if (saved) {
        setSearchSource(saved);
      }
      if (savedRemember) {
        setRememberChoice(savedRemember === 'true');
      }
    } catch (error) {
      console.log('Failed to load search source preference:', error);
    }
  };

  const savePreference = async (source, remember) => {
    try {
      if (remember) {
        await AsyncStorage.setItem('searchSourcePreference', source);
        await AsyncStorage.setItem('rememberSearchSourceChoice', 'true');
      } else {
        await AsyncStorage.removeItem('searchSourcePreference');
        await AsyncStorage.removeItem('rememberSearchSourceChoice');
      }
    } catch (error) {
      console.log('Failed to save search source preference:', error);
    }
  };

  const handleSelect = (source) => {
    setSearchSource(source);
    savePreference(source, rememberChoice);
    onSelect(source);
    onClose();
  };

  const handleCancel = () => {
    savePreference(searchSource, rememberChoice);
    onClose();
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        margin: 20,
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 25,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: '700',
            color: '#2d3748',
            fontFamily: 'Arial, sans-serif',
          }}>
            Πού θα ψάξουμε;
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#718096',
              padding: 0,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 15,
          marginBottom: 25,
        }}>
          {/* Skroutz Button */}
          <button
            onClick={() => handleSelect('skroutz')}
            style={{
              backgroundColor: '#e6f3ff',
              border: searchSource === 'skroutz' ? '3px solid #3182ce' : '3px solid transparent',
              borderRadius: 15,
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (searchSource !== 'skroutz') {
                e.target.style.backgroundColor = '#dbeafe';
              }
            }}
            onMouseLeave={(e) => {
              if (searchSource !== 'skroutz') {
                e.target.style.backgroundColor = '#e6f3ff';
              }
            }}
          >
            <div style={{
              backgroundColor: '#3182ce',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Rocket size={24} color="white" />
            </div>
            <span style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#2d3748',
              textAlign: 'left',
            }}>
              Skroutz (Σύγκριση Τιμών)
            </span>
          </button>

          {/* Linkwise Button */}
          <button
            onClick={() => handleSelect('linkwise')}
            style={{
              backgroundColor: '#f0fdf4',
              border: searchSource === 'linkwise' ? '3px solid #16a34a' : '3px solid transparent',
              borderRadius: 15,
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (searchSource !== 'linkwise') {
                e.target.style.backgroundColor = '#dcfce7';
              }
            }}
            onMouseLeave={(e) => {
              if (searchSource !== 'linkwise') {
                e.target.style.backgroundColor = '#f0fdf4';
              }
            }}
          >
            <div style={{
              backgroundColor: '#16a34a',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShoppingBag size={24} color="white" />
            </div>
            <span style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#2d3748',
              textAlign: 'left',
            }}>
              Άλλα Καταστήματα (Feeds)
            </span>
          </button>

          {/* All Sources Button */}
          <button
            onClick={() => handleSelect('all')}
            style={{
              backgroundColor: '#fed7aa',
              border: searchSource === 'all' ? '3px solid #ea580c' : '3px solid transparent',
              borderRadius: 15,
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (searchSource !== 'all') {
                e.target.style.backgroundColor = '#ffedd5';
              }
            }}
            onMouseLeave={(e) => {
              if (searchSource !== 'all') {
                e.target.style.backgroundColor = '#fed7aa';
              }
            }}
          >
            <div style={{
              backgroundColor: '#ea580c',
              borderRadius: 10,
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Globe size={24} color="white" />
            </div>
            <span style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#2d3748',
              textAlign: 'left',
            }}>
              Ψάξε Παντού!
            </span>
          </button>
        </div>

        {/* Checkbox and Cancel */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 14,
            color: '#4a5568',
          }}>
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                cursor: 'pointer',
              }}
            />
            Να θυμάσαι την επιλογή μου
          </label>
          
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#718096',
              fontSize: 14,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 5,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchSourceModal;
