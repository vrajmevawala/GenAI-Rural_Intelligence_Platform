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
              <span className="label">{t.soilFactor}</span>
              <div className="value">+{fviData?.breakdown?.soil}</div>
            </div>
            <div className="breakdown-item">
              <span className="label">{t.location}</span>
              <div className="value">+{fviData?.breakdown?.location}</div>
            </div>
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
