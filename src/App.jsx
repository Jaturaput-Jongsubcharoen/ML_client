import React, { useState } from 'react';
import './App.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

function App() {
  const [modelName, setModelName] = useState("random_forest");

  // -- form input states --
  const [street1, setStreet1] = useState("LAWRENCE AVE E");
  const [street2, setStreet2] = useState("E OF DVP ON RAMP Aven");
  const [offset, setOffset] = useState("10 m West of");
  const [district, setDistrict] = useState("Toronto and East York");
  const [impactype, setImpactype] = useState("Pedestrian Collisions");
  const [injury, setInjury] = useState("Fatal");
  const [pedcond, setPedcond] = useState("Unknown");
  const [drivcond, setDrivcond] = useState("Unknown");

  const [prediction, setPrediction] = useState(null);

  // -- hardcoded model scores for indicators --
  /*
  const modelStats = {
    logistic_regression: { accuracy: 77.40, precision: 33.47, recall: 61.24, f1: 43.28 },
    linear_regression:   { accuracy: 78.40, precision: 34.32, recall: 58.43, f1: 43.24 },
    svm:                 { accuracy: 73.15, precision: 29.53, recall: 65.36, f1: 40.68 },
    random_forest:       { accuracy: 72.47, precision: 29.10, recall: 66.48, f1: 40.48 },
    neural_network:      { accuracy: 72.42, precision: 29.02, recall: 66.29, f1: 40.36 },
  };
  */
  const modelStats = {
    logistic_regression: { accuracy: 0.773998, precision: 0.334698, recall: 0.612360, f1: 0.432826 },
    linear_regression:   { accuracy: 0.784019, precision: 0.343234, recall: 0.584270, f1: 0.432432 },
    svm:                 { accuracy: 0.731540, precision: 0.295262, recall: 0.653558, f1: 0.406760 },
    random_forest:       { accuracy: 0.724684, precision: 0.290984, recall: 0.664794, f1: 0.404789 },
    neural_network:      { accuracy: 0.724156, precision: 0.290164, recall: 0.662921, f1: 0.403649 },
  };
  
  const { accuracy, precision, recall, f1 } = modelStats[modelName] || { accuracy: 0, precision: 0, recall: 0, f1: 0 };

  // -- API call function --
  const handlePredict = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: modelName,
          input: {
            STREET1: street1,
            STREET2: street2,
            OFFSET: offset,
            DISTRICT: district,
            IMPACTYPE: impactype,
            INJURY: injury,
            PEDCOND: pedcond,
            DRIVCOND: drivcond,
          }
        }),
      });

      const data = await response.json();
      setPrediction(data.prediction);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="container-main">
      <h1>Machine Learning Models</h1>

      <div className="container">
        <p><strong>Select Model:</strong></p>
        <div className="model-buttons">
          <button onClick={() => setModelName("random_forest")}>Random Forest</button>
          <button onClick={() => setModelName("svm")}>SVM</button>
          <button onClick={() => setModelName("neural_network")}>Neural Network</button>
          <button onClick={() => setModelName("logistic_regression")}>Logistic Regression</button>
          <button onClick={() => setModelName("linear_regression")}>Linear Regression</button>
        </div>

        {/* -- Metrics row (Accuracy + Precision + Recall + F1 Score side-by-side) -- */}
        <div className="metrics-row">
          {/* -- Accuracy circle -- */}
          <div className="model-accuracy-circle">
            <CircularProgressbar
              value={accuracy * 100}
              text={`${(accuracy * 100).toFixed(2)}%`}
              styles={buildStyles({
                pathColor: "#a89a9a",
                textColor: "#ffffff",
                trailColor: "#3a3a3a",
                backgroundColor: "#000",
              })}
            />
            <div className="accuracy-label">Model Accuracy</div>
          </div>

          {/* -- Precision circle -- */}
          <div className="model-accuracy-circle">
            <CircularProgressbar
              value={precision * 100}
              text={`${(precision * 100).toFixed(2)}%`}
              styles={buildStyles({
                pathColor: "#a89a9a",
                textColor: "#ffffff",
                trailColor: "#3a3a3a",
                backgroundColor: "#000",
              })}
            />
            <div className="accuracy-label">Model Precision</div>
          </div>

          {/* -- Recall circle -- */}
          <div className="model-accuracy-circle">
            <CircularProgressbar
              value={recall * 100}
              text={`${(recall * 100).toFixed(2)}%`}
              styles={buildStyles({
                pathColor: "#a89a9a",
                textColor: "#ffffff",
                trailColor: "#3a3a3a",
                backgroundColor: "#000",
              })}
            />
            <div className="accuracy-label">Model Recall</div>
          </div>

          {/* -- F1 Score circle -- */}
          <div className="model-accuracy-circle">
            <CircularProgressbar
              value={f1 * 100}
              text={`${(f1 * 100).toFixed(2)}%`}
              styles={buildStyles({
                pathColor: "#a89a9a",
                textColor: "#ffffff",
                trailColor: "#3a3a3a",
                backgroundColor: "#000",
              })}
            />
            <div className="accuracy-label">F1 Score</div>
          </div>
        </div>

        <br />

        <h3>Selected Model: <strong>{modelName.replace(/_/g, " ")}</strong></h3>

        {/* -- form layout (2 rows) -- */}
        <div className="flex-form">
          <div className="flex-row">
            <div className="select-group">
              <label>Street 1:</label>
              <select value={street1} onChange={(e) => setStreet1(e.target.value)}>
                <option value="YONGE ST">YONGE ST</option>
                <option value="BATHURST ST">BATHURST ST</option>
                <option value="DUNDAS ST W">DUNDAS ST W</option>
                <option value="DUFFERIN ST">DUFFERIN ST</option>
                <option value="EGLINTON AVE E">EGLINTON AVE E</option>
              </select>
            </div>

            <div className="select-group">
              <label>Street 2:</label>
              <select value={street2} onChange={(e) => setStreet2(e.target.value)}>
                <option value="BATHURST ST">BATHURST ST</option>
                <option value="LAWRENCE AVE E">LAWRENCE AVE E</option>
                <option value="YONGE ST">YONGE ST</option>
                <option value="FINCH AVE E">FINCH AVE E</option>
                <option value="EGLINTON AVE E">EGLINTON AVE E</option>
              </select>
            </div>

            <div className="select-group">
              <label>Offset:</label>
              <select value={offset} onChange={(e) => setOffset(e.target.value)}>
                <option value="10 m West of">10 m West of</option>
                <option value="10 m North o">10 m North o</option>
                <option value="5 m South of">5 m South of</option>
                <option value="10 m South o">10 m South o</option>
                <option value="5 m East of">5 m East of</option>
              </select>
            </div>

            <div className="select-group">
              <label>District:</label>
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="Toronto and East York">Toronto and East York</option>
                <option value="North York">North York</option>
                <option value="Scarborough">Scarborough</option>
                <option value="Etobicoke York">Etobicoke York</option>
              </select>
            </div>
          </div>

          <div className="flex-row">
            <div className="select-group">
              <label>Impact Type:</label>
              <select value={impactype} onChange={(e) => setImpactype(e.target.value)}>
                <option value="Approaching">Approaching</option>
                <option value="SMV Other">SMV Other</option>
                <option value="Pedestrian Collisions">Pedestrian Collisions</option>
                <option value="Angle">Angle</option>
                <option value="Turning Movement">Turning Movement</option>
                <option value="Cyclist Collisions">Cyclist Collisions</option>
                <option value="Rear End">Rear End</option>
                <option value="Sideswipe">Sideswipe</option>
                <option value="SMV Unattended Vehicle">SMV Unattended Vehicle</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="select-group">
              <label>Injury:</label>
              <select value={injury} onChange={(e) => setInjury(e.target.value)}>
                <option value="Fatal">Fatal</option>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
                <option value="Minimal">Minimal</option>
              </select>
            </div>

            <div className="select-group">
              <label>Pedestrian Condition:</label>
              <select value={pedcond} onChange={(e) => setPedcond(e.target.value)}>
                <option value="Inattentive">Inattentive</option>
                <option value="Normal">Normal</option>
                <option value="Unknown">Unknown</option>
                <option value="Medical or Physical Disability">Medical or Physical Disability</option>
                <option value="Had Been Drinking">Had Been Drinking</option>
                <option value="Ability Impaired, Alcohol">Ability Impaired, Alcohol</option>
                <option value="Other">Other</option>
                <option value="Ability Impaired, Alcohol Over .80">Ability Impaired, Alcohol Over .80</option>
                <option value="Ability Impaired, Drugs">Ability Impaired, Drugs</option>
                <option value="Fatigue">Fatigue</option>
              </select>
            </div>

            <div className="select-group">
              <label>Driver Condition:</label>
              <select value={drivcond} onChange={(e) => setDrivcond(e.target.value)}>
                <option value="Normal">Normal</option>
                <option value="Ability Impaired, Alcohol Over .08">Ability Impaired, Alcohol Over .08</option>
                <option value="Inattentive">Inattentive</option>
                <option value="Unknown">Unknown</option>
                <option value="Medical or Physical Disability">Medical or Physical Disability</option>
                <option value="Had Been Drinking">Had Been Drinking</option>
                <option value="Fatigue">Fatigue</option>
                <option value="Other">Other</option>
                <option value="Ability Impaired, Alcohol">Ability Impaired, Alcohol</option>
                <option value="Ability Impaired, Drugs">Ability Impaired, Drugs</option>
              </select>
            </div>
          </div>
        </div>

        <br />
        <button className="predict-btn" onClick={handlePredict}>
          Predict
        </button>

        {prediction !== null && (
          <div className="prediction-result">
            <strong>Prediction Result:</strong>{" "}
            <span className="prediction-value">
              {prediction === 1 ? "Fatal (1)" : prediction === 0 ? "Non-Fatal (0)" : prediction}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
