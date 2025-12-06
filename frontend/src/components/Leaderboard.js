import React, { useState, useEffect } from 'react';
import config from '../config';

const Leaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch players from backend API
    const fetchPlayers = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/players`);
        if (response.ok) {
          const data = await response.json();
          setPlayers(data);
        } else {
          setError('Failed to fetch players');
        }
      } catch (err) {
        setError('Error fetching players');
      }
    };

    fetchPlayers();
  }, []);

  return (
    <div className="container leaderboard-container">
      <h2>Leaderboard</h2>
      {error && <p>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Naam</th>
            <th>Punten</th>
          </tr>
        </thead>
        <tbody>
          {players.length > 0 ? (
            [...players]
              .sort((a, b) => b.points - a.points)
              .map((player) => (
              <tr key={player.name}>
                <td>{player.name}</td>
                <td>{player.points || 0}</td>
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
  );
};

export default Leaderboard;
