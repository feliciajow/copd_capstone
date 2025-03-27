import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, message, Row, Col } from 'antd';
import axios from "axios";
import '../styles/dashboard.css';
import '../styles/style.css';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Spin, Alert } from 'antd';
import Plot from 'react-plotly.js';
import * as XLSX from "xlsx";
import icd10Excel from "../data/icd10_code.xlsx";

const Dashboard = ({ email }) => {
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [timesAdmitted, setTimesAdmitted] = useState('');
    const [diagnosticCodes, setDiagnosticCodes] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState([]);
    const [prediction, setPrediction] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);
    const [diagnosticOptions, setDiagnosticOptions] = useState([
        { code: "J44", description: "COPD" },
        { code: "I10", description: "Hypertension" },
        { code: "E11", description: "Diabetes Mellitus" }
    ]);

    useEffect(() => {
        loadICDCodesFromFile();
        console.log("Email in Dashboard:", email);
        fetchModels();
    }, [email]);

    // Fetch trained models from backend
    const fetchModels = () => {
        setLoading(true);
        fetch('http://localhost:5000/model', {
            method: 'GET',
            headers: { "Content-Type": "application/json", "Email": email || "" },
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json().then((data) => {
                        throw new Error(data.error || 'Failed to fetch models');
                    });
                }
                return response.json();
            })
            .then((modelList) => {
                console.log("Fetched Models:", modelList);

                if (Array.isArray(modelList) && modelList.length > 0) {
                    setModels(modelList);

                    // Auto-select the latest model for non-registered users
                    if (!email) {
                        const latestModel = modelList.reduce((a, b) =>
                            new Date(a.timestamp) > new Date(b.timestamp) ? a : b
                        );
                        setSelectedModel(latestModel.modelid);
                        console.log("Auto-selected latest model for guest:", latestModel.modelid);
                        // Wait for state update before predicting
                        setTimeout(() => {
                            handlePredict();
                        }, 100);
                    }
                } else {
                    console.warn("No models found in the database");
                }
            })
            .catch((error) => {
                setAlertMessage(
                    <Alert
                        message="Model Load Error"
                        description={error.message}
                        type="error"
                        showIcon
                        className="mb-4"
                    />
                );
            })
            .finally(() => {
                setLoading(false);
            });
    };

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

    const handleModelChange = (e) => {
        if (email) {
            const modelId = parseInt(e.target.value, 10); // Convert to integer
            setSelectedModel(modelId);
            console.log("User selected model:", modelId);
        }
    };


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

        if (!selectedModel && email) validationErrors.model = "*Model selection is required";
        if (genderMapped === null) validationErrors.gender = "*Gender is required";
        if (!age || parseInt(age) <= 0) validationErrors.age = "*Age is required";
        if (!timesAdmitted || parseInt(timesAdmitted) <= 0) validationErrors.timesAdmitted = "*Number of admissions is required";
        if (selectedCodes.length === 0) validationErrors.diagnosticCodes = "*At least one diagnostic code is required";

        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setLoading(true);
        try {
            const response = await axios.post("http://localhost:5001/predict", {
                modelid: Number(selectedModel),
                gender: genderMapped,
                age: parseInt(age),
                readmissions: parseInt(timesAdmitted),
                diagnosticCodes: selectedCodes
            });
            console.log("API Response:", response.data);

            setPrediction(response.data);
        } catch (error) {
            setAlertMessage(
                <Alert
                    message="Prediction Error"
                    description={error.response?.data?.error || "Error making prediction"}
                    type="error"
                    showIcon
                    className="mb-4"
                />
            );
        } finally {
            setLoading(false);
        }
    };

    // const deathData = prediction?.survival_curve?.time?.map((day, index) => ({
    //     days: day,
    //     Survival: prediction.survival_curve.probability[index]
    // })) || [];

    const loadICDCodesFromFile = async () => {
        try {
            const response = await fetch(icd10Excel);
            const blob = await response.blob();

            const reader = new FileReader();
            reader.readAsBinaryString(blob);

            reader.onload = (e) => {
                const binaryStr = e.target.result;
                const workbook = XLSX.read(binaryStr, { type: "binary" });

                if (workbook.SheetNames.length === 0) {
                    throw new Error("No sheets found in the Excel file.");
                }

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    throw new Error("Sheet is empty or invalid.");
                }

                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    throw new Error("Excel file has no data.");
                }

                // Extract ICD-10 codes
                const extractedCodes = jsonData.map(row => {
                    if (row["ICD-10 Combined"]) {
                        const [code, ...descParts] = row["ICD-10 Combined"].split(": ");
                        return { code, description: descParts.join(": ") || "No description available" };
                    }
                    return null;
                }).filter(Boolean);

                setDiagnosticOptions((prevOptions) => {
                    const newOptions = [...prevOptions, ...extractedCodes].filter((item, index, self) =>
                        index === self.findIndex((t) => t.code === item.code)
                    );
                    return newOptions;
                });

                message.success("ICD-10 codes loaded from Excel file!");
            };
        } catch (error) {
            console.error("Error loading Excel file:", error);
            message.error("Error loading ICD-10 codes: " + error.message);
        }
    };

    const getDiagnosticDescription = (code) => {
        // compare diagnostic code with the diagnostic code in the excel return its description
        const codeOption = diagnosticOptions.find((option) => option.code === code);
        return codeOption ? codeOption.description : 'Description not available';
    };

    const generateDeathCurve = () => {
        if (!prediction || !prediction.death_curve) {
            console.log("No death curve data available");
            return [];
        }

        const deathData = prediction.death_curve.time.map((day, index) => ({
            days: day,
            death: 1 - prediction.death_curve.probability[index],
        }))
            .filter((point) => point.days <= 365);

        console.log("Death Data for Graph:", deathData);

        return deathData;
    };


    const generateReadmissionCurve = () => {
        if (!prediction || !prediction.readmission_curve) {
            console.log("No readmission curve data available");
            return [];
        }

        const readmissionData = prediction.readmission_curve.time.map((day, index) => ({
            days: day,
            Readmission: 1 - prediction.readmission_curve.probability[index],
        }))
            .filter((point) => point.days <= 300);

        console.log("Readmission Data for Graph:", readmissionData);

        return readmissionData;
    };

    const deathData = generateDeathCurve();
    const readmissionData = generateReadmissionCurve();

    return (
        <div className="dashboard-container">
            {loading ? (
                <div className="loading">
                    <Spin size="large" />
                    <h2>Please wait patiently...</h2>
                </div>
            ) : (
                <>
                    <div className="results-container">
                        <div className="results-group estimated-readmission">
                            <h3>
                                Estimated Readmission{' '}
                                <Tooltip title="Estimated Readmission Probability over 30 and 60 days" placement="top">
                                    <InfoCircleOutlined style={{ fontSize: '17px', color: '#1890ff' }} />
                                </Tooltip>
                            </h3>
                            <div className="metric-cards">
                                <div className="probability">
                                    <h3>30 days</h3>
                                    <p>{prediction?.readmission_30_day ? `${(prediction.readmission_30_day * 100).toFixed(1)}%` : "N/A"}</p>
                                </div>
                                <div className="probability">
                                    <h3>60 days</h3>
                                    <p>{prediction?.readmission_60_day ? `${(prediction.readmission_60_day * 100).toFixed(1)}%` : "N/A"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="results-group estimated-survival">
                            <h3>
                                Estimated Death{' '}
                                <Tooltip title="Estimated Survival Probability over 6 and 12 months" placement="top">
                                    <InfoCircleOutlined style={{ fontSize: '17px', color: '#1890ff' }} />
                                </Tooltip>
                            </h3>
                            <div className="metric-cards">
                                <div className="probability">
                                    <h3>6 month</h3>
                                    <p>{(prediction?.death_6_month) ? `${(100 - (prediction.death_6_month * 100)).toFixed(1)}%` : "N/A"}</p>
                                </div>
                                <div className="probability">
                                    <h3>12 month</h3>
                                    <p>{prediction?.death_12_month ? `${(100 - (prediction.death_12_month * 100)).toFixed(1)}%` : "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="main-content">
                        <div className="form-section">
                            <h2>Select Model To Use{' '}
                                <Tooltip title="The default model will be used if no account is login." placement="top">
                                    <InfoCircleOutlined style={{ fontSize: '17px', color: '#1890ff' }} />
                                </Tooltip>
                            </h2>
                            <select
                                className="input-field"
                                value={selectedModel}
                                onChange={handleModelChange}
                                disabled={!email}
                            >
                                <option value="">Select a model</option>
                                {models.map((model) => (
                                    <option key={model.modelid} value={model.modelid}>
                                        ID: {model.modelid} - {model.model_name}
                                    </option>
                                ))}
                            </select>
                            {errors.model && <p className="error-message">{errors.model}</p>}

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
                                showSearch
                                value="">
                                <option value="">Choose codes</option>
                                {diagnosticCodes.map((code) => (
                                    <option key={code} value={code}>{code} - {getDiagnosticDescription(code)}</option>
                                ))}
                            </select>
                            {errors.diagnosticCodes && <p className="error-message">{errors.diagnosticCodes}</p>}

                            <div className="selected-codes">
                                {selectedCodes.map((code) => (
                                    <span key={code} className="selected-code">
                                        {code} - {getDiagnosticDescription(code)}
                                        <button onClick={() => removeCode(code)}>X</button>
                                    </span>
                                ))}
                            </div>
                            <button className="predict-btn" onClick={handlePredict} >Predict</button>
                        </div>

                        <Row className="chart-section">
                            {/* Readmission Probability Chart */}
                            <Col md={11}>
                            <div className="chart-container">
                                <div className="chart">
                                    <Plot
                                        data={readmissionData.length > 0 ? [{
                                            x: readmissionData.map(d => d.days),
                                            y: readmissionData.map(d => d.Readmission),
                                            type: 'scatter',
                                            mode: 'lines',
                                            name: 'Readmission Curve',
                                            line: { width: 5 },
                                            marker: { color: 'purple' }
                                        },
                                        {
                                            x: [30],
                                            y: [(prediction?.readmission_30_day || 0)],
                                            type: 'scatter',
                                            mode: 'markers+text',
                                            marker: { color: 'red', size: 10 },
                                            name: '30 Days',
                                            text: ['Day 30'],
                                            textposition: 'top center',
                                            hovertemplate:
                                                'Day: %{x}<br>Readmission: %{y:.2%}<extra>30 Days</extra>'
                                        },
                                        {
                                            x: [60],
                                            y: [(prediction?.readmission_60_day || 0)],
                                            type: 'scatter',
                                            mode: 'markers+text',
                                            marker: { color: 'green', size: 10 },
                                            name: '60 Days',
                                            text: ['Day 60'],
                                            textposition: 'top center',
                                            hovertemplate:
                                                'Day: %{x}<br>Readmission: %{y:.2%}<extra>60 Days</extra>'
                                        }
                                        ]
                                            : []
                                        }
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
                                            annotations: readmissionData.length === 0 ? [{
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
                            </Col>
                            <Col md ={1}></Col>
                            {/* Death Probability Chart */}
                            <Col md={11}>
                            <div className="chart-container">
                                <div className="chart">
                                    <Plot
                                        data={deathData.length > 0 ? [{
                                            x: deathData.map(d => d.days),
                                            y: deathData.map(d => d.death),
                                            type: 'scatter',
                                            mode: 'lines',
                                            name: 'Death Curve',
                                            line: { width: 5 },
                                            marker: { color: 'purple' }
                                        },
                                        {
                                            x: [180],
                                            y: [(1 - (prediction?.death_6_month) || 0)],
                                            type: 'scatter',
                                            mode: 'markers+text',
                                            marker: { color: 'red', size: 10 },
                                            name: '6 Month',
                                            text: ['Day 180'],
                                            textposition: 'top center',
                                            hovertemplate:
                                                'Day: %{x}<br>Death: %{y:.2%}<extra>6 Month</extra>'
                                        },
                                        {
                                            x: [365],
                                            y: [(1 - (prediction?.death_12_month) || 0)],
                                            type: 'scatter',
                                            mode: 'markers+text',
                                            marker: { color: 'green', size: 10 },
                                            name: '12 Month',
                                            text: ['Day 365'],
                                            textposition: 'top center',
                                            hovertemplate:
                                                'Day: %{x}<br>Death: %{y:.2%}<extra>12 Month</extra>'
                                        }
                                        ]
                                            : []
                                        }
                                        layout={{
                                            title: {
                                                text: 'Death Probability Curve',
                                                font: { size: 19 },
                                                x: 0.5,
                                                xanchor: 'center'
                                            },
                                            xaxis: {
                                                title: { text: 'Time (Days)', font: { size: 17 } },
                                                range: [0, 400],
                                                showgrid: true,
                                                zeroline: true,
                                            },
                                            yaxis: {
                                                title: { text: 'Death Probability', font: { size: 17 } },
                                                range: [0, 1],
                                                showgrid: true,
                                                zeroline: true,
                                            },
                                            annotations: deathData.length === 0 ? [{
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
                            </Col>
                        </Row>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;