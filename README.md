# Collision Fatality Prediction - Frontend

This frontend project is the React-based user interface for a machine learning application that predicts whether a traffic collision is likely to be fatal. It allows users to select a trained model, enter collision-related conditions, and receive a prediction from a Flask backend API.

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/9b49161c-4a4c-45a4-a33e-654aedb9d0e5" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/5c629ec8-7173-4035-bdac-a946c074a083" />


## Live Project

- Live demo: https://machine-learning-collision-fatality.onrender.com/
- Project report: https://client-jaturaput-portfolio.onrender.com/portfolio/Collision_Fatality_Prediction_Report.pdf

## Project Overview

The application was built to demonstrate how supervised machine learning can support road safety analysis. Users can interact with the app by choosing from several classification models such as Random Forest, KNN, SVM, Neural Networks, and Logistic Regression. The app then sends user-selected road, driver, and environmental conditions to the backend API and returns a binary prediction:

- 1 = Fatal collision
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/31b8470b-b2c9-45d6-8cad-397fd966cb7c" />

- 0 = Non-fatal collision
<img width="1918" height="1080" alt="image" src="https://github.com/user-attachments/assets/3d3801ad-879f-4649-8890-7a5b5a088a89" />


## Skills Demonstrated

This project showcases a wide range of full-stack and machine learning skills:

- Frontend development with HTML, CSS, and JavaScript
- React development for building an interactive single-page interface
- Component-based UI design and custom form controls
- RESTful API integration with fetch-based communication
- Python/Flask backend integration for model inference
- Supervised learning and classification model comparison
- Model evaluation using accuracy, precision, recall, and F1-score
- Deployment and hosting on Render

## Main Features

- Model selection panel with multiple ML algorithms
- Model performance comparison using key evaluation metrics
- Interactive dropdown-based input form for traffic and environmental features
- Latitude and longitude validation
- Prediction popup with result display
- Responsive, visually styled UI with custom components

## Technology Stack

- Frontend: React, Vite, JavaScript, CSS, HTML
- Styling: Custom CSS with animated UI components
- Data Handling: JSON payloads sent to backend API
- Backend Communication: REST API via fetch

## Project Architecture

1. The user selects a machine learning model from the UI.
2. The user enters road, driver, visibility, road surface, and location details.
3. The frontend converts the selected inputs into a structured JSON payload.
4. The frontend sends the payload to the Flask API endpoint `/predict`.
5. The backend loads the corresponding trained `.pkl` model and returns a prediction.
6. The UI displays the result and model performance information.

## Folder Structure

- `src/` – React components, styles, and UI logic
- `public/` – Static assets
- `vite.config.js` – Vite configuration
- `package.json` – React app scripts and dependencies

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Run the frontend locally

```bash
npm run dev
```

The app will be available in your browser at the local Vite URL.

## Environment Variables

The frontend expects the backend API base URL to be provided through the environment variable:

```bash
VITE_API_URL
```

Example:

```bash
VITE_API_URL=http://127.0.0.1:5000
```

## Notes on the ML Models

The app compares several trained classifiers, including:

- Random Forest
- KNN
- Support Vector Machine (SVM)
- Neural Network
- Logistic Regression

Each model has its own performance metrics displayed in the UI, allowing users to understand the trade-offs between different models.

## Deployment

This frontend is designed to be deployed with a backend service and hosted on Render. The deployment setup uses environment variables to connect the React frontend to the live Flask API.

## Summary

This project demonstrates the full flow of an applied machine learning web application: data-driven modeling, API-based inference, and an interactive user interface that makes prediction results accessible and understandable.

