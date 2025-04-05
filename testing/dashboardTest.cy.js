import React from 'react';
import Dashboard from '../src/pages/dashboard'

describe('Dashboard Page', () => {
  beforeEach(() => {
    cy.viewport(1200, 1000);
    cy.mount(<Dashboard />);
  });

  //display elements in dashboard page
  context('Dashboard Page Sections Rendering', () => {
    it('Should display the Estimated Readmission section and charts', () => {
      cy.get('h3').should('contain', 'Estimated Readmission');
      cy.get('.chart-container').should('exist');
      cy.get('.chart').should('have.length', 2);
    });

    it('Should display the Estimated Death section and charts', () => {
      cy.get('h3').should('contain', 'Estimated Death');
      cy.get('.chart-container').should('exist');
      cy.get('.chart').should('have.length', 2);
    });
  });

  //error validation checks
  context('Error Validation Check', () => {
    it('Should display error messgaes if one of the field is not entered', () => {
      cy.get('input[placeholder="Enter age"]').type('45');
      cy.get('.diagnostic-btn').click();
      //click the checkboxes
      cy.get('.ant-checkbox-wrapper')
        .first()
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
      cy.contains('button', 'OK').click();
      cy.get('.predict-btn').click();
      //show percentage in the dashboard box
      cy.contains('Gender is required').should('be.visible');
      cy.contains('Number of admissions is required').should('be.visible');
    });
  });

  //model selection
  context('Model dropdown selection', () => {
    it('Should display the Select Model dropdown but no selection allowed if no account login', () => {
      cy.get('select.input-field').should('exist');
      cy.get('select.input-field').should('be.disabled');
    });

    it('Should display the Select Model dropdown but selection allowed if account login', () => {
      cy.mount(<Dashboard email="sihuii2709@gmail.com" />);
      cy.get('select.input-field').should('exist');
      cy.get('select.input-field').should('not.be.disabled');
    });

    it('Model selection is allowed if account login', () => {
      cy.mount(<Dashboard email="sihuii2709@gmail.com" />);
      cy.get('select.input-field').should('exist');
      cy.get('select.input-field').should('not.be.disabled');
      cy.get('select.input-field').should('contain', 'Select a model')
    });
  });

  //diagnostic code selection
  context('Diagnostic Code Dropdown', () => {
    it('Should display selectable diagnostic code checkboxes when the diagnostic button is clicked', () => {
      cy.get('.diagnostic-btn').click();
      cy.get('.ant-checkbox-wrapper')
        .eq(0)
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
      cy.get('.ant-checkbox-wrapper')
        .eq(2)
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
    });

    it('Should allow searching and filtering of diagnostic code/description/category', () => {
      cy.get('.diagnostic-btn').click();
      cy.get('input[placeholder="Search filter based on diagnostic category/code/description"]').type('Asthma');
      cy.get('.ant-checkbox-wrapper')
        .first()
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
    });

    it('Should show no results when searching for non-existent diagnostic codes', () => {
      cy.get('.diagnostic-btn').click();
      cy.get('input[placeholder="Search filter based on diagnostic category/code/description"]').type('J55');
      cy.contains('No diagnostic codes available').should('be.visible');
    });

    it('Should allow users to deselect previously checked diagnostic options', () => {
      cy.get('.diagnostic-btn').click();
      cy.get('input[placeholder="Search filter based on diagnostic category/code/description"]').type('Asthma');
      cy.get('.ant-checkbox-wrapper')
        .first()
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
      cy.contains('button', 'OK').click();
      cy.get('.diagnostic-btn').click();
      cy.get('.ant-checkbox-wrapper')
        .first()
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .uncheck({ force: true });
      cy.contains('button', 'OK').click();
      cy.contains('Asthma').should('not.be.visible');
    });
  });

})
