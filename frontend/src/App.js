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
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

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

    // Prefill categorie and team from the most recent entry of the same racer, once per racer
    const lastEntry = raceHistory.find((race) => race.racerName === racerName);
    if (!lastEntry) return;

    const updates = {};
    if (!categorie && lastEntry.categorie) {
      updates.categorie = lastEntry.categorie;
    }
    if (!team && lastEntry.team) {
      updates.team = lastEntry.team;
    }

    if (Object.keys(updates).length) {
      prefillState.current.applied = true;
      setFormData((prev) => ({ ...prev, ...updates }));
    }
  }, [formData.racerName, formData.categorie, formData.team, raceHistory]);

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

  const fetchSuggestions = async (query) => {
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
  };

  const fetchRecentEntries = async () => {
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
      setStatusMessage(editingId ? `Race voor ${newEntry.racerName} bijgewerkt.` : `Race voor ${newEntry.racerName} opgeslagen.`);

      setRaceHistory((prev) => {
        if (editingId) {
          return prev.map((race) => (race.id === editingId ? newEntry : race));
        }
        if (selectedRacer && newEntry.racerName === selectedRacer) {
          return [newEntry, ...prev];
        }
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
  }, [searchTerm, playerName]);

  useEffect(() => {
    if (!playerName) return;
    fetchRecentEntries();
  }, [playerName]);

  if (!playerName) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="welcome">Welkom terug, {playerName}</p>
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
                <h3>{showingRecent ? "Recente registraties" : `Registraties voor ${selectedRacer}`}</h3>
                <ul className="history-list">
                  {raceHistory.map((race) => (
                    <li key={race.id} className="history-item">
                      <div>
                        <p className="race-name">{race.raceName}</p>
                        <p className="muted">
                          {formatDate(race.raceDate)}
                          {race.categorie ? ` • ${race.categorie}` : ""} {race.team ? `• ${race.team}` : ""}
                        </p>
                      </div>
                      <div className="history-actions">
                        <span className="race-score">{race.score}</span>
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="ghost"
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
                            Bewerken
                          </button>
                          <button
                            type="button"
                            className="ghost danger"
                            onClick={async () => {
                              try {
                                const response = await fetch(`${config.apiBaseUrl}/api/races?id=${race.id}`, {
                                  method: "DELETE",
                                  headers,
                                });
                                if (!response.ok && response.status !== 204) {
                                  throw new Error("Verwijderen mislukt");
                                }
                                setRaceHistory((prev) => prev.filter((item) => item.id !== race.id));
                                if (editingId === race.id) {
                                  setEditingId(null);
                                  setFormData({ racerName: "", raceName: "", score: "", raceDate: "", categorie: "", team: "" });
                                }
                              } catch (err) {
                                setError(err.message);
                              }
                            }}
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
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
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, racerName: value });
                  fetchSuggestions(value);
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
            <label>
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
            <label>
              Resultaat
              <input
                type="number"
                inputMode="numeric"
                step="1"
                value={formData.score}
                onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                placeholder="Bijv. 1e plaats"
              />
            </label>
            <label>
              Categorie
              <input
                type="text"
                value={formData.categorie}
                onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                placeholder="Bijv. Elite, U23, Junior"
              />
            </label>
            <label>
              Team
              <input
                type="text"
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                placeholder="Bijv. Team DSM"
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
              {editingId ? "Opslaan wijzigingen" : "+ Opslaan"}
            </button>
            {editingId && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ racerName: "", raceName: "", score: "", raceDate: "", categorie: "", team: "" });
                }}
              >
                Annuleren
              </button>
            )}
          </form>

          {statusMessage && <p className="success">{statusMessage}</p>}
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    </div>
  );
};

export default App;
