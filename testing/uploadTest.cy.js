import React from 'react';
import Retrain from '../src/pages/retrain'
import { MemoryRouter } from 'react-router-dom';
import 'cypress-file-upload';

describe('Viewing of Retrain Page', () => {
    beforeEach(() => {
      cy.viewport(1200, 1000);
      cy.mount(
        <MemoryRouter>
            <Retrain email="sihuii2709@gmail.com"/>
        </MemoryRouter>
      );
    });
  
    it('Should display the upload file section', () => {
      cy.get('h1').should('contain', 'Upload File');
      cy.get('input[type="file"]').should('exist');
      cy.get('button').contains('Upload File').should('exist');
    });

    it('Should display the dropdown with diagnostic code options', () => {
      cy.get('.ant-select').should('exist');
      cy.get('.ant-select').click();
      cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
      cy.get('.ant-select-item-option').first().should('contain','J44 (COPD)');
    });

    it('Should be able to enter model name and select diagnostic code on the upload file section', () => {
      cy.get('input[placeholder="Enter model name"]').type('TestModel');
      cy.get('.ant-select').should('exist');
      cy.get('.ant-select').click();
      cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
      cy.get('.ant-select-item-option').first().click();
    });

    it('Upload an invalid file type on the upload page', () => {
      cy.get('input[placeholder="Enter model name"]').type('TestModel');
      cy.get('.ant-select').should('exist');
      cy.get('.ant-select').click();
      cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
      cy.get('.ant-select-item-option').first().click();
    });
})