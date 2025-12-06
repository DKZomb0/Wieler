import React, { useState, useEffect } from "react";
import config from '../config';
import { formatDateTime } from '../utils/episodeTiming';

const VotingScreen = ({ 
  onSubmitVote, 
  playerName, 
  currentEpisode,
  isDuringEpisode,
  votingResumesDate 
}) => {
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [points, setPoints] = useState({});
  const [existingVote, setExistingVote] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First fetch candidates
        const candidatesResponse = await fetch(`${config.apiBaseUrl}/api/candidates`);
        if (!candidatesResponse.ok) {
          throw new Error("Failed to fetch candidates");
        }
        const candidatesData = await candidatesResponse.json();
        setCandidates(candidatesData);

        // Then fetch votes
        const votesResponse = await fetch(
          `${config.apiBaseUrl}/api/votes?player=${encodeURIComponent(playerName)}&episode=${currentEpisode}`
        );
        if (votesResponse.ok) {
          const votesData = await votesResponse.json();
          if (votesData && votesData.length > 0) {
            const existingPoints = votesData.reduce((acc, vote) => {
              acc[vote.candidate] = vote.points;
              return acc;
            }, {});
            setExistingVote(existingPoints);
          }
        } else {
          throw new Error("Failed to fetch votes");
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchData();
  }, [playerName, currentEpisode]);

  const handlePointsChange = (id, value) => {
    setError(null);
    setPoints({
      ...points,
      [id]: value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (isDuringEpisode) {
        setError("Stemmen is niet mogelijk tijdens de aflevering");
        return;
      }
      const completePoints = candidates.reduce(
        (acc, candidate) => ({
          ...acc,
          [candidate.name]: parseInt(points[candidate.name]) || 0,
        }),
        {}
      );

      const payload = {
        player: playerName,
        episode: currentEpisode,
        scores: completePoints,
      };

      const response = await fetch(`${config.apiBaseUrl}/api/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setExistingVote(points);
        onSubmitVote(completePoints);
      } else {
        setError("Failed to submit votes");
      }
    } catch (err) {
      setError("Error submitting votes");
    }
  };

  const handleUpdate = async () => {
    try {
      const completePoints = candidates.reduce(
        (acc, candidate) => ({
          ...acc,
          [candidate.name]: parseInt(points[candidate.name]) || 0,
        }),
        {}
      );

      const payload = {
        player: playerName,
        episode: currentEpisode,
        scores: completePoints,
      };

      const response = await fetch(`${config.apiBaseUrl}/api/votes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setExistingVote(points);
        setIsEditing(false);
        onSubmitVote(completePoints);
      } else {
        setError("Failed to update votes");
      }
    } catch (err) {
      setError("Error updating votes");
    }
  };

  const totalPoints = candidates.reduce(
    (total, candidate) => total + (parseInt(points[candidate.name]) || 0),
    0
  );
  const isOverLimit = totalPoints > 100;
  const isValidTotal = totalPoints === 100;

  if (isDuringEpisode) {
    return (
      <div className="container">
        <div className="episode-lockout">
          <h2>Stemmen tijdelijk niet mogelijk</h2>
          <p>De aflevering is momenteel bezig.</p>
          <p>Je kunt weer stemmen vanaf: {formatDateTime(votingResumesDate)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {submitSuccess && !isEditing && (
        <div style={{ 
          backgroundColor: '#4caf50', 
          color: 'white', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Je stem is succesvol opgeslagen!
        </div>
      )}
      {existingVote && !isEditing && !submitSuccess && (
        <h2>Je stem is geregistreerd!</h2>
      )}
      {(!existingVote || isEditing) && (
        <>
          <h2>Verdeel je punten</h2>
          <h3>
            Nog te verdelen: <strong>{Math.max(0, 100 - totalPoints)}</strong>
          </h3>
        </>
      )}
      <div className="voting-table">
        <table>
          <thead>
            <tr>
              <th>Kandidaat</th>
              <th>Punten</th>
            </tr>
          </thead>
          <tbody>
            {candidates
              .filter(candidate => !candidate.eliminatedweek)
              .map((candidate) => (
                <tr key={candidate.id}>
                  <td>{candidate.name}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={
                        existingVote && !isEditing
                          ? existingVote[candidate.name] || 0
                          : points[candidate.name] || 0
                      }
                      onChange={(e) =>
                        handlePointsChange(candidate.name, e.target.value)
                      }
                      disabled={existingVote !== null && !isEditing}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {(!existingVote && !isEditing) && !submitSuccess && (
        <button
          className="submit-button"
          onClick={handleSubmit}
          disabled={!isValidTotal}
          style={{ opacity: isValidTotal ? 1 : 0.5 }}
        >
          Bevestig stemmen
        </button>
      )}
      {isEditing && isValidTotal && (
        <button
          className="submit-button"
          onClick={handleUpdate}
          style={{ opacity: isValidTotal ? 1 : 0.5 }}
        >
          Aanpassing bevestigen
        </button>
      )}
      <h3
        style={{ textAlign: "center", fontWeight: "normal", fontSize: "1rem" }}
      >
        {error && (
          <p
            style={{ color: "#d32f2f", fontWeight: "bold", fontSize: "1.2rem" }}
          >
            {error}
          </p>
        )}
        {isOverLimit && (
          <span style={{ color: "#d32f2f" }}>
            Je hebt teveel punten verdeeld
          </span>
        )}
        {existingVote && !isEditing && !isOverLimit && totalPoints < 100 && (
          <button 
            className="submit-button"
            onClick={() => {
              setPoints(existingVote);
              setIsEditing(true);
            }}
          >
            Punten aanpassen
          </button>
        )}
        {(!existingVote || isEditing) && !isOverLimit && totalPoints < 100 && (
          <span style={{ color: "#ed6c02" }}>
            Je moet alle 100 punten verdelen
          </span>
        )}
      </h3>
    </div>
  );
};

export default VotingScreen;
