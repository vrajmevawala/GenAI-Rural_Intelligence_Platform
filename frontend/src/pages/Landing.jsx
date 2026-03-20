import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { translations } from '../translations';

function Landing() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'English');

  useEffect(() => {
    if (localStorage.getItem('farmer_id')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const t = translations[lang];

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  return (
    <div className="landing-hero">
      <div style={{ position: 'absolute', top: '2rem', right: '2rem' }}>
        <select value={lang} onChange={(e) => handleLangChange(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
          <option value="English">English</option>
          <option value="Gujarati">ગુજરાતી</option>
        </select>
      </div>
      <h1 className="landing-title">GraamAI</h1>
      <h2 style={{ color: 'var(--primary-dark)', fontSize: '2rem', marginBottom: '1rem' }}>Krushi Saathi 🌱</h2>
      <p className="landing-subtitle">{t.subtitle}</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn-primary" onClick={() => navigate('/register')}>{t.register}</button>
        <button className="btn-outline" onClick={() => navigate('/login')} style={{ marginTop: 0 }}>{t.login}</button>
      </div>
    </div>
  );
}

export default Landing;
