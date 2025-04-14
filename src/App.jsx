import React, { useState } from 'react';
import './App.css';
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function App() {
  const [modelName, setModelName] = useState("knn");

  const modelPerformance = {
    "random_forest": {
      accuracy: 0.955696,
      precision: 0.908482,
      recall: 0.762172,
      f1: 0.828921
    },
    "logistic_regression": {
      accuracy: 0.795886,
      precision: 0.366962,
      recall: 0.619850,
      f1: 0.461003
    },
    "svm": {
      accuracy: 0.829641,
      precision: 0.429648,
      recall: 0.640449,
      f1: 0.514286
    },
    "neural_network": {
      accuracy: 0.850738,
      precision: 0.478261,
      recall: 0.659176,
      f1: 0.554331
    },
    "knn": {
      accuracy: 0.799625,
      precision: 0.490241,
      recall: 0.892857,
      f1: 0.607829
    }
  };

  // Raw input values
  const [inputs, setInputs] = useState({
    STREET1: "LAWRENCE AVE E",
    STREET2: "E OF DVP ON RAMP Aven",
    OFFSET: "10 m West of",
    DISTRICT: "Toronto and East York",
    IMPACTYPE: "Pedestrian Collisions",
    INJURY: "Fatal",
    PEDCOND: "Unknown",
    DRIVCOND: "Unknown",
    LATITUDE: 43.7,
    LONGITUDE: -79.4,
    TIME: 930,
    ACCNUM: 123456,
    OBJECTID: 1,
    INDEX: 0,
    x: 320000,
    y: 4850000,
    FATAL_NO: 1
  });

  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: value });
  };

  const handlePredict = async () => {
    const encodedInput = {};

    // One-hot encode only known categories (model expects these)
    const oneHotMap = [
      ["STREET1", "LAWRENCE AVE E"],
      ["STREET2", "E OF DVP ON RAMP Aven"],
      ["OFFSET", "10 m West of"],
      ["DISTRICT", "Toronto and East York"],
      ["IMPACTYPE", "Pedestrian Collisions"],
      ["INJURY", "Fatal"],
      ["INJURY", "Major"],
      ["PEDCOND", "Normal"],
      ["PEDCOND", "Unknown"],
      ["DRIVCOND", "Unknown"]
    ];

    // Apply one-hot manually
    for (let [key, val] of oneHotMap) {
      const field = `${key}_${val}`;
      encodedInput[field] = inputs[key] === val ? 1 : 0;
    }

    // Add numeric values
    const numericKeys = ["LATITUDE", "LONGITUDE", "TIME", "ACCNUM", "OBJECTID", "INDEX", "x", "y", "FATAL_NO"];
    for (let key of numericKeys) {
      encodedInput[key] = Number(inputs[key]);
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: modelName,
          input: encodedInput
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPrediction(data.prediction);
        setError(null);
      } else {
        setError(data.error);
        setPrediction(null);
      }
    } catch (err) {
      setError("Prediction failed: " + err.message);
    }
  };

  return (
    <div className="container">
      <h1>M A C H I N E &nbsp;&nbsp;&nbsp; L E A R N I N G &nbsp;&nbsp;&nbsp; M O D E L S</h1>
        <div className="model-button-main-group">
        <h4>Select Model:</h4>
        <div className="model-button-group">
          {['knn', 'random_forest', 'svm', 'logistic_regression', 'neural_network'].map((model) => (
            <button
              key={model}
              className={`model-button ${modelName === model ? 'active' : ''}`}
              onClick={() => setModelName(model)}
            >
              {model.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>

        <div className="model-button-group">
          <div className="progress-widget">
            <h4>Model Accuracy</h4>
            <CircularProgressbar
              value={modelPerformance[modelName].accuracy * 100}
              text={`${(modelPerformance[modelName].accuracy * 100).toFixed(1)}%`}
              styles={buildStyles({
                textColor: "#ffffff",
                pathColor: "#b1aeae",
                trailColor: "#333"
              })}
            />
          </div>

          <div className="progress-widget">
            <h4>Model Precision</h4>
            <CircularProgressbar
              value={modelPerformance[modelName].precision * 100}
              text={`${(modelPerformance[modelName].precision * 100).toFixed(1)}%`}
              styles={buildStyles({
                textColor: "#ffffff",
                pathColor: "#b1aeae",
                trailColor: "#333"
              })}
            />
          </div>
            
          <div className="progress-widget">
            <h4>Model Recall</h4>
            <CircularProgressbar
              value={modelPerformance[modelName].recall * 100}
              text={`${(modelPerformance[modelName].recall * 100).toFixed(1)}%`}
              styles={buildStyles({
                textColor: "#ffffff",
                pathColor: "#b1aeae",
                trailColor: "#333"
              })}
            />
          </div>

          <div className="progress-widget">
            <h4>Model F1 Score</h4>
            <CircularProgressbar
              value={modelPerformance[modelName].f1 * 100}
              text={`${(modelPerformance[modelName].f1 * 100).toFixed(1)}%`}
              styles={buildStyles({
                textColor: "#ffffff",
                pathColor: "#b1aeae",
                trailColor: "#333"
              })}
            />
          </div>
        </div>
      </div>
      

      <hr />
      <div className="model-button-main-group">
        <h4>Categorical Features</h4>
        <div className="model-button-group">
          <div className="flex-container">
            {[
              { key: "STREET1", label: "Street 1", options: ["YONGE ST", "LAWRENCE AVE E", "DUNDAS ST W", "EGLINTON AVE E"] },
              { key: "STREET2", label: "Street 2", options: ["E OF DVP ON RAMP Aven", "BLOOR ST", "KING ST", "BATHURST ST"] },
              { key: "OFFSET", label: "Offset", options: ["10 m West of", "5 m East of", "10 m North of"] },
              { key: "DISTRICT", label: "District", options: ["Toronto and East York", "North York", "Etobicoke", "Scarborough"] }
            ].map(({ key, label, options }) => (
              <div key={key} className="form-group">
                <label>{label}:</label>
                <select name={key} value={inputs[key]} onChange={handleChange}>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex-container">
            {[
              { key: "IMPACTYPE", label: "Impact Type", options: ["Pedestrian Collisions", "Cyclist Collisions", "Rear End", "Sideswipe"] },
              { key: "INJURY", label: "Injury Level", options: ["Fatal", "Major", "Minor", "Minimal"] },
              { key: "PEDCOND", label: "Pedestrian Condition", options: ["Normal", "Unknown", "Inattentive", "Other"] },
              { key: "DRIVCOND", label: "Driver Condition", options: ["Normal", "Unknown", "Fatigue", "Medical or Physical Disability"] }
            ].map(({ key, label, options }) => (
              <div key={key} className="form-group">
                <label>{label}:</label>
                <select name={key} value={inputs[key]} onChange={handleChange}>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
        
        <h4>Numerical Features</h4>
        <div className="model-button-group">
          {/* First row */}
          <div className="flex-container">
            {["LATITUDE", "LONGITUDE", "TIME", "ACCNUM", "OBJECTID"].map((key) => (
              <div className="input-group" key={key}>
                <label>{key}</label>
                <input
                  type="number"
                  name={key}
                  value={inputs[key]}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>

          {/* Second row */}
          <div className="flex-container">
            {["INDEX", "x", "y", "FATAL_NO"].map((key) => (
              <div className="input-group" key={key}>
                <label>{key}</label>
                <input
                  type="number"
                  name={key}
                  value={inputs[key]}
                  onChange={handleChange}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <br />
      <button className="predict-button" type="button" onClick={handlePredict}>Predict</button>

      {prediction !== null && (
        <p>Prediction: {prediction === 1 ? "Fatal (1)" : "Non-Fatal (0)"}</p>
      )}

      {error && (
        <p style={{ color: "red" }}>Error: {error}</p>
      )}
    </div>
  );
}

export default App;
