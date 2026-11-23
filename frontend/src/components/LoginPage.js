import React, { useState } from 'react';
import supabase from '../supabase';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUp, setSignUp] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const { data, error: err } = signUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (err) return setError(err.message);
    // With email confirmation on, sign-up returns no session until the link is clicked.
    if (signUp && !data.session) setInfo('Check je e-mail om je account te bevestigen.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🚴</div>
        <h1>Wieler Uitslagenlog</h1>
        <p className="muted">
          {signUp ? 'Maak een account aan.' : 'Log in om jouw rennersoverzicht te openen.'}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            required
            autoFocus
          />
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            autoComplete={signUp ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />
          {error && <div className="login-error">{error}</div>}
          {info && <div className="login-info">{info}</div>}
          <button type="submit" className="login-btn">
            {signUp ? 'Account aanmaken' : 'Inloggen'}
          </button>
        </form>
        <button type="button" className="login-link" onClick={() => setSignUp(!signUp)}>
          {signUp ? 'Al een account? Inloggen' : 'Nog geen account? Aanmelden'}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
