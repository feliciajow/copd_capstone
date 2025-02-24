import React from 'react';
import { useNavigate } from 'react-router-dom';
import './about.css'; 

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
    </div>
  );
}

export default About;
