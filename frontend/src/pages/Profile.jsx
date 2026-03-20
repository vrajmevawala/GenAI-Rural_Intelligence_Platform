import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFarmer, updateFarmerLanguage } from '../api';
import Header from '../components/Header';
import { translations } from '../translations';

function Profile() {
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

    const fetchFarmer = async () => {
      try {
        const res = await getFarmer(farmerId);
        setFarmer(res.data);
      } catch (err) {
        console.error("Failed to fetch farmer details", err);
        setError("Could not load your profile. Please try logging in again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFarmer();
  }, [farmerId, navigate]);

  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    try {
      await updateFarmerLanguage(farmerId, newLang);
      setFarmer({ ...farmer, language: newLang });
      alert(`Language changed to ${newLang}`);
    } catch (err) {
      console.error("Failed to update language", err);
    }
  };

  const t = translations[farmer?.language || 'English'];

  const handleLogout = () => {
    localStorage.removeItem('farmer_id');
    navigate('/');
  };

  if (loading) return <div className="loader"></div>;
  if (!farmer) return (
    <div className="container">
      <div className="glass-card">
        <h1>Error Loading Profile</h1>
        <p>Something went wrong. Please check your connection or log in again.</p>
        <button className="btn-primary" onClick={() => navigate('/login')}>Login</button>
      </div>
    </div>
  );

  return (
    <>
      <Header />
      <div className="container full-width">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← {t.back}
        </button>
        <div className="glass-card profile-card">
          <div className="profile-avatar">
            {farmer?.profile_photo ? (
              <img src={farmer.profile_photo} alt="Profile" className="profile-img-large" />
            ) : (
              <svg viewBox="0 0 24 24" width="64" height="64">
                <path fill="#2e7d32" d="M12,2A10,10,0,0,0,2,12a9.89,9.89,0,0,0,2.26,6.33l.11.13C6.05,20.18,8.79,21,12,21s5.95-.82,7.63-2.54l.11-.13A9.89,9.89,0,0,0,22,12,10,10,0,0,0,12,2ZM12,6A3.5,3.5,0,1,1,8.5,9.5,3.5,3.5,0,0,1,12,6Zm0,13a7,7,0,0,1-5.59-2.79,4,4,0,0,1,11.18,0A7,7,0,0,1,12,19Z"/>
              </svg>
            )}
          </div>
          <h1>{farmer?.name}</h1>
          <p className="subtitle">{farmer?.village}, {farmer?.district}</p>

          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t.phone}</span>
              <span className="value">{farmer?.phone}</span>
            </div>
            <div className="info-item">
              <span className="label">{t.primaryCrop}</span>
              <span className="value">{farmer?.crop_name}</span>
            </div>
            <div className="info-item">
              <span className="label">{t.soilType}</span>
              <span className="value" style={{ textTransform: 'capitalize' }}>{farmer?.soil_type}</span>
            </div>
            <div className="info-item">
              <span className="label">{t.language}</span>
              <select 
                className="value-select" 
                value={farmer?.language} 
                onChange={handleLanguageChange}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary-dark)', fontWeight: '600', cursor: 'pointer', padding: '0' }}
              >
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="English">English</option>
              </select>
            </div>
            <div className="info-item">
              <span className="label">{t.landSize}</span>
              <span className="value">{farmer?.land_size} Acres</span>
            </div>
            <div className="info-item">
              <span className="label">{t.annualIncome}</span>
              <span className="value">₹{farmer?.annual_income}</span>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout}>{t.logout}</button>
        </div>
      </div>
    </>
  );
}

export default Profile;
