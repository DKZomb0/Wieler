import React, { useCallback, useEffect, useMemo, useState } from "react";
import LoginPage from "./components/LoginPage";
import config from "./config";
import "./App.css";

const formatDate = (dateString) => {
  if (!dateString) return "Onbekende datum";
  const date = new Date(dateString);
  return date.toLocaleDateString("nl-NL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const App = () => {
  const [playerName, setPlayerName] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedRacer, setSelectedRacer] = useState("");
  const [raceHistory, setRaceHistory] = useState([]);
  const [showingRecent, setShowingRecent] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    racerName: "",
    raceName: "",
    score: "",
    raceDate: "",
    categorie: "",
    team: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("playerName");
    if (savedName) setPlayerName(savedName);
  }, []);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(""), 4000);
    return () => clearTimeout(t);
  }, [statusMessage]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const headers = useMemo(() => {
    if (!playerName) return {};
    return {
      "Content-Type": "application/json",
      "X-User-Name": playerName,
    };
  }, [playerName]);

  const raceNameSuggestions = useMemo(() => {
    const unique = new Set(raceHistory.map((race) => race.raceName));
    return Array.from(unique);
  }, [raceHistory]);

  const prefillState = React.useRef({ lastRacer: "", applied: false });

  useEffect(() => {
    const { racerName, categorie, team } = formData;
    if (!racerName) {
      prefillState.current = { lastRacer: "", applied: false };
      return;
    }
    if (prefillState.current.lastRacer !== racerName) {
      prefillState.current = { lastRacer: racerName, applied: false };
    }
    if (prefillState.current.applied) return;

    const lastEntry = raceHistory.find((race) => race.racerName === racerName);
    if (!lastEntry) return;

    const updates = {};
    if (!categorie && lastEntry.categorie) updates.categorie = lastEntry.categorie;
    if (!team && lastEntry.team) updates.team = lastEntry.team;

    if (Object.keys(updates).length) {
      prefillState.current.applied = true;
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  }, [formData, raceHistory]);

  const handleLogin = (name) => {
    setPlayerName(name);
    localStorage.setItem("playerName", name);
  };

  const handleLogout = () => {
    setPlayerName(null);
    setSelectedRacer("");
    setShowingRecent(true);
    setRaceHistory([]);
    setSuggestions([]);
    localStorage.removeItem("playerName");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ racerName: "", raceName: "", score: "", raceDate: "", categorie: "", team: "" });
  };

  const fetchSuggestions = useCallback(async (query) => {
    if (!playerName) return;
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
  }, [headers, playerName]);

  const fetchRecentEntries = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/races`, { headers });
      if (!response.ok) throw new Error("Kon recente resultaten niet laden");
      const data = await response.json();
      setRaceHistory(data);
      setSelectedRacer("");
      setShowingRecent(true);
    } catch (err) {
      setError(err.message);
      setRaceHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [headers]);

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
      setShowingRecent(false);
    } catch (err) {
      setError(err.message);
      setRaceHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchRecentEntries();
    } else {
      fetchRaceHistory(searchTerm.trim());
    }
  };

  const handleAddRace = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setError("");

    if (!formData.racerName || !formData.raceName || !formData.score || !formData.raceDate) {
      setError("Vul alle velden in om een race op te slaan.");
      return;
    }

    const parsedScore = parseInt(formData.score, 10);
    if (Number.isNaN(parsedScore)) {
      setError("Resultaat moet een geheel getal zijn.");
      return;
    }

    try {
      const url = `${config.apiBaseUrl}/api/races${editingId ? `?id=${editingId}` : ""}`;
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ ...formData, score: parsedScore }),
      });

      if (!response.ok) {
        throw new Error(editingId ? "Bijwerken van race mislukt" : "Opslaan van race mislukt");
      }

      const newEntry = await response.json();
      setStatusMessage(
        editingId
          ? `Race voor ${newEntry.racerName} bijgewerkt.`
          : `Race voor ${newEntry.racerName} opgeslagen.`
      );

      setRaceHistory((prev) => {
        if (editingId) return prev.map((race) => (race.id === editingId ? newEntry : race));
        if (selectedRacer && newEntry.racerName === selectedRacer) return [newEntry, ...prev];
        return prev;
      });

      setSuggestions([]);
      setFormData({ racerName: "", raceName: "", score: "", raceDate: "", categorie: "", team: "" });
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!playerName) return;
    fetchSuggestions(searchTerm.trim());
  }, [searchTerm, playerName, fetchSuggestions]);

  useEffect(() => {
    if (!playerName) return;
    fetchRecentEntries();
  }, [playerName, fetchRecentEntries]);

  if (!playerName) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-brand">
          <span className="header-brand-icon">🚴</span>
          <h1>Wieler Uitslagenlog</h1>
        </div>
        <div className="header-right">
          <span className="welcome-badge">👋 {playerName}</span>
          <button onClick={handleLogout} className="logout-button">
            Uitloggen
          </button>
        </div>
      </header>

      <main className="app-shell">
        {/* ── History Panel ── */}
        <section className="panel">
          <div className="panel-header">
            <h2>Racers &amp; resultaten</h2>
            <p className="muted">Zoek op naam of bekijk recente registraties.</p>
          </div>
          <div className="panel-body">
            <form onSubmit={handleSearch} className="search-bar">
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
              <button type="submit">Zoeken</button>
            </form>

            {suggestions.length > 0 && (
              <div className="suggestion-pills">
                {suggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="pill"
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

            <div className="results-header">
              <h3>
                {showingRecent ? "Recente registraties" : `Resultaten – ${selectedRacer}`}
              </h3>
              {raceHistory.length > 0 && (
                <span className="results-count">{raceHistory.length}</span>
              )}
            </div>

            {isLoading && (
              <div className="loading-state">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            )}

            {!isLoading && selectedRacer && raceHistory.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <p>Geen registraties gevonden voor <strong>{selectedRacer}</strong>.</p>
              </div>
            )}

            {!isLoading && !selectedRacer && raceHistory.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🏁</div>
                <p>Nog geen registraties. Voeg de eerste race toe!</p>
              </div>
            )}

            {!isLoading && raceHistory.length > 0 && (
              <ul className="history-list">
                {raceHistory.map((race) => (
                  <li
                    key={race.id}
                    className={`history-item${editingId === race.id ? " editing" : ""}`}
                  >
                    <div className="score-badge">{race.score}</div>
                    <div className="race-info">
                      <p className="race-racer">{race.racerName}</p>
                      <p className="race-meta-name">{race.raceName}</p>
                      <div className="race-tags">
                        {race.categorie && <span className="tag">{race.categorie}</span>}
                        {race.team && <span className="tag">{race.team}</span>}
                        <span className="tag tag-date">{formatDate(race.raceDate)}</span>
                      </div>
                    </div>
                    <div className="item-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          setEditingId(race.id);
                          setFormData({
                            racerName: race.racerName,
                            raceName: race.raceName,
                            score: race.score,
                            raceDate: race.raceDate,
                            categorie: race.categorie || "",
                            team: race.team || "",
                          });
                          setSelectedRacer(race.racerName);
                        }}
                      >
                        ✏ Bewerk
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={async () => {
                          try {
                            const response = await fetch(
                              `${config.apiBaseUrl}/api/races?id=${race.id}`,
                              { method: "DELETE", headers }
                            );
                            if (!response.ok && response.status !== 204) {
                              throw new Error("Verwijderen mislukt");
                            }
                            setRaceHistory((prev) => prev.filter((item) => item.id !== race.id));
                            if (editingId === race.id) cancelEdit();
                          } catch (err) {
                            setError(err.message);
                          }
                        }}
                      >
                        × Verwijder
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Form Panel ── */}
        <section className="panel form-panel">
          {editingId && (
            <div className="form-editing-banner">
              <span>✏ Bezig met wijzigen</span>
              <button type="button" className="btn-cancel-small" onClick={cancelEdit}>
                Annuleer
              </button>
            </div>
          )}
          <div className="panel-header">
            <h2>{editingId ? "Race wijzigen" : "Race toevoegen"}</h2>
            <p className="muted">
              {editingId ? "Pas de gegevens aan en sla op." : "Vul de wedstrijdgegevens in."}
            </p>
          </div>
          <div className="panel-body">
            <form className="form-grid" onSubmit={handleAddRace}>
              <label className="form-field">
                Naam renner
                <input
                  type="text"
                  value={formData.racerName}
                  onChange={(e) => {
                    setFormData({ ...formData, racerName: e.target.value });
                    fetchSuggestions(e.target.value);
                  }}
                  placeholder="Bijv. Annemiek van Vleuten"
                  list="racer-name-suggestions"
                />
                <datalist id="racer-name-suggestions">
                  {suggestions.map((name) => (
                    <option value={name} key={`form-${name}`} />
                  ))}
                </datalist>
              </label>

              <label className="form-field">
                Wedstrijdnaam
                <input
                  type="text"
                  value={formData.raceName}
                  onChange={(e) => setFormData({ ...formData, raceName: e.target.value })}
                  placeholder="Bijv. Ronde van Vlaanderen"
                  list="race-name-suggestions"
                />
                <datalist id="race-name-suggestions">
                  {raceNameSuggestions.map((name) => (
                    <option value={name} key={`race-${name}`} />
                  ))}
                </datalist>
              </label>

              <label className="form-field">
                Resultaat
                <input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  placeholder="Bijv. 1"
                />
              </label>

              <label className="form-field">
                Datum
                <input
                  type="date"
                  value={formData.raceDate}
                  onChange={(e) => setFormData({ ...formData, raceDate: e.target.value })}
                />
              </label>

              <label className="form-field">
                Categorie
                <input
                  type="text"
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                  placeholder="Bijv. Elite, U23"
                />
              </label>

              <label className="form-field">
                Team
                <input
                  type="text"
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                  placeholder="Bijv. Team DSM"
                />
              </label>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingId ? "Opslaan wijzigingen" : "+ Race opslaan"}
                </button>
                {editingId && (
                  <button type="button" className="btn-cancel" onClick={cancelEdit}>
                    Annuleren
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </main>

      {statusMessage && (
        <div className="toast success">✓ {statusMessage}</div>
      )}
      {error && (
        <div className="toast error">⚠ {error}</div>
      )}
    </div>
  );
};

export default App;
