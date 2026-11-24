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
    <main className="login">
      <div className="login-panel">
        <h1 className="brand brand-large">Wieler Uitslagenlog</h1>
        <p className="login-lead">
          {signUp ? 'Maak een account aan om resultaten bij te houden.' : 'Log in om je resultaten te bekijken.'}
        </p>
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" required autoFocus />
          </label>
          <label className="field">
            <span>Wachtwoord</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete={signUp ? 'new-password' : 'current-password'} minLength={6} required />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {info && <p className="form-info" role="status">{info}</p>}
          <button type="submit" className="btn btn-primary btn-wide">
            {signUp ? 'Account aanmaken' : 'Inloggen'}
          </button>
        </form>
        <button type="button" className="btn btn-link" onClick={() => setSignUp(!signUp)}>
          {signUp ? 'Al een account? Inloggen' : 'Nog geen account? Maak er een aan'}
        </button>
      </div>
    </main>
  );
};

export default LoginPage;
