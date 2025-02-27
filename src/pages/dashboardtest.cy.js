import React from 'react'
import Dashboard from './dashboard'
import { mount, render, shallow } from 'cypress/react'

describe('Testing of Dashboard Components', () => {
  beforeEach(() => {
    cy.viewport(1200, 1000)
    cy.intercept('GET', 'http://localhost:5001/diagnostic-codes', {
      statusCode: 200,
      body: {
        codes: ['I47', 'I46', 'E22','E14','F05','Y95','K29','I26','E16']
      }
    }).as('getDiagnosticCodes');
    cy.mount(<Dashboard />);
    cy.wait('@getDiagnosticCodes');
  });

  it('It should render the dashboard page', () => {
    cy.mount(<Dashboard />)
    cy.get('h3').should('contain', 'Estimated Survival')
    cy.get('h3').should('contain', 'Estimated Readmission')
  })
  it('It should show the input fields and button of form', () => {
    cy.mount(<Dashboard />)
    cy.get('h2').should('contain', 'Gender')
    cy.get('h2').should('contain', 'Age')
    cy.get('h2').should('contain', 'Number of Times Admitted')
    cy.get('h2').should('contain', 'Diagnostic Codes')
  })

  it('It should display the predict button', () => {
    cy.get('.predict-btn').should('exist');
    cy.get('.predict-btn').should('have.text', 'Predict');
  });

  it('It should be able to select more than one diagnostic code', () => {
    cy.get('select').eq(1).select('I26');
    cy.get('select').eq(1).select('K29');
    cy.get('.predict-btn').should('exist');
    cy.get('.predict-btn').should('have.text', 'Predict');
  });

  it('Error should occur if there is empty inputs', () => {
    cy.get('input[type="number"]').first().type('65');
    cy.get('select').eq(1).select('K29');
    cy.get('.predict-btn').click();
  });

  it('Submit successful when all inputs are provided', () => {
    cy.get('select').first().select('male');
    //select first num input field using .first()
    //.first() → selects the first element (eq(1) → selects the second element, .eq(2) → selects the third element
    cy.get('input[type="number"]').first().type('65');
    cy.get('input[type="number"]').eq(1).type('3');
    cy.get('select').eq(1).select('K29');
    cy.get('.predict-btn').click();
  });

  it('POST request should be triggered when predict button is clicked', () => {
    cy.intercept('POST', 'http://localhost:5001/predict', {
      statusCode: 200,
      body: {
        survival_6_month: 0.85,
        survival_12_month: 0.75,
        readmission_1_year: 0.3,
        readmission_5_year: 0.6,
        survival_curve: {
          time: [0, 30, 60, 90],
          probability: [0, 0.05, 0.1, 0.15]
        }
      }
    }).as('predictAPI');
    
    cy.get('select').first().select('female');
    cy.get('input[type="number"]').first().type('75');
    cy.get('input[type="number"]').eq(1).type('3');
    cy.get('select').eq(1).select('K29');
    cy.get('.predict-btn').click();

    // Check if prediction results displayed have the percentage instead of NA
    cy.get('.probability').should('contain', '%');
  });
})

