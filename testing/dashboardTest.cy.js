import React from 'react';
import UploadFile from '../src/pages/UploadFile'
import ExcelTemplate from '../src/pages/downloadExcel'
import Dashboard from '../src/pages/dashboard'

describe('Viewing of Dashboard Page', () => {
  beforeEach(() => {
    cy.viewport(1200, 1000);
    cy.mount(<Dashboard />);
  });

  it('Should display the Estimated Readmission section', () => {
    cy.get('h3').should('contain', 'Estimated Readmission');
  });

  it('Should display the Estimated Death section', () => {
    cy.get('h3').should('contain', 'Estimated Death');
  });

  it('Should display the Select Model dropdown but no selection allowed if no account login', () => {
    cy.get('select.input-field').should('exist');
    cy.get('select.input-field').should('be.disabled');
  });

  it('Should display the Select Model dropdown but selection allowed if account login', () => {
    cy.mount(<Dashboard email="sihuii2709@gmail.com"/>);
    cy.get('select.input-field').should('exist');
    cy.get('select.input-field').should('not.be.disabled');
  });

  it('Model selection is allowed if account login', () => {
    cy.mount(<Dashboard email="sihuii2709@gmail.com"/>);
    cy.get('select.input-field').should('exist');
    cy.get('select.input-field').should('not.be.disabled');
    cy.get('select.input-field').should('contain','Select a model')
  });

  it('Should be able to select the diagnostic codes from dropdown', () => {
    cy.contains('Diagnostic Codes').should('exist');
    cy.get('select.input-field').last().select(1);
    cy.get('select.input-field').last().select(2);
  });

  it('Should be able to predict', () => {
    cy.get('select.input-field').eq(1).select('male');
    cy.get('input[placeholder="Enter age"]').type('45');
    cy.get('input[placeholder="Enter times admitted"]').type('3');
    cy.get('select.input-field').last().select(1);
    cy.get('.predict-btn').click();
    //if results not shown it will show N/A instead of %
    cy.get('.results-group').should('contain', '%');
  });
})
