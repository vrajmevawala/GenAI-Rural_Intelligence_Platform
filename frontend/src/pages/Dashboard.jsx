import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFarmer, getFVI, getAlert } from '../api';
import { translations } from '../translations';

import Header from '../components/Header';

function Dashboard() {
  const [fviData, setFviData] = useState(null);
  const [advice, setAdvice] = useState('');
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const farmerId = localStorage.getItem('farmer_id');
  const navigate = useNavigate();

  useEffect(() => {
    if (!farmerId) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [farmerRes, fviRes, alertRes] = await Promise.all([
          getFarmer(farmerId),
          getFVI(farmerId),
          getAlert(farmerId)
        ]);
        setFarmer(farmerRes.data);
        setFviData(fviRes.data);
        setAdvice(alertRes.data.advice);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [farmerId, navigate]);

  const t = translations[farmer?.language || 'English'];

  if (loading) return <div className="loader"></div>;
  if (error) return (
    <div className="container">
      <div className="glass-card" style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>{error}</h2>
        <button className="btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <div className="container" style={{ maxWidth: '1000px' }}>
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← {t.back}
        </button>

        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p className="label">{t.dashboard}</p>
          <h1 style={{ marginTop: '0.5rem', marginBottom: '2.5rem' }}>👋 {t.namaste}, {farmer?.name}</h1>
          
          <div className="metric-box">
            <p className="label" style={{ marginBottom: '1rem', fontWeight: 'bold' }}>{t.riskScore}</p>
            <div className={`fvi-display risk-text-${fviData?.risk_level}`} style={{ fontSize: '6rem' }}>
              {Math.round(fviData?.fvi_score)}
            </div>
            <div className={`risk-tag risk-${fviData?.risk_level}`}>
              {fviData?.risk_level} RISK
            </div>
          </div>

          <div className="fvi-breakdown" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <div className="breakdown-item">
              <span className="label">{t.cropType}</span>
              <div className="value">+{fviData?.breakdown?.crop}</div>
            </div>
            <div className="breakdown-item">
              <span className="label">{t.soilCropCompatibility}</span>
              <div className="value">+{fviData?.breakdown?.soil_crop}</div>
            </div>
            <div className="breakdown-item">
              <span className="label">{t.weatherRisk}</span>
              <div className="value">+{fviData?.breakdown?.weather}</div>
            </div>
          </div>

          {/* Weather Stats Section */}
          <div className="metric-box" style={{ 
            marginTop: '3rem', 
            padding: '1.5rem', 
            background: 'rgba(59, 130, 246, 0.05)', 
            border: '1px solid rgba(59, 130, 246, 0.1)',
            borderRadius: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>🌤️</span>
              <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{t.weatherStats}</h3>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p className="label">{t.temperature}</p>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {fviData?.weather?.temperature}°C
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p className="label">{t.rainfall}</p>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {fviData?.weather?.rainfall}mm
                </div>
              </div>
            </div>

            {fviData?.weather_message && (
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem', 
                borderRadius: '12px', 
                background: 'rgba(245, 158, 11, 0.1)', 
                color: '#d97706', 
                fontSize: '0.95rem', 
                fontWeight: '500',
                border: '1px solid rgba(245, 158, 11, 0.2)'
              }}>
                ⚠️ {fviData.weather_message}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card" style={{ borderLeft: '8px solid var(--primary)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📢 {t.smartAdvice}
          </h2>
          <div className="advice-box" style={{ 
            fontSize: '1.25rem',
            lineHeight: '1.6',
            fontWeight: '500',
            color: 'var(--text-main)',
          }}>
            “{advice || t.loading}”
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
