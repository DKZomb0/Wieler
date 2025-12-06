import React, { useState, useMemo, useEffect } from "react";
import VotingScreen from "./components/VotingScreen";
import Leaderboard from "./components/Leaderboard"; // Import Leaderboard component
import Candidates from "./components/Candidates"; // Import Candidates component
import LoginPage from "./components/LoginPage";
import AdminTools from "./components/AdminTools";
import "./App.css";
import { getEpisodeInfo, formatDateTime } from "./utils/episodeTiming";
import demolLogo from "./assets/images/demol.jpg";

//TODO:
// - Stemming afsluiten tijdens de aflevering


const App = () => {
  const [currentTab, setCurrentTab] = useState("vote"); // Default to voting screen
  const [playerName, setPlayerName] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const episodeInfo = useMemo(() => getEpisodeInfo(), []);

  useEffect(() => {
    // Check if user is already logged in
    const savedName = localStorage.getItem("playerName");
    const savedRole = localStorage.getItem("userRole");
    if (savedName) {
      setPlayerName(savedName);
      setUserRole(savedRole);
    }
  }, []);

  const handleLogin = (name, role) => {
    setPlayerName(name);
    setUserRole(role);
    localStorage.setItem("playerName", name);
    localStorage.setItem("userRole", role);
  };

  const handleLogout = () => {
    setPlayerName(null);
    setUserRole(null);
    localStorage.removeItem("playerName");
    localStorage.removeItem("userRole");
  };

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };

  const handleSubmitVote = (voteData) => {
    console.log("Submitted vote:", voteData);
    // You can now send this data to your backend API for saving
  };

  if (!playerName) {
    return <LoginPage onLogin={handleLogin} />;
  }

  console.log('Episode Info:', episodeInfo.debug);

  return (
    <div>
      <div className="header">
        <div className="header-title">
          <img src={demolLogo} alt="De Mol Logo" className="header-logo" />
          <h1>De Mol App</h1>
        </div>
        <h2>Seizoen 2024</h2>
        <div className="user-info">
          <h3>
            Hallo {playerName}, klaar voor aflevering {episodeInfo.currentEpisode}?
          </h3>
          {episodeInfo.isDuringEpisode && (
            <div className="episode-alert">
              ⚠️ De aflevering is nu bezig - stemmen is weer mogelijk vanaf {formatDateTime(episodeInfo.votingResumesDate)}
            </div>
          )}
          <button onClick={handleLogout} className="logout-button">
            Uitloggen
          </button>
        </div>
      </div>

      <div className="tab-nav">
        <button
          onClick={() => handleTabChange("vote")}
          className={currentTab === "vote" ? "active" : ""}
        >
          Stemmen
        </button>
        <button
          onClick={() => handleTabChange("leaderboard")}
          className={currentTab === "leaderboard" ? "active" : ""}
        >
          Leaderboard
        </button>
        <button
          onClick={() => handleTabChange("candidates")}
          className={currentTab === "candidates" ? "active" : ""}
        >
          Kandidaten
        </button>
        {userRole === "admin" && (
          <button
            onClick={() => handleTabChange("admin")}
            className={currentTab === "admin" ? "active" : ""}
          >
            Admin
          </button>
        )}
      </div>

      <div className={`${currentTab}-container`}>
        {currentTab === "vote" && (
          <VotingScreen
            onSubmitVote={handleSubmitVote}
            playerName={playerName}
            currentEpisode={episodeInfo.currentEpisode}
            isDuringEpisode={episodeInfo.isDuringEpisode}
            votingResumesDate={episodeInfo.votingResumesDate}
          />
        )}
        {currentTab === "leaderboard" && (
          <Leaderboard currentEpisode={episodeInfo.currentEpisode} />
        )}
        {currentTab === "candidates" && (
          <Candidates currentEpisode={episodeInfo.currentEpisode} />
        )}
        {currentTab === "admin" && userRole === "admin" && <AdminTools />}
      </div>
    </div>
  );
};

export default App;
