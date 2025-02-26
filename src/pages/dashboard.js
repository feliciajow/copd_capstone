import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import './dashboard.css';
import { Spin } from 'antd';

import Plot from 'react-plotly.js';


const Dashboard = () => {
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [timesAdmitted, setTimesAdmitted] = useState('');
    const [diagnosticCodes, setDiagnosticCodes] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState([]);  
    const [prediction, setPrediction] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    
    //Fetch diagnostic codes from backend
    useEffect(() => {
      async function fetchDiagnosticCodes() {
          try {
              const response = await axios.get("http://localhost:5001/diagnostic-codes");
              console.log("Fetched Diagnostic Codes:", response.data.codes);
              setDiagnosticCodes(response.data.codes);
          } catch (error) {
              console.error("Failed to load diagnostic codes:", error);
          }
      }
      fetchDiagnosticCodes();
    }, []);

    //To handle multiple selection of codes
    const handleSelectChange = (e) => {
        const selectedValue = e.target.value;
        if (selectedValue && !selectedCodes.includes(selectedValue)) {
            setSelectedCodes([...selectedCodes, selectedValue]); // Add code if not already selected
        }
    };

    // Handle removal of selected codes
    const removeCode = (code) => {
        setSelectedCodes(selectedCodes.filter(c => c !== code));
    };

    // Handle form submission
    const handlePredict = async () => {
        let validationErrors = {};
        const genderMapped = gender === "female" ? 1 : gender === "male" ? 0 : null;

        if (genderMapped === null) validationErrors.gender = "*Gender is required";
        if (!age || parseInt(age) <= 0) validationErrors.age = "*Age is required";
        if (!timesAdmitted || parseInt(timesAdmitted) <= 0) validationErrors.timesAdmitted = "*Number of admissions is required";
        if (selectedCodes.length === 0) validationErrors.diagnosticCodes = "*At least one diagnostic code is required";

        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setLoading(true);
        try {
            const response = await axios.post("http://localhost:5001/predict", {
                gender: genderMapped,
                age: parseInt(age),
                readmissions: parseInt(timesAdmitted),
                diagnosticCodes: selectedCodes
            });
            console.log("API Response:", response.data); 

            setPrediction(response.data);
            // Reset form input after prediction
            // setGender('');
            // setAge('');
            // setTimesAdmitted('');
            // setSelectedCodes([]);  
        } catch (error) {
            alert(error.response?.data?.error || "Error making prediction");
        } finally {
            setLoading(false);
        }
    };

    // const survivalData = prediction?.survival_curve?.time?.map((day, index) => ({
    //     days: day,
    //     Survival: prediction.survival_curve.probability[index]
    // })) || [];

    const generateSurvivalCurve = () => {
        if (!prediction || !prediction.survival_curve) {
            console.log("No survival curve data available");
            return [];
        }
    
        const survivalData = prediction.survival_curve.time.map((day, index) => ({
            days: day,
            Survival: 1- prediction.survival_curve.probability[index], 
        }));
    
        console.log("Survival Data for Graph:", survivalData); 
    
        return survivalData;
    };


    const generateReadmissionCurve = () => {
        if (!prediction) return [];

        const days = Array.from({ length: 2695 }, (_, i) => i); // Days from 0 to 1825
        return days.map(day => ({
            days: day,
            Readmission: (prediction.readmission_1_year * Math.log(1 + day / 365)) * 100 // Logarithmic growth
        }));
    };

    const survivalData = generateSurvivalCurve();
    const readmissionData = generateReadmissionCurve();

    return (
        <div className="dashboard-container">
            {loading ? (
                <div className="loading-overlay">
                    <Spin size="large" />
                </div>
            ) : (
                <>
                    <div className="results-container">
                        <div className="results-group estimated-survival">
                            <h3>Estimated Survival</h3>
                            <div className="metric-cards">
                                <div className="probability">
                                    <h3>6 month</h3>
                                    <p>{prediction?.survival_6_month ? `${(prediction.survival_6_month * 100).toFixed(1)}%` : "N/A"}</p>
                                </div>
                                <div className="probability">
                                    <h3>12 month</h3>
                                    <p>{prediction?.survival_12_month ? `${(prediction.survival_12_month * 100).toFixed(1)}%` : "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="results-group estimated-readmission">
                            <h3>Estimated Readmission</h3>
                            <div className="metric-cards">
                                <div className="probability">
                                    <h3>30 days</h3>
                                    <p>{prediction?.readmission_1_year ? `${(prediction.readmission_1_year * 100).toFixed(1)}%` : "N/A"}</p>
                                </div>
                                <div className="probability">
                                    <h3>60 days</h3>
                                    <p>{prediction?.readmission_5_year ? `${(prediction.readmission_5_year * 100).toFixed(1)}%` : "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="main-content">
                        <div className="form-section">
                            <h2>Gender</h2>
                            <select 
                                className="input-field"
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}>
                                <option value="">Select a gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                            {errors.gender && <p className="error-message">{errors.gender}</p>}

                            <h2>Age</h2>
                            <div className="input-container">
                                <input
                                    className="input-field"
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="Enter age"
                                />
                            </div>
                            {errors.age && <p className="error-message">{errors.age}</p>}
                            
                            <h2>Number of Times Admitted</h2>
                            <div className="input-container">
                                <input
                                    className="input-field"
                                    type="number"
                                    value={timesAdmitted}
                                    onChange={(e) => setTimesAdmitted(e.target.value)}
                                    placeholder="Enter times admitted"
                                />
                            </div>
                            {errors.timesAdmitted && <p className="error-message">{errors.timesAdmitted}</p>}

                            <h2>Diagnostic Codes</h2>
                            <select 
                                className="input-field" 
                                onChange={handleSelectChange}
                                value="">
                                <option value="">Choose codes</option>
                                {diagnosticCodes.map((code) => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                            {errors.diagnosticCodes && <p className="error-message">{errors.diagnosticCodes}</p>}
                            
                            <div className="selected-codes">
                                {selectedCodes.map((code) => (
                                    <span key={code} className="selected-code">
                                        {code} 
                                        <button onClick={() => removeCode(code)}>X</button>
                                    </span>
                                ))}
                            </div>

                            <button className="predict-btn" onClick={handlePredict}>Predict</button>
                        </div>
                
                         {/* Survival Probability Chart */}
                         <div className= "chart-section">
                          <div className="chart">
                          <Plot
                                data={survivalData.length > 0 ? [{
                                    x: survivalData.map(d => d.days),
                                    y: survivalData.map(d => d.Survival),
                                    type: 'scatter',
                                    mode: 'lines',
                                    line: { width: 5 },
                                    marker: { color: 'purple' }
                                }] : []}
                                layout={{
                                    title: { 
                                        text: 'Death Probability Curve', 
                                        font: { size: 19 }, 
                                        x: 0.5, 
                                        xanchor: 'center'
                                    },
                                    xaxis: { 
                                        title: { text: 'Time (Days)', font: { size: 17 } },
                                        showgrid: true,
                                        zeroline: true,
                                    },
                                    yaxis: { 
                                        title: { text: 'Death Probability', font: { size: 17 } },
                                        range: [0, 1],
                                        showgrid: true,
                                        zeroline: true,
                                    },
                                    annotations: survivalData.length === 0 ? [{
                                        xref: 'paper', yref: 'paper',
                                        x: 0.5, y: 0.5,
                                        text: 'No data available',
                                        showarrow: false,
                                        font: { size: 20 }
                                    }] : [],
                                    margin: { t: 70, l: 100, r: 40, b: 80 },
                                }}
                            />
                        {/* Readmission Probability Chart */}
                        <div className="chart">
                        <Plot
                                data={survivalData.length > 0 ? [{
                                    x: survivalData.map(d => d.days),
                                    y: survivalData.map(d => d.Survival),
                                    type: 'scatter',
                                    mode: 'lines',
                                    line: { width: 5 },
                                    marker: { color: 'purple' }
                                }] : []}
                                layout={{
                                    title: { 
                                        text: 'Readmission Probability Curve', 
                                        font: { size: 19 }, 
                                        x: 0.5, 
                                        xanchor: 'center'
                                    },
                                    xaxis: { 
                                        title: { text: 'Time (Days)', font: { size: 17 } },
                                        showgrid: true,
                                        zeroline: true,
                                    },
                                    yaxis: { 
                                        title: { text: 'Readmission Probability', font: { size: 17 } },
                                        range: [0, 1],
                                        showgrid: true,
                                        zeroline: true,
                                    },
                                    annotations: survivalData.length === 0 ? [{
                                        xref: 'paper', yref: 'paper',
                                        x: 0.5, y: 0.5,
                                        text: 'No data available',
                                        showarrow: false,
                                        font: { size: 20 }
                                    }] : [],
                                    margin: { t: 70, l: 100, r: 40, b: 80 },
                                }}
                            />
                            </div>
                            </div>

                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;