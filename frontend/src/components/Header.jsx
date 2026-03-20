import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFarmer } from '../api';

function Header() {
  const navigate = useNavigate();
  const farmerId = localStorage.getItem('farmer_id');
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (farmerId) {
      getFarmer(farmerId).then(res => {
        setPhoto(res.data.profile_photo);
      }).catch(err => console.error(err));
    }
  }, [farmerId]);

  if (!farmerId) return null;

  return (
    <header className="header">
      <div className="header-content">
        <h2 className="header-logo" onClick={() => navigate('/dashboard')}>GraamAI 🌱</h2>
        <div className="profile-container" onClick={() => navigate('/profile')}>
          <div className="profile-icon">
            {photo ? (
              <img src={photo} alt="Profile" className="profile-img-small" />
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M12,2A10,10,0,0,0,2,12a9.89,9.89,0,0,0,2.26,6.33l.11.13C6.05,20.18,8.79,21,12,21s5.95-.82,7.63-2.54l.11-.13A9.89,9.89,0,0,0,22,12,10,10,0,0,0,12,2ZM12,6A3.5,3.5,0,1,1,8.5,9.5,3.5,3.5,0,0,1,12,6Zm0,13a7,7,0,0,1-5.59-2.79,4,4,0,0,1,11.18,0A7,7,0,0,1,12,19Z"/>
              </svg>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
