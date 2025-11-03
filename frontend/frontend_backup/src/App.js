import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [isUploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setResult(null);
    setError("");
  };

  async function mockAnalyze() {
    await new Promise((r) => setTimeout(r, 800));
    return {
      summary: "No anomalies detected (mock).",
      hints: [
        "Lighting consistent.",
        "No texture repetition.",
        "No tampering found."
      ],
    };
  }

  const handleUpload = async () => {
    try {
      if (!file) return;
      setUploading(true);
      setError("");

      // Mock for now (we’ll hook this to your API later)
      const analysis = await mockAnalyze();
      setResult(analysis);
    } catch (e) {
      setError("Error during upload or analysis.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Claims Image Labeler (React Only)</h1>

      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <input type="file" accept="image/*" onChange={onFileChange} />
        <button
          onClick={handleUpload}
          disabled={!file || isUploading}
          style={{ marginLeft: 12 }}
        >
          {isUploading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}

        {result && (
          <div style={{ marginTop: 16 }}>
            <h3>AI Notes</h3>
            <p>{result.summary}</p>
            <ul>
              {result.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
