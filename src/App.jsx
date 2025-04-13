import React, { useState } from 'react';
import './App.css';

function App() {
  const [modelName, setModelName] = useState("random_forest");

  const [street1, setStreet1] = useState("LAWRENCE AVE E");
  const [street2, setStreet2] = useState("E OF DVP ON RAMP Aven");
  const [offset, setOffset] = useState("10 m West of");
  const [district, setDistrict] = useState("Toronto and East York");
  const [impactype, setImpactype] = useState("Pedestrian Collisions");
  const [injury, setInjury] = useState("Fatal");
  const [pedcond, setPedcond] = useState("Unknown");
  const [drivcond, setDrivcond] = useState("Unknown");

  const [prediction, setPrediction] = useState(null);

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
            DRIVCOND: drivcond
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
    <div className="container">
      <h2>Machine Learning Models</h2>

      <p><strong>Select Model:</strong></p>
      <div className="model-buttons">
        <button onClick={() => setModelName("random_forest")}>Random Forest</button>
        <button onClick={() => setModelName("svm")}>SVM</button>
        <button onClick={() => setModelName("neural_network")}>Neural Network</button>
        <button onClick={() => setModelName("logistic_regression")}>Logistic Regression</button>
        <button onClick={() => setModelName("linear_regression")}>Linear Regression</button>
      </div>

      <p><strong>Selected Model:</strong> {modelName.replace(/_/g, " ").toUpperCase()}</p>

      <label>Street 1:</label>
      <select value={street1} onChange={(e) => setStreet1(e.target.value)}>
        <option value="YONGE ST">YONGE ST</option>
        <option value="BATHURST ST">BATHURST ST</option>
        <option value="DUNDAS ST W">DUNDAS ST W</option>
        <option value="DUFFERIN ST">DUFFERIN ST</option>
        <option value="EGLINTON AVE E">EGLINTON AVE E</option>
      </select>

      <label>Street 2:</label>
      <select value={street2} onChange={(e) => setStreet2(e.target.value)}>
        <option value="BATHURST ST">BATHURST ST</option>
        <option value="LAWRENCE AVE E">LAWRENCE AVE E</option>
        <option value="YONGE ST">YONGE ST</option>
        <option value="FINCH AVE E">FINCH AVE E</option>
        <option value="EGLINTON AVE E">EGLINTON AVE E</option>
      </select>

      <label>Offset:</label>
      <select value={offset} onChange={(e) => setOffset(e.target.value)}>
        <option value="10 m West of">10 m West of</option>
        <option value="10 m North o">10 m North o</option>
        <option value="5 m South of">5 m South of</option>
        <option value="10 m South o">10 m South o</option>
        <option value="5 m East of">5 m East of</option>
      </select>

      <label>District:</label>
      <select value={district} onChange={(e) => setDistrict(e.target.value)}>
        <option value="Toronto and East York">Toronto and East York</option>
        <option value="North York">North York</option>
        <option value="Scarborough">Scarborough</option>
        <option value="Etobicoke York">Etobicoke York</option>
      </select>

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

      <label>Injury:</label>
      <select value={injury} onChange={(e) => setInjury(e.target.value)}>
        <option value="Fatal">Fatal</option>
        <option value="Major">Major</option>
        <option value="Minor">Minor</option>
        <option value="Minimal">Minimal</option>
      </select>

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

      <br />
      <button className="predict-btn" onClick={handlePredict}>
        Predict
      </button>

      {prediction !== null && (
        <p>
          <strong>Prediction Result:</strong>{" "}
          {prediction === 1 ? "Fatal" : prediction === 0 ? "Non-Fatal" : prediction}
        </p>
      )}
    </div>
  );
}

export default App;