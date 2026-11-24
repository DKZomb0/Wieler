import React, { useCallback, useEffect, useMemo, useState } from "react";
import LoginPage from "./components/LoginPage";
import supabase from "./supabase";
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
  const [session, setSession] = useState(undefined); // undefined = still loading
  const playerName = session?.user?.email || null;
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedRacer, setSelectedRacer] = useState("");
  const [raceHistory, setRaceHistory] = useState([]);
  const [showingRecent, setShowingRecent] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
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
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
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
    if (!session) return {};
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  }, [session]);

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

  const handleLogout = () => {
    supabase.auth.signOut();
    setSelectedRacer("");
    setShowingRecent(true);
    setRaceHistory([]);
    setSuggestions([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormOpen(false);
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
      setFormOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (race) => {
    setEditingId(race.id);
    setFormOpen(true);
    setFormData({
      racerName: race.racerName,
      raceName: race.raceName,
      score: race.score,
      raceDate: race.raceDate,
      categorie: race.categorie || "",
      team: race.team || "",
    });
  };

  const deleteRace = async (race) => {
    if (!window.confirm(`Resultaat van ${race.racerName} in ${race.raceName} verwijderen?`)) return;
    try {
      const response = await fetch(`${config.apiBaseUrl}/api/races?id=${race.id}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok && response.status !== 204) throw new Error("Verwijderen mislukt");
      setRaceHistory((prev) => prev.filter((item) => item.id !== race.id));
      setStatusMessage("Resultaat verwijderd.");
      if (editingId === race.id) cancelEdit();
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

  if (session === undefined) return null;
  if (!playerName) return <LoginPage />;

  const field = (key) => ({
    value: formData[key],
    onChange: (e) => setFormData({ ...formData, [key]: e.target.value }),
  });

  return (
    <div className="page">
      <header className="topbar">
        <h1 className="brand">Wieler Uitslagenlog</h1>
        <div className="account">
          <span className="account-email">{playerName}</span>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Uitloggen
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="results" aria-labelledby="results-title">
          <form onSubmit={handleSearch} className="search" role="search">
            <label htmlFor="search" className="sr-only">Zoek een renner</label>
            <input
              id="search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Zoek een renner"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary">Zoeken</button>
          </form>

          {suggestions.length > 0 && (
            <ul className="chips" aria-label="Suggesties">
              {suggestions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setSearchTerm(name);
                      fetchRaceHistory(name);
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="results-head">
            <h2 id="results-title">
              {showingRecent ? "Recente resultaten" : selectedRacer}
            </h2>
            {!showingRecent && (
              <button
                type="button"
                className="btn btn-link"
                onClick={() => {
                  setSearchTerm("");
                  fetchRecentEntries();
                }}
              >
                Terug naar recent
              </button>
            )}
          </div>

          {isLoading && <p className="note" role="status">Laden…</p>}

          {!isLoading && raceHistory.length === 0 && (
            <p className="note">
              {selectedRacer
                ? `Geen resultaten gevonden voor ${selectedRacer}.`
                : "Nog geen resultaten. Voeg je eerste race toe."}
            </p>
          )}

          {!isLoading && raceHistory.length > 0 && (
            <ul className="rows">
              {raceHistory.map((race) => (
                <li key={race.id} className={`row${editingId === race.id ? " is-editing" : ""}`}>
                  <div className="plate" aria-label={`Resultaat ${race.score}`}>{race.score}</div>
                  <div className="row-main">
                    <button
                      type="button"
                      className="row-rider"
                      onClick={() => {
                        setSearchTerm(race.racerName);
                        fetchRaceHistory(race.racerName);
                      }}
                    >
                      {race.racerName}
                    </button>
                    <p className="row-race">{race.raceName}</p>
                    <p className="row-meta">
                      <span>{formatDate(race.raceDate)}</span>
                      {race.categorie && <span>{race.categorie}</span>}
                      {race.team && <span>{race.team}</span>}
                    </p>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="btn btn-small" onClick={() => startEdit(race)}>
                      Wijzig
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className={`sheet${formOpen ? " is-open" : ""}`}
          aria-labelledby="form-title"
        >
          <div className="sheet-head">
            <h2 id="form-title">{editingId ? "Race wijzigen" : "Race toevoegen"}</h2>
            <button type="button" className="btn btn-ghost sheet-close" onClick={cancelEdit}>
              Sluiten
            </button>
          </div>
          <form className="form" onSubmit={handleAddRace}>
            <label className="field">
              <span>Renner</span>
              <input
                type="text"
                {...field("racerName")}
                onChange={(e) => {
                  setFormData({ ...formData, racerName: e.target.value });
                  fetchSuggestions(e.target.value);
                }}
                list="racer-name-suggestions"
                autoComplete="off"
              />
              <datalist id="racer-name-suggestions">
                {suggestions.map((name) => (
                  <option value={name} key={`form-${name}`} />
                ))}
              </datalist>
            </label>

            <label className="field">
              <span>Wedstrijd</span>
              <input type="text" {...field("raceName")} list="race-name-suggestions" autoComplete="off" />
              <datalist id="race-name-suggestions">
                {raceNameSuggestions.map((name) => (
                  <option value={name} key={`race-${name}`} />
                ))}
              </datalist>
            </label>

            <div className="field-pair">
              <label className="field">
                <span>Resultaat</span>
                <input type="number" inputMode="numeric" step="1" {...field("score")} />
              </label>
              <label className="field">
                <span>Datum</span>
                <input type="date" {...field("raceDate")} />
              </label>
            </div>

            <div className="field-pair">
              <label className="field">
                <span>Categorie</span>
                <input type="text" {...field("categorie")} placeholder="Optioneel" />
              </label>
              <label className="field">
                <span>Team</span>
                <input type="text" {...field("team")} placeholder="Optioneel" />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-wide">
                {editingId ? "Wijzigingen opslaan" : "Race opslaan"}
              </button>
              {editingId && (
                <button type="button" className="btn" onClick={cancelEdit}>
                  Annuleren
                </button>
              )}
              {editingId && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => deleteRace(raceHistory.find((r) => r.id === editingId))}
                >
                  Verwijderen
                </button>
              )}
            </div>
          </form>
        </section>
      </main>

      {!formOpen && (
        <button type="button" className="fab btn btn-primary" onClick={() => setFormOpen(true)}>
          Race toevoegen
        </button>
      )}
      {formOpen && <div className="scrim" onClick={cancelEdit} aria-hidden="true" />}

      {statusMessage && <div className="toast" role="status">{statusMessage}</div>}
      {error && <div className="toast toast-error" role="alert">{error}</div>}
    </div>
  );
};

export default App;
