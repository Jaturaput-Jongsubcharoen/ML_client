import React, { useState } from 'react';
import './App.css';

function App() {
  const [features, setFeatures] = useState([0.5, 1.2, 3.7, 0.0, 2.4, 1.1]);
  const [modelName, setModelName] = useState("random_forest");
  const [prediction, setPrediction] = useState(null);

  const handlePredict = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_name: modelName, features }),
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

      <p><strong>Selected Model:</strong> {modelName.replace("_", " ").toUpperCase()}</p>

      <p>Input Features: {JSON.stringify(features)}</p>

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
