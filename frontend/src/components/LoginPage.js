import React, { useState } from 'react';
import config from '../config';

const LoginPage = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) throw new Error('Ongeldige code');

      const { name } = await response.json();
      if (!name) throw new Error('Geen naam gevonden');

      onLogin(name);
    } catch {
      setError('Ongeldige code. Probeer opnieuw.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🚴</div>
        <h1>Wieler Uitslagenlog</h1>
        <p className="muted">Log in met je persoonlijke code om jouw rennersoverzicht te openen.</p>
        <form onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            maxLength={4}
            autoFocus
          />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn">Inloggen</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
