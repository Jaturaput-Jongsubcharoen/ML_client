# Machine learning, explained

## Supervised learning workflow

This project uses historical examples with known labels:

**Historical Toronto collision dataset → data preprocessing → supervised model training → saved ML models → Flask REST API → SvelteKit frontend → classification result**

The workflow script loads the Toronto KSI dataset, derives a target from `ACCLASS`, encodes categorical fields, uses latitude/longitude as numerical features, and trains five classifiers. The training source uses a stratified 80/20 train/test split and applies SMOTE to the training partition. The web application uses saved model artifacts; it does not train or modify them.

## Dataset and target

The available CSV contains Toronto collision records with fields including road class, district, collision location, traffic control, visibility, lighting, road surface, impact type, involved-person type, injury severity, direction, vehicle type, manoeuvre, driver action, driver condition, and geographic coordinates (`LATITUDE`, `LONGITUDE`, as well as projected `x`, `y`).

The training code defines the target from `ACCLASS`: `Fatal` is encoded as `1`; all other classifications are encoded as `0`. This is a historical collision-outcome class, not a prediction of a future collision's time or location.

The model input includes `INJURY`, a recorded outcome-related field. Because injury severity is related to the target, the dataset/model may contain target leakage. This frontend preserves the model contract and cannot resolve that methodological limitation.

## Classifiers

| Model | Plain-language description |
|---|---|
| Random Forest | Combines decisions from an ensemble of decision trees. |
| K-Nearest Neighbors | Uses nearby examples in the encoded feature space to classify a record. |
| Support Vector Machine | Separates classes with a decision boundary in the feature space. |
| Neural Network | Learns feature patterns through connected computational layers. |
| Logistic Regression | Uses a weighted linear combination of features for binary classification. |

## Reported metrics

The following metrics are the exact values used by the original frontend and match the later result block in `ML_server1/Models_Performance.txt`.

| Model | Accuracy | Precision | Recall | F1 |
|---|---:|---:|---:|---:|
| Random Forest | 95.3586% | 89.6018% | 75.8427% | 82.1501% |
| KNN | 92.1414% | 68.9103% | 80.5243% | 74.2660% |
| Neural Network | 85.4958% | 49.0291% | 75.6554% | 59.4993% |
| SVM | 83.7289% | 44.2759% | 60.1124% | 50.9929% |
| Logistic Regression | 79.4568% | 36.6412% | 62.9213% | 46.3129% |

The report file contains two differing metric sets. These numbers are disclosed as the values displayed by the existing application; their exact run provenance is not uniquely established by that file. They are not computed or returned by the prediction endpoint.

## Prediction API

The browser sends `model_name` and an `input` object to `POST /predict`. The frontend maps the selected categorical values to one-hot encoded fields and includes numeric latitude and longitude. The Flask endpoint returns the model ID and an integer prediction: `1` means fatal class and `0` means non-fatal class. The endpoint response contains no probability, so none is shown.

## Map versus animation

The historical map aggregates CSV records with valid coordinates and identified `ACCNUM` values into coarse `0.005°` cells. Its 4,955 geolocated collision IDs and 623 fatal-class IDs remain derived from the supplied data; source rows without collision IDs are omitted.

The separate full-screen Three.js city is an artistic Toronto-inspired miniature. Buildings are procedural, vehicles follow geometric loops, and signals are illustrative. It is not surveyed Toronto geometry, live traffic, a collision simulation, or an impending-collision detector. Clicking the scene never changes prediction inputs.

The four cockpit gauges display the reported accuracy, precision, recall and F1 values above. They update immediately when a model is selected, without requesting a prediction. They do not express the confidence of any particular classification.

Fatal feedback is a brief muted fracture/pulse; non-fatal feedback is a calm sage wave. Both are presentation effects triggered only after a successful binary API response. Non-fatal does not mean no collision, no injury, or a safe situation. The persistent result identifies the model that actually produced it, even if the next selected model changes.

## Limitations

These saved classifiers reflect the supplied historical dataset and its preprocessing. They are educational artifacts, not validated tools for road design, driving decisions, insurance, enforcement, emergency response, or public policy. The possible target leakage from the `INJURY` feature and the conflicting report metric sets should be considered before interpreting evaluation quality.
