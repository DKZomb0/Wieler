import React, { useState, useEffect } from "react";
import config from '../config';

const AdminTools = () => {
  const [candidates, setCandidates] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiBaseUrl}/api/candidates`);
      
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        setError("Failed to fetch candidates");
      }
    } catch (err) {
      setError("Error fetching candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCandidate = async (candidateId, updates) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(
        `${config.apiBaseUrl}/api/candidates/${candidateId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        await response.json();
        setSuccess("Kandidaat bijgewerkt en scores herberekend");
        await fetchCandidates();
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update candidate");
      }
    } catch (err) {
      setError("Error updating candidate");
    } finally {
      setLoading(false);
      if (success) {
        setTimeout(() => setSuccess(null), 3000);
      }
    }
  };

  return (
    <div className="container admin-container">
      <h2>Admin Tools</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      {loading && <div className="info-message">Bezig met bijwerken...</div>}

      <div className="admin-section">
        <h3>Manage Candidates</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Geëlimineerd in episode</th>
              <th>Is Mol?</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.name}>
                <td>{candidate.name}</td>
                <td>
                  <select
                    value={candidate.eliminatedweek || ""}
                    onChange={(e) =>
                      handleUpdateCandidate(candidate.id, {
                        eliminatedweek: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    disabled={loading}
                  >
                    <option value="">Actief</option>
                    {[...Array(10)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Episode {i + 1}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={candidate.isMol || false}
                    onChange={(e) =>
                      handleUpdateCandidate(candidate.id, {
                        isMol: e.target.checked,
                      })
                    }
                    disabled={loading}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTools;
