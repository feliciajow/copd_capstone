import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/about.css'; 

function About() {
  const navigate = useNavigate();

  return (
    <div className="about-container">
      <div className="about-content">
        <div className="text-container">
        <h1 className="about-title">
          Saving a life with AI prediction calculator 
        </h1>
        <p className="about-text">
          Empowering physicians with advanced multi-modal tools to improve treatment selection and patient outcomes.
        </p>
        <button 
          className="about-button"
          onClick={() => navigate('/dashboard')}
        >
          Get predictions →
        </button>
        </div>
        <div className="image-container">
          <img src="/lung_new.png"  />
        </div>
      </div>

      <div className="goal-section">
        <span className="goal-badge">Our Goal</span>
        <h2 className="goal-text">
          Our goal is to address the prevelant issue of COPD and asthmatic deaths using out cutting edge prediction analysis.
        </h2>
      </div>

      {/* Step-by-step section */}
      <div className="steps-section">
        <h3 className="steps-subtitle">FAST SOLUTION</h3>
        <h2 className="steps-title">Step by step to get your prediction</h2>

        <div className="steps-grid">
          <div className="step-box">
            <div className="step-icon">📁</div>
            <h4 className="step-title">Upload Data</h4>
            <p className="step-desc">Start by uploading patient data for preprocessing and analysis</p>
          </div>
          <div className="step-box">
            <div className="step-icon">⚙️</div>
            <h4 className="step-title">Train Model</h4>
            <p className="step-desc">Leverage automated machine learning to build a tailored model optimized for accurate predictions</p>
          </div>
          <div className="step-box">
            <div className="step-icon">📊</div>
            <h4 className="step-title">Get Predictions</h4>
            <p className="step-desc">Access our interactive dashboard to generate precise predictions for readmission and mortality risk</p>
          </div>
          <div className="step-box">
            <div className="step-icon">💡</div>
            <h4 className="step-title">Save Lives</h4>
            <p className="step-desc">Provide clinicians with timely insights to make informed, life-saving treatment decisions</p>
          </div>
        </div>
      </div>

    {/* Graph Explanation Section */}
    <div className="graph-explainer-section">
      <h3 className="graph-title">What Our Predictions Look Like</h3>
      <p className="graph-description">
      Our platform visualizes both readmission and death probability curves over time, giving physicians a clear and actionable overview of patient risk.
      On the Readmission Probability Curve, you can instantly see the likelihood of a patient being readmitted within 30 or 60 days — a critical window for planning follow-up care and interventions.
      The Death Probability Curve helps assess longer-term risk, showing death probabilities at 6 months and 1 year. This allows healthcare providers to make informed decisions for advanced care planning or early intervention strategies.
      These dynamic, time-based curves transform static risk scores into meaningful clinical insights, all powered by AI.
      </p>
      <div className="graph-pair">
        <div className="graph-card">
          <img src="/readmission_graph.png" alt="Readmission Probability Curve" />
          <p className="graph-caption">Readmission Probability Curve</p>
        </div>
        <div className="graph-card">
          <img src="/Death_graph.png" alt="Death Probability Curve" />
          <p className="graph-caption">Death Probability Curve</p>
        </div>
      </div>
    </div>
    </div>
  );
}

export default About;
