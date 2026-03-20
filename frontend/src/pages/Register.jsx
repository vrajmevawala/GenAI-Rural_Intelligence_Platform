import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCrops, registerFarmer } from '../api';
import { translations } from '../translations';

function Register() {
  const [crops, setCrops] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    language: 'Gujarati',
    district: '',
    village: '',
    crop_id: '',
    soil_type: '',
    land_size: '',
    annual_income: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const t = translations[formData.language];

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const res = await getCrops();
        setCrops(res.data);
      } catch (err) {
        console.error("Failed to fetch crops", err);
      }
    };
    fetchCrops();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profile_photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await registerFarmer(formData);
      localStorage.setItem('farmer_id', response.data);
      alert('Registration Successful!');
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail[0].msg || "Validation error. Check your input format.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="glass-card">
        <h1 style={{ marginBottom: '2rem' }}>{t.register}</h1>
        <form onSubmit={handleSubmit}>
          <div className="info-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div>
              <label className="label">{t.name}</label>
              <input name="name" placeholder="E.g. Rajesh Bhai" onChange={handleChange} required />
            </div>
            <div>
              <label className="label">{t.phone}</label>
              <input name="phone" placeholder="10 Digit Mobile" onChange={handleChange} required />
            </div>
            <div>
              <label className="label">{t.password}</label>
              <input name="password" type="password" placeholder="Secure Password" onChange={handleChange} required />
            </div>
            <div>
              <label className="label">{t.district}</label>
              <input name="district" placeholder="E.g. Anand" onChange={handleChange} required />
            </div>
            <div>
              <label className="label">{t.village}</label>
              <input name="village" placeholder="Your Village" onChange={handleChange} required />
            </div>
            <div>
              <label className="label">{t.language}</label>
              <select name="language" onChange={handleChange} required value={formData.language}>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="English">English</option>
              </select>
            </div>
            <div>
              <label className="label">{t.primaryCrop}</label>
              <select name="crop_id" onChange={handleChange} required value={formData.crop_id}>
                <option value="">Select Crop</option>
                {crops.map(crop => (
                  <option key={crop.id} value={crop.id}>{crop.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t.soilType}</label>
              <select name="soil_type" onChange={handleChange} required value={formData.soil_type}>
                <option value="">Select Soil Type</option>
                <option value="sandy">Sandy</option>
                <option value="clay">Clay</option>
                <option value="loamy">Loamy</option>
              </select>
            </div>
            <div>
              <label className="label">{t.landSize}</label>
              <input name="land_size" type="number" placeholder="Total Area" onChange={handleChange} required />
            </div>
            <div>
              <label className="label">{t.annualIncome}</label>
              <input name="annual_income" type="number" placeholder="Estimated" onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Profile Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ paddingTop: '0.75rem' }} />
            </div>
          </div>
          
          {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</p>}
          
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? t.loading : `👉 ${t.register}`}
          </button>
        </form>
        <p onClick={() => navigate('/login')} style={{ cursor: 'pointer', color: 'var(--primary-dark)', marginTop: '1.5rem', textAlign: 'center', fontWeight: '600' }}>
          {t.alreadyRegistered}
        </p>
      </div>
    </div>
  );
}

export default Register;
