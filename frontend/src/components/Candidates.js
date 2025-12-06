import React, { useState, useEffect } from "react";
import config from "../config";
import { getEpisodeInfo } from "../utils/episodeTiming";

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [voteData, setVoteData] = useState({ percentages: {}, episode: null });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current episode
        const { currentEpisode } = getEpisodeInfo();
        const previousEpisode = Math.max(1, currentEpisode - 1);

        // Fetch candidates
        const candidatesResponse = await fetch(
          `${config.apiBaseUrl}/api/candidates`
        );
        if (!candidatesResponse.ok) {
          throw new Error("Failed to fetch candidates");
        }
        const candidatesData = await candidatesResponse.json();
        setCandidates(candidatesData);

        // Fetch vote percentages for previous episode
        const voteTotalsResponse = await fetch(
          `${config.apiBaseUrl}/api/votes/totals/${previousEpisode}`
        );
        if (voteTotalsResponse.ok) {
          const data = await voteTotalsResponse.json();
          setVoteData({ ...data, episode: previousEpisode });
        } else {
          throw new Error("Failed to fetch vote totals");
        }
      } catch (err) {
        setError("Error fetching data");
      }
    };

    fetchData();
  }, []);

  return (
    <div className="container candidates-container">
      <div className="table-section">
        <h2>Nog in het spel</h2>
        {error && <p>{error}</p>}
        <table>
          <thead>
            <tr>
              <th>Naam</th>
              <th>Percentage stemmen vorige aflevering</th>
            </tr>
          </thead>
          <tbody>
            {candidates.filter((c) => !c.eliminatedweek).length > 0 ? (
              candidates
                .filter((c) => !c.eliminatedweek)
                .sort(
                  (a, b) =>
                    (voteData.percentages[b.name] || 0) -
                    (voteData.percentages[a.name] || 0)
                )
                .map((candidate) => (
                  <tr key={candidate.name}>
                    <td>{candidate.name}</td>
                    <td>
                      {getEpisodeInfo().currentEpisode === 1
                        ? "-"
                        : voteData.percentages[candidate.name]
                        ? `${voteData.percentages[candidate.name]}%`
                        : "-"}
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="2">Geen kandidaten om weer te geven.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-section" style={{ marginTop: "2rem" }}>
        <h2>Geëlimineerd</h2>
        <table>
          <thead>
            <tr>
              <th>Naam</th>
              <th>In aflevering</th>
            </tr>
          </thead>
          <tbody>
            {candidates.filter((c) => c.eliminatedweek).length > 0 ? (
              candidates
                .filter((c) => c.eliminatedweek)
                .sort((a, b) => b.eliminatedweek - a.eliminatedweek)
                .map((candidate) => (
                  <tr key={candidate.name}>
                    <td>{candidate.name}</td>
                    <td>{candidate.eliminatedweek}</td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="2">Geen spelers om weer te geven.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Candidates;
