import React, { useState, useEffect } from 'react';
import './PredictedPage.css';
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import RandomForestIcon from './icon/random_forest_icon.png';
import KnnIcon from './icon/knn_icon.png';
import LogisticRegressionIcon from './icon/logistic_regression_icon.png';
import SvmIcon from './icon/svm_icon.png';
import NeuralNetworkIcon from './icon/neural_network_icon.png';
import ApplicationIcon from './icon/application_icon2_1.png';

function App() {

  const modelPerformance = {
    random_forest: {
      accuracy: 0.953586,
      precision: 0.896018,
      recall: 0.758427,
      f1: 0.821501,
      description: "Random Forest is an ensemble learning method that builds multiple decision trees and merges them to get more accurate and stable predictions."
    },
    knn: {
      accuracy: 0.921414,
      precision: 0.689103,
      recall: 0.805243,
      f1: 0.742660,
      description: "K-Nearest Neighbors is a simple algorithm that classifies a data point based on how its neighbors are classified."
    },
    neural_network: {
      accuracy: 0.854958,
      precision: 0.490291,
      recall: 0.756554,
      f1: 0.594993,
      description: "Neural Networks mimic the human brain structure, using layers of interconnected nodes to learn complex patterns in data."
    },
    svm: {
      accuracy: 0.837289,
      precision: 0.442759,
      recall: 0.601124,
      f1: 0.509929,
      description: "Support Vector Machine (SVM) finds the best boundary (hyperplane) that separates classes with maximum margin."
    },
    logistic_regression: {
      accuracy: 0.794568,
      precision: 0.366412,
      recall: 0.629213,
      f1: 0.463129,
      description: "Logistic Regression is a linear model used for binary classification that estimates the probability of a class using the logistic function."
    }
  };

  const [activeModelDetail, setActiveModelDetail] = useState(null);
  const [modelDetailOpacity, setModelDetailOpacity] = useState(0);
  
  const [modelName, setModelName] = useState("random_forest");
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupOpacity, setPopupOpacity] = useState(0);

  const [activeDetail, setActiveDetail] = useState(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [detailOpacity, setDetailOpacity] = useState(0);
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const toggleDropdown = (field) => {
    setActiveDropdown(prev => (prev === field ? null : field));
  };
  const handleCustomSelect = (field, val) => {
    setInputs(prev => ({ ...prev, [field]: val }));
  };

  const getModelIcon = (model) => {
    switch (model) {
      case "random_forest": return RandomForestIcon;
      case "logistic_regression": return LogisticRegressionIcon;
      case "svm": return SvmIcon;
      case "neural_network": return NeuralNetworkIcon;
      case "knn": return KnnIcon;
      default: return null;
    }
  };


  const labelMap = {
    accuracy: "Accuracy",
    precision: "Precision",
    recall: "Recall",
    f1: "F1-Score"
  };

  const expectedCategories = {
    ROAD_CLASS: ["Collector", "Expressway", "Expressway Ramp", "Laneway", "Local", "Major Arterial", "Major Arterial ", "Major Shoreline", "Minor Arterial", "Other", "Pending"],
    DISTRICT: ["Etobicoke York", "North York", "Scarborough", "Toronto and East York"],
    ACCLOC: ["At Intersection", "At/Near Private Drive", "Intersection Related", "Laneway", "Non Intersection", "Other", "Overpass or Bridge", "Private Driveway", "Trail", "Underpass or Tunnel"],
    TRAFFCTL: ["No Control", "Pedestrian Crossover", "Police Control", "School Guard", "Stop Sign", "Streetcar (Stop for)", "Traffic Controller", "Traffic Gate", "Traffic Signal", "Yield Sign"],
    VISIBILITY: ["Clear", "Drifting Snow", "Fog, Mist, Smoke, Dust", "Freezing Rain", "Other", "Rain", "Snow", "Strong wind"],
    LIGHT: ["Dark", "Dark, artificial", "Dawn", "Dawn, artificial", "Daylight", "Daylight, artificial", "Dusk", "Dusk, artificial", "Other"],
    RDSFCOND: ["Dry", "Ice", "Loose Sand or Gravel", "Loose Snow", "Other", "Packed Snow", "Slush", "Spilled liquid", "Wet"],
    IMPACTYPE: ["Angle", "Approaching", "Cyclist Collisions", "Other", "Pedestrian Collisions", "Rear End", "SMV Other", "SMV Unattended Vehicle", "Sideswipe", "Turning Movement"],
    INVTYPE: ["Cyclist", "Cyclist Passenger", "Driver", "Driver - Not Hit", "In-Line Skater", "Moped Driver", "Moped Passenger", "Motorcycle Driver", "Motorcycle Passenger", "Other", "Other Property Owner", "Passenger", "Pedestrian", "Pedestrian - Not Hit", "Trailer Owner", "Truck Driver", "Vehicle Owner", "Wheelchair", "Witness"],
    INJURY: ["Fatal", "Major", "Minimal", "Minor"],
    INITDIR: ["East", "North", "South", "Unknown", "West"],
    VEHTYPE: ["Ambulance", "Automobile, Station Wagon", "Bicycle", "Bus (Other) (Go Bus, Gray Coa", "Construction Equipment", "Delivery Van", "Fire Vehicle", "Intercity Bus", "Moped", "Motorcycle", "Municipal Transit Bus (TTC)", "Off Road - 2 Wheels", "Off Road - 4 Wheels", "Off Road - Other", "Other", "Other Emergency Vehicle", "Passenger Van", "Pick Up Truck", "Police Vehicle", "Rickshaw", "School Bus", "Street Car", "Taxi", "Tow Truck", "Truck (other)", "Truck - Car Carrier", "Truck - Closed (Blazer, etc)", "Truck - Dump", "Truck - Open", "Truck - Tank", "Truck-Tractor", "Unknown"],
    MANOEUVER: ["Changing Lanes", "Disabled", "Going Ahead", "Making U Turn", "Merging", "Other", "Overtaking", "Parked", "Pulling Away from Shoulder or Curb", "Pulling Onto Shoulder or towardCurb", "Reversing", "Slowing or Stopping", "Stopped", "Turning Left", "Turning Right", "Unknown"],
    DRIVACT: ["Disobeyed Traffic Control", "Driving Properly", "Exceeding Speed Limit", "Failed to Yield Right of Way", "Following too Close", "Improper Lane Change", "Improper Passing", "Improper Turn", "Lost control", "Other", "Speed too Fast For Condition", "Speed too Slow", "Wrong Way on One Way Road"],
    DRIVCOND: ["Ability Impaired, Alcohol", "Ability Impaired, Alcohol Over .08", "Ability Impaired, Drugs", "Fatigue", "Had Been Drinking", "Inattentive", "Medical or Physical Disability", "Normal", "Other", "Unknown"]
  };

  const fieldLabelMap = {
    ROAD_CLASS: "Road Class",
    DISTRICT: "District",
    ACCLOC: "Accident Location",
    TRAFFCTL: "Traffic Control",
    VISIBILITY: "Visibility",
    LIGHT: "Lighting",
    RDSFCOND: "Road Surface Condition",
    IMPACTYPE: "Impact Type",
    INVTYPE: "Involved Type",
    INJURY: "Injury Severity",
    INITDIR: "Initial Direction",
    VEHTYPE: "Vehicle Type",
    MANOEUVER: "Maneuver",
    DRIVACT: "Driver Action",
    DRIVCOND: "Driver Condition",
    LATITUDE: "Latitude (North–South position, from -90° to +90°)",
    LONGITUDE: "Longitude (East–West position, from -180° to +180°)"
  };

  const roadClassDisplayMap = {
    "Collector": "Collector Street",
    "Expressway": "Expressway",
    "Expressway Ramp": "Expressway Ramp",
    "Laneway": "Laneway",
    "Local": "Local Street",
    "Major Arterial": "Major Arterial Road",
    "Major Arterial ": "Major Arterial Road",
    "Major Shoreline": "Shoreline Road",
    "Minor Arterial": "Minor Arterial Road",
    "Other": "Other/Unspecified",
    "Pending": "Not Classified"
  };

  const fieldDescriptions = {
    ROAD_CLASS: {
      description: "Describes the type of road where the collision occurred.",
      options: {
        "Collector": "Medium-capacity road collecting traffic from local roads to arterial roads.",
        "Expressway": "High-speed, limited-access highway for fast traffic.",
        "Expressway Ramp": "Entry or exit ramps connecting to an expressway.",
        "Laneway": "Narrow lane typically behind houses or buildings, not intended for through traffic.",
        "Local": "Roads within neighborhoods, low traffic, usually residential.",
        "Major Arterial": "Main roads carrying large volumes of traffic through urban areas.",
        "Major Arterial ": "Same as above (likely a duplicate with trailing space).",
        "Major Shoreline": "Roads adjacent to lakeshores or waterfronts.",
        "Minor Arterial": "Secondary roads connecting local roads to major arterials.",
        "Other": "Does not fit into any listed road category.",
        "Pending": "Classification is awaiting confirmation or data update."
      }
    },

    DISTRICT: {
      description: "Indicates which Toronto district the collision happened in.",
      options: {
        "Etobicoke York": "Western region of Toronto.",
        "North York": "Northern region of Toronto.",
        "Scarborough": "Eastern region of Toronto.",
        "Toronto and East York": "Central and southeastern regions of Toronto."
      }
    },

    ACCLOC: {
      description: "Specifies where the accident occurred relative to intersections, driveways, or other landmarks.",
      options: {
        "At Intersection": "Directly at a road intersection.",
        "At/Near Private Drive": "Near or at a private driveway entrance.",
        "Intersection Related": "Not exactly at an intersection but influenced by nearby one.",
        "Laneway": "Inside or near a laneway.",
        "Non Intersection": "Not near any intersection.",
        "Other": "Uncategorized location.",
        "Overpass or Bridge": "On or around a bridge or overpass.",
        "Private Driveway": "Within a private driveway area.",
        "Trail": "On or near a walking or bike trail.",
        "Underpass or Tunnel": "In or near an underground passage."
      }
    },

    TRAFFCTL: {
      description: "Indicates the type of traffic control present at the scene.",
      options: {
        "No Control": "No traffic control device.",
        "Pedestrian Crossover": "Designated pedestrian crossing zone.",
        "Police Control": "Officer was directing traffic.",
        "School Guard": "Crossing guard present.",
        "Stop Sign": "Stop sign control.",
        "Streetcar (Stop for)": "Required to stop for a streetcar.",
        "Traffic Controller": "Electronic traffic control system (may differ from standard signals).",
        "Traffic Gate": "Barrier gate, typically near railways or restricted areas.",
        "Traffic Signal": "Standard traffic light.",
        "Yield Sign": "Yield sign control present."
      }
    },

    VISIBILITY: {
      description: "Describes the visibility conditions at the time of the collision.",
      options: {
        "Clear": "Normal visibility.",
        "Drifting Snow": "Visibility affected by wind-blown snow.",
        "Fog, Mist, Smoke, Dust": "Obscured vision due to environmental conditions.",
        "Freezing Rain": "Rain that freezes on contact, creating slick surfaces.",
        "Other": "Unlisted or special visibility condition.",
        "Rain": "Moderate to heavy rainfall affecting vision.",
        "Snow": "Falling snow reducing visibility.",
        "Strong wind": "High wind conditions affecting driving."
      }
    },

    LIGHT: {
      description: "Describes the lighting conditions when the collision occurred.",
      options: {
        "Dark": "Nighttime with no artificial lighting.",
        "Dark, artificial": "Nighttime with street lights or other lighting.",
        "Dawn": "Before sunrise with natural lighting starting.",
        "Dawn, artificial": "Early morning with street lighting.",
        "Daylight": "Full daylight conditions.",
        "Daylight, artificial": "Daytime with additional artificial lighting.",
        "Dusk": "Just before darkness falls.",
        "Dusk, artificial": "Evening time with street lighting.",
        "Other": "Lighting not classified by standard types."
      }
    },

    RDSFCOND: {
      description: "Describes the road surface condition.",
      options: {
        "Dry": "No moisture or debris.",
        "Ice": "Frozen water on road surface.",
        "Loose Sand or Gravel": "Debris affecting tire grip.",
        "Loose Snow": "Snow not yet packed down.",
        "Other": "Special condition not listed.",
        "Packed Snow": "Snow pressed down by traffic.",
        "Slush": "Wet, semi-melted snow.",
        "Spilled liquid": "Oil or other spilled substances.",
        "Wet": "Rainwater or moisture on the surface."
      }
    },

    IMPACTYPE: {
      description: "Indicates the type of collision impact.",
      options: {
        "Angle": "Vehicles collided at an angle (T-bone).",
        "Approaching": "Head-on type impact.",
        "Cyclist Collisions": "Involving bicycles.",
        "Other": "Uncategorized impact type.",
        "Pedestrian Collisions": "Vehicle struck a pedestrian.",
        "Rear End": "One vehicle hit another from behind.",
        "SMV Other": "Slow-moving vehicle incident, other type.",
        "SMV Unattended Vehicle": "Collision with a parked or unattended vehicle.",
        "Sideswipe": "Vehicles grazed side-by-side.",
        "Turning Movement": "Impact occurred during a turning action."
      }
    },

    INVTYPE: {
      description: "Describes the role or type of individual involved in the incident.",
      options: {
        "Cyclist": "Bicycle rider involved.",
        "Cyclist Passenger": "Person riding on the back of a bicycle.",
        "Driver": "Operator of a vehicle.",
        "Driver - Not Hit": "Driver involved but not injured or struck.",
        "In-Line Skater": "Skater involved.",
        "Moped Driver": "Operator of a moped.",
        "Moped Passenger": "Riding on a moped but not driving.",
        "Motorcycle Driver": "Operator of a motorcycle.",
        "Motorcycle Passenger": "Passenger on a motorcycle.",
        "Other": "Unspecified individual.",
        "Other Property Owner": "Owner of damaged property not in a vehicle.",
        "Passenger": "Vehicle occupant not driving.",
        "Pedestrian": "Person walking or running.",
        "Pedestrian - Not Hit": "Pedestrian present but not struck.",
        "Trailer Owner": "Owner of a towed trailer.",
        "Truck Driver": "Operator of a truck.",
        "Vehicle Owner": "Owner of any vehicle involved.",
        "Wheelchair": "Person using a wheelchair.",
        "Witness": "Observer to the event."
      }
    },

    INJURY: {
      description: "Severity level of injuries sustained.",
      options: {
        "Fatal": "Individual died due to the collision.",
        "Major": "Life-threatening or serious injuries.",
        "Minimal": "Very minor or no treatment required.",
        "Minor": "Non-life-threatening injuries, often treated at the scene."
      }
    },

    INITDIR: {
      description: "Direction of travel before the incident.",
      options: {
        "East": "Traveling eastward.",
        "North": "Traveling northward.",
        "South": "Traveling southward.",
        "Unknown": "Direction not recorded.",
        "West": "Traveling westward."
      }
    },

    VEHTYPE: {
      description: "The type of vehicle involved in the collision.",
      options: {
        "Ambulance": "Emergency medical vehicle.",
        "Automobile, Station Wagon": "Standard personal vehicle.",
        "Bicycle": "Non-motorized two-wheeler.",
        "Bus (Other) (Go Bus, Gray Coa": "Long-distance or private bus.",
        "Construction Equipment": "Bulldozer, crane, etc.",
        "Delivery Van": "Van used for commercial delivery.",
        "Fire Vehicle": "Fire department vehicle.",
        "Intercity Bus": "Travel between cities.",
        "Moped": "Low-power motorized bike.",
        "Motorcycle": "Two-wheeled motor vehicle.",
        "Municipal Transit Bus (TTC)": "City public transit bus.",
        "Off Road - 2 Wheels": "Dirt bike or similar.",
        "Off Road - 4 Wheels": "ATV or similar vehicle.",
        "Off Road - Other": "Other off-road equipment.",
        "Other": "Not in standard categories.",
        "Other Emergency Vehicle": "Police, fire, ambulance (misc).",
        "Passenger Van": "Van designed for carrying people.",
        "Pick Up Truck": "Small cargo truck.",
        "Police Vehicle": "Law enforcement vehicle.",
        "Rickshaw": "Three-wheeled or pulled cart.",
        "School Bus": "Bus used to transport students.",
        "Street Car": "Rail-based urban transport.",
        "Taxi": "Commercial passenger vehicle.",
        "Tow Truck": "Used to tow or recover vehicles.",
        "Truck (other)": "Generic truck type.",
        "Truck - Car Carrier": "Hauls multiple cars.",
        "Truck - Closed (Blazer, etc)": "Closed cargo truck.",
        "Truck - Dump": "Used to carry bulk material.",
        "Truck - Open": "Open bed truck.",
        "Truck - Tank": "Carries liquids or gases.",
        "Truck-Tractor": "Head unit for pulling trailers.",
        "Unknown": "Vehicle type not recorded."
      }
    },

    MANOEUVER: {
      description: "Vehicle action during the incident.",
      options: {
        "Changing Lanes": "Switching lanes.",
        "Disabled": "Stopped due to breakdown or issue.",
        "Going Ahead": "Driving forward.",
        "Making U Turn": "Reversing direction.",
        "Merging": "Joining into traffic lane.",
        "Other": "Action not listed.",
        "Overtaking": "Passing another vehicle.",
        "Parked": "Stationary vehicle.",
        "Pulling Away from Shoulder or Curb": "Re-entering traffic from side.",
        "Pulling Onto Shoulder or towardCurb": "Moving toward road edge.",
        "Reversing": "Backing up.",
        "Slowing or Stopping": "Reducing speed or halting.",
        "Stopped": "Completely halted.",
        "Turning Left": "Making a left turn.",
        "Turning Right": "Making a right turn.",
        "Unknown": "Maneuver not recorded."
      }
    },

    DRIVACT: {
      description: "Driver’s action contributing to the collision.",
      options: {
        "Disobeyed Traffic Control": "Ignored traffic lights/signs.",
        "Driving Properly": "No driving fault identified.",
        "Exceeding Speed Limit": "Driving faster than allowed.",
        "Failed to Yield Right of Way": "Did not allow others to pass as required.",
        "Following too Close": "Tailgating.",
        "Improper Lane Change": "Unsafe or illegal lane switch.",
        "Improper Passing": "Illegal or dangerous overtaking.",
        "Improper Turn": "Unsafe or incorrect turning maneuver.",
        "Lost control": "Driver lost control of vehicle.",
        "Other": "Other contributing action.",
        "Speed too Fast For Condition": "Not adjusting speed to weather/road.",
        "Speed too Slow": "Driving unusually slow, causing risk.",
        "Wrong Way on One Way Road": "Driving opposite to permitted direction."
      }
    },

    DRIVCOND: {
      description: "Driver’s physical or mental condition.",
      options: {
        "Ability Impaired, Alcohol": "Under influence of alcohol.",
        "Ability Impaired, Alcohol Over .08": "Exceeded legal BAC limit.",
        "Ability Impaired, Drugs": "Under influence of drugs.",
        "Fatigue": "Tired or drowsy driver.",
        "Had Been Drinking": "Consumed alcohol but not necessarily impaired.",
        "Inattentive": "Distracted or not paying attention.",
        "Medical or Physical Disability": "Medical condition affecting driving.",
        "Normal": "No known impairment.",
        "Other": "Unlisted condition.",
        "Unknown": "Condition not recorded."
      }
    },

    LATITUDE: {
      description: "Tells you how far north or south the collision happened on the map.",
      options: {
        "": "Valid values range from -90 (South Pole) to +90 (North Pole)."
      }
    },
    LONGITUDE: {
      description: "Tells you how far east or west the collision happened on the map.",
      options: {
        "": "Valid values range from -180 (far west) to +180 (far east)."
      }
    }
  };

  


  const defaultInputs = Object.fromEntries(
    Object.entries(expectedCategories).map(([key, values]) => [key, values[0]])
  );
  defaultInputs["LATITUDE"] = 43.7;
  defaultInputs["LONGITUDE"] = -79.4;

  const [inputs, setInputs] = useState(defaultInputs);
  const [inputErrors, setInputErrors] = useState({ LATITUDE: "", LONGITUDE: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = parseFloat(value);

    // Validate LATITUDE
    if (name === "LATITUDE") {
      if (isNaN(val) || val < -90 || val > 90) {
        setInputErrors((prev) => ({
          ...prev,
          LATITUDE: "Latitude must be between -90 and 90.",
        }));
      } else {
        setInputErrors((prev) => ({ ...prev, LATITUDE: "" }));
      }
    }

    // Validate LONGITUDE
    if (name === "LONGITUDE") {
      if (isNaN(val) || val < -180 || val > 180) {
        setInputErrors((prev) => ({
          ...prev,
          LONGITUDE: "Longitude must be between -180 and 180.",
        }));
      } else {
        setInputErrors((prev) => ({ ...prev, LONGITUDE: "" }));
      }
    }

    setInputs((prev) => ({ ...prev, [name]: value }));
  };


  /*=========================================================================================*/
  const handlePredict = async () => {
    const lat = parseFloat(inputs.LATITUDE);
    const lon = parseFloat(inputs.LONGITUDE);
    let hasError = false;

    const newErrors = { LATITUDE: "", LONGITUDE: "" };

    if (isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.LATITUDE = "Latitude must be between -90 and 90.";
      hasError = true;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      newErrors.LONGITUDE = "Longitude must be between -180 and 180.";
      hasError = true;
    }

    setInputErrors(newErrors);

    if (hasError) {
      const messages = [];

      if (newErrors.LATITUDE) messages.push(fieldLabelMap.LATITUDE);
      if (newErrors.LONGITUDE) messages.push(fieldLabelMap.LONGITUDE);

      const formattedMessage = messages.length === 1
        ? `Invalid input: ${messages[0]}.`
        : `Invalid inputs: ${messages.join(" and ")}.`;

      setError(formattedMessage);
      setPrediction(null);
      return;
    }

    setError(null);

    const encodedInput = {};
    Object.entries(expectedCategories).forEach(([field, values]) => {
      values.forEach(val => {
        const key = `${field}_${val}`;
        encodedInput[key] = inputs[field] === val ? 1 : 0;
      });
    });

    encodedInput["LATITUDE"] = lat;
    encodedInput["LONGITUDE"] = lon;

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
  /*=========================================================================================*/

  // Control fade-in and fade-out
  useEffect(() => {
    let timeout;
    if (prediction !== null || error) {
      setIsPopupVisible(true);
      setTimeout(() => setPopupOpacity(1), 10);
    } else {
      setPopupOpacity(0);
      timeout = setTimeout(() => setIsPopupVisible(false), 300);
    }
    return () => clearTimeout(timeout);
  }, [prediction, error]);

  const closePopup = () => {
    setPopupOpacity(0);
    setTimeout(() => {
      setPrediction(null);
      setError(null);
    }, 300);
  };

  useEffect(() => {
  let timeout;
  if (activeDetail) {
    setIsDetailVisible(true);
    setTimeout(() => setDetailOpacity(1), 10);
  } else {
    setDetailOpacity(0);
    timeout = setTimeout(() => setIsDetailVisible(false), 300);
  }
  return () => clearTimeout(timeout);
  }, [activeDetail]);

  const closeDetailPopup = () => {
    setDetailOpacity(0);
    setTimeout(() => {
      setActiveDetail(null);
    }, 300); // match your transition duration
  };

  return (
    <div className="App">
      <div className="model-header-box4">
        <div className="row-default">
          <div className="col-default col-600px col-900px center">
            <img src={ApplicationIcon} alt="App Icon" className="app-icon" />
          </div>
        </div>

        <div className="row-default">
          <div className="col-default col-600px col-900px center">
            <h1 className="title-decoration">C O L L I S I O N &nbsp;&nbsp;&nbsp; F A T A L I T Y &nbsp;&nbsp;&nbsp; P R E D I C T I O N</h1>
          </div>
        </div>
        
        <div className="model-header-box3">
          <div className="row-default">
            <div className="col-default col-600px col-900px center model-header-box2">
                <h4 className="sub-header">What This App Does</h4>
            </div>
            </div>
            <div className="col-default col-600px col-900px center">
              <p className="title-decoration2">
                &nbsp;&nbsp;&nbsp;&nbsp; This web app predicts the likelihood of a fatal traffic collision in Toronto using machine learning models like Random Forest, KNN, SVM, Neural Networks, and Logistic Regression, based on user-selected road, driver, and environmental conditions.
                When you select a model, its performance is displayed to help you understand how well it predicts fatal outcomes.
              </p>
              <br/>
              <p className="title-decoration3">
                By Jaturaput Jongsubcharoen
              </p>
            </div>
        </div>
      </div>

      <div className="model-header-box1">
        <div className="row-default">
          <div className="col-default col-600px col-900px center model-header-box2">
            <h4 className="sub-header">Select Model</h4>
          </div>
        </div>

        <div className="row-default">
          <div className="col-default col-600px col-900px center">
            <div className="model-button-group">
              <div className="model-buttons">
                {["random_forest", "logistic_regression", "svm", "neural_network", "knn"].map((model) => (
                  <div key={model} className="model-button-wrapper">
                    {/* Wrapper to visually group content */}
                    <div
                      className={`model-btn ${modelName === model ? "active" : ""}`}
                      onClick={() => setModelName(model)}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                    >
                      {/* Icon */}
                      <img src={getModelIcon(model)} alt={`${model} icon`} className="model-icon" />

                      {/* Info button IN BETWEEN */}
                      <button
                        className="detail-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModelDetail(model);
                          setTimeout(() => setModelDetailOpacity(1), 10);
                        }}
                        style={{ margin: "5px 0" }}
                      >
                        Info
                      </button>

                      {/* Model Label */}
                      <span>{model.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row-default">
          <div className="col-default col-600px col-900px center">
            <div className="model-metrics-grid">
              {["accuracy", "precision", "recall", "f1"].map((metric) => (
                <div key={metric} className="progress-widget">
                  <div className="circular-container">
                    <h4>{labelMap[metric]}</h4>
                    <div className="circular-chart-wrapper neon-glow">
                      <CircularProgressbar
                        value={modelPerformance[modelName][metric] * 100}
                        text={`${(modelPerformance[modelName][metric] * 100).toFixed(2)}%`}
                        strokeWidth={10}
                        styles={buildStyles({
                          textColor: "#ffffff",
                          textSize: "18px",
                          pathColor: "url(#gradient)",
                          trailColor: "#2e2e2e",
                          pathTransitionDuration: 0.5,
                          strokeLinecap: "butt"
                        })}
                      />
                      <svg style={{ height: 0 }}>
                        <defs>
                          <linearGradient id="gradient" gradientTransform="rotate(90)">
                            <stop offset="0%" stopColor="#7a6f6f" />
                            <stop offset="100%" stopColor="#d0c9c9" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="row-default">
          <div className="col-default col-600px col-900px center">
            <button onClick={handlePredict}>Predict</button>
          </div>
        </div>
      </div>

      {activeModelDetail && (
        <div
          className="popup-overlay show"
          style={{ opacity: modelDetailOpacity, transition: "opacity 0.4s ease" }}
        >
          <div className="popup-content">
            <h3>{activeModelDetail.replace(/_/g, ' ').toUpperCase()}</h3>
            <p><strong>Description:</strong> {modelPerformance[activeModelDetail]?.description}</p>
            <button
              className="popup-close"
              onClick={() => {
                setModelDetailOpacity(0);
                setTimeout(() => setActiveModelDetail(null), 300);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {isPopupVisible && (
        <div className={`popup-overlay ${popupOpacity === 1 ? "show" : ""}`}>
          <div className={`popup-content ${error ? 'error' : ''}`}>
            <h3 style={{ marginBottom: '15px' }}>
              Model: {modelName.replace(/_/g, ' ').toUpperCase()}
            </h3>

            {prediction !== null && (
              <div style={{ marginBottom: '10px' }}>
                Prediction: {prediction === 1 ? "Fatal (1)" : "Not Fatal (0)"}
              </div>
            )}

            {error && (
              <div style={{ marginBottom: '10px' }}>
                {error}
              </div>
            )}

            <button className="popup-close" onClick={closePopup}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="model-header-box1">
        <div className="row-default">
          <div className="col-default col-600px col-900px center model-header-box2">
            <h4 className="sub-header">Categorical Features</h4>
          </div>
        </div>

        <div className="row-default">
          <div className="col-default col-600px col-900px">
            {Object.entries(expectedCategories).map(([field, values]) => (
              <div key={field} className="input-group">
                <div className="label-with-button">
                  <label>
                    {fieldLabelMap[field] || field.replace(/_/g, ' ')}
                  </label>
                  <button
                    className="detail-btn"
                    type="button"
                    onClick={() => setActiveDetail(field)}
                  >
                    Detail
                  </button>
                </div>
                <div className="custom-select-wrapper">
                  <div
                    className="custom-select-selected"
                    onClick={() => toggleDropdown(field)}
                  >
                    <span>{inputs[field] || "Select..."}</span>
                    <span className={`dropdown-arrow ${activeDropdown === field ? "open" : ""}`}>
                      ▼
                    </span>
                  </div>

                  <ul className={`custom-select-options ${activeDropdown === field ? "show" : ""}`}>
                    {values.map(val => (
                      <li
                        key={val}
                        onClick={() => {
                          handleCustomSelect(field, val);
                          setActiveDropdown(null);
                        }}
                      >
                        {field === "ROAD_CLASS" ? roadClassDisplayMap[val] || val : val}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ))}
          </div>
        </div>

        <div className="row-default">
          <div className="col-default col-600px col-900px center model-header-box2">
            <h4 className="sub-header">Numerical Features</h4>
          </div>
        </div>

        <div className="row-default">
          <div className="col-default col-600px col-900px center">

            {/* LATITUDE Input */}
            <div className="input-group">
              <div className="label-with-button">
                <label htmlFor="LATITUDE">{fieldLabelMap["LATITUDE"]}</label>
                <button
                  className="detail-btn"
                  type="button"
                  onClick={() => setActiveDetail("LATITUDE")}
                >
                  Detail
                </button>
              </div>
              <input
                id="LATITUDE"
                type="number"
                name="LATITUDE"
                min="-90"
                max="90"
                step="any"
                value={inputs.LATITUDE}
                onChange={handleChange}
              />
              {inputErrors.LATITUDE && (
                <p className="error-text">{inputErrors.LATITUDE}</p>
              )}
            </div>

            {/* LONGITUDE Input */}
            <div className="input-group">
              <div className="label-with-button">
                <label htmlFor="LONGITUDE">{fieldLabelMap["LONGITUDE"]}</label>
                <button
                  className="detail-btn"
                  type="button"
                  onClick={() => setActiveDetail("LONGITUDE")}
                >
                  Detail
                </button>
              </div>
              <input
                id="LONGITUDE"
                type="number"
                name="LONGITUDE"
                min="-180"
                max="180"
                step="any"
                value={inputs.LONGITUDE}
                onChange={handleChange}
              />
              {inputErrors.LONGITUDE && (
                <p className="error-text">{inputErrors.LONGITUDE}</p>
              )}
            </div>

          </div>
        </div>
      </div>

      {isDetailVisible && activeDetail && (
        <div
          className="popup-overlay show"
          style={{ opacity: detailOpacity, transition: "opacity 0.4s ease" }}
        >
          <div className="popup-content">
            {/*<h3>{activeDetail.replace(/_/g, ' ')}</h3>*/}
            <h3>{fieldLabelMap[activeDetail] || activeDetail.replace(/_/g, ' ')}</h3>

            <p>
              <strong>Field:</strong>{" "}
              {fieldDescriptions[activeDetail]?.description || "No description available."}
            </p>

            <p>
              <strong>Selected:</strong> {inputs[activeDetail]}
            </p>

            <p>
              <strong>Meaning:</strong>{" "}
              {(() => {
                const value = parseFloat(inputs[activeDetail]);

                if (activeDetail === "LATITUDE") {
                  if (value < -90) return "Too low! Valid range is -90 to 90.";
                  if (value > 90) return "Too high! Valid range is -90 to 90.";
                }
                if (activeDetail === "LONGITUDE") {
                  if (value < -180) return "Too low! Valid range is -180 to 180.";
                  if (value > 180) return "Too high! Valid range is -180 to 180.";
                }

                // fallback to default mapped meaning
                return (
                  fieldDescriptions[activeDetail]?.options?.[inputs[activeDetail]] ||
                  fieldDescriptions[activeDetail]?.options?.[""] ||
                  "No detail for this option."
                );
              })()}
            </p>

            <button className="popup-close" onClick={closeDetailPopup}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
