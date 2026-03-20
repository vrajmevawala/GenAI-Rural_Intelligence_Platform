import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginFarmer } from '../api';
import { translations } from '../translations';

function Login() {
  const [lang] = useState(localStorage.getItem('lang') || 'English');
  const t = translations[lang];
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await loginFarmer({ phone, password });
      localStorage.setItem('farmer_id', response.data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid phone or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-card" style={{ maxWidth: '500px', margin: '4rem auto' }}>
        <h1 style={{ marginBottom: '2rem' }}>{t.welcome}</h1>
        <form onSubmit={handleLogin}>
          <label className="label">{t.phone}</label>
          <input 
            type="text" 
            placeholder="Enter registered mobile" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            required 
          />
          <label className="label">{t.password}</label>
          <input 
            type="password" 
            placeholder="Enter password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          {error && <p style={{ color: '#ef4444', marginBottom: '1.5rem', fontWeight: 'bold' }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? t.loading : `👉 ${t.login}`}
          </button>
        </form>
        <p onClick={() => navigate('/register')} style={{ cursor: 'pointer', color: 'var(--primary-dark)', marginTop: '1.5rem', textAlign: 'center', fontWeight: '600' }}>
          {t.footer}
        </p>
      </div>
    </div>
  );
}

export default Login;
