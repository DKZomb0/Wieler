import React, { useEffect, useMemo, useState } from "react";
import LoginPage from "./components/LoginPage";
import config from "./config";
import "./App.css";

const formatDate = (dateString) => {
  if (!dateString) return "Onbekende datum";
  const date = new Date(dateString);
  return date.toLocaleDateString("nl-NL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const App = () => {
  const [announcerName, setAnnouncerName] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedRacer, setSelectedRacer] = useState("");
  const [raceHistory, setRaceHistory] = useState([]);
  const [formData, setFormData] = useState({
    racerName: "",
    raceName: "",
    score: "",
    raceDate: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("announcerName");
    if (savedName) {
      setAnnouncerName(savedName);
    }
  }, []);

  const headers = useMemo(() => {
    if (!announcerName) return {};
    return {
      "Content-Type": "application/json",
      "X-User-Name": announcerName,
    };
  }, [announcerName]);

  const handleLogin = (name) => {
    setAnnouncerName(name);
    localStorage.setItem("announcerName", name);
  };

  const handleLogout = () => {
    setAnnouncerName(null);
    setSelectedRacer("");
    setRaceHistory([]);
    setSuggestions([]);
    localStorage.removeItem("announcerName");
  };

  const fetchSuggestions = async (query) => {
    if (!announcerName) return;

    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `${config.apiBaseUrl}/api/races?search=${encodeURIComponent(query)}`,
        { headers }
      );
      if (!response.ok) throw new Error("Kon suggesties niet laden");
      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRaceHistory = async (racer) => {
    if (!racer) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${config.apiBaseUrl}/api/races?racer=${encodeURIComponent(racer)}`,
        { headers }
      );
      if (!response.ok) throw new Error("Kon resultaten niet laden");
      const data = await response.json();
      setRaceHistory(data);
      setSelectedRacer(racer);
    } catch (err) {
      setError(err.message);
      setRaceHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRaceHistory(searchTerm.trim());
  };

  const handleAddRace = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setError("");

    if (!formData.racerName || !formData.raceName || !formData.score || !formData.raceDate) {
      setError("Vul alle velden in om een race op te slaan.");
      return;
    }

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/races`, {
        method: "POST",
        headers,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Opslaan van race mislukt");
      }

      const newEntry = await response.json();
      setStatusMessage(`Race voor ${newEntry.racerName} opgeslagen.`);

      if (selectedRacer && newEntry.racerName === selectedRacer) {
        setRaceHistory((prev) => [newEntry, ...prev]);
      }

      setSuggestions([]);
      setFormData({ racerName: "", raceName: "", score: "", raceDate: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!announcerName) return;
    fetchSuggestions(searchTerm.trim());
  }, [searchTerm, announcerName]);

  if (!announcerName) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="welcome">Welkom terug, {announcerName}</p>
          <h1>Wieler Uitslagenlog</h1>
          <p className="subtitle">Snel overzicht van jouw genoteerde wedstrijden en winnaars.</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Uitloggen
        </button>
      </header>

      <main className="grid-layout">
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Racers opzoeken</h2>
              <p className="muted">Typ een naam om eerdere notities terug te vinden.</p>
            </div>
          </div>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek naar een renner..."
              list="racer-suggestions"
            />
            <datalist id="racer-suggestions">
              {suggestions.map((name) => (
                <option value={name} key={name} />
              ))}
            </datalist>
            <button type="submit" className="primary">
              Zoek
            </button>
          </form>

          {suggestions.length > 0 && (
            <div className="suggestion-list">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setSearchTerm(name);
                    fetchRaceHistory(name);
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <div className="results">
            {isLoading && <p>Bezig met laden...</p>}
            {!isLoading && selectedRacer && raceHistory.length === 0 && (
              <p>Nog geen registraties gevonden voor {selectedRacer}.</p>
            )}
            {!isLoading && raceHistory.length > 0 && (
              <>
                <h3>Registraties voor {selectedRacer}</h3>
                <ul className="history-list">
                  {raceHistory.map((race) => (
                    <li key={race.id} className="history-item">
                      <div>
                        <p className="race-name">{race.raceName}</p>
                        <p className="muted">{formatDate(race.raceDate)}</p>
                      </div>
                      <div className="race-score">{race.score}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2>Race toevoegen</h2>
              <p className="muted">Vul de gegevens van de renner en race in.</p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleAddRace}>
            <label>
              Naam renner
              <input
                type="text"
                value={formData.racerName}
                onChange={(e) => setFormData({ ...formData, racerName: e.target.value })}
                placeholder="Bijv. Annemiek van Vleuten"
              />
            </label>
            <label>
              Wedstrijdnaam
              <input
                type="text"
                value={formData.raceName}
                onChange={(e) => setFormData({ ...formData, raceName: e.target.value })}
                placeholder="Bijv. Ronde van Vlaanderen"
              />
            </label>
            <label>
              Resultaat/Score
              <input
                type="text"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                placeholder="Bijv. 1e plaats"
              />
            </label>
            <label>
              Datum
              <input
                type="date"
                value={formData.raceDate}
                onChange={(e) => setFormData({ ...formData, raceDate: e.target.value })}
              />
            </label>
            <button type="submit" className="primary add-button">
              + Opslaan
            </button>
          </form>

          {statusMessage && <p className="success">{statusMessage}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    </div>
  );
};

export default App;
