import React, { useState } from 'react';
import config from '../config';

const LoginPage = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error('Ongeldige code');
      }

      const { name, role } = await response.json();
      if (!name) {
        throw new Error('Geen naam gevonden');
      }
      
      onLogin(name, role);
    } catch (err) {
      setError('Ongeldige code. Probeer opnieuw.');
    }
  };

  return (
    <div className="container login-container">
      <h1>De Mol App</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Voer je login code in"
            maxLength={4}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginPage; 