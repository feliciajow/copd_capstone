import React from 'react';
import Retrain from '../src/pages/retrain'
import { MemoryRouter } from 'react-router-dom';
import 'cypress-file-upload';
import { Table } from 'antd';

describe('Upload and Preview File Pages', () => {
    beforeEach(() => {
      cy.viewport(1200, 1000);
      cy.mount(
        <MemoryRouter>
            <Retrain email="sihuii2709@gmail.com"/>
        </MemoryRouter>
      );
    });
    context('Form interaction and rendering', () => {
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

      it('Should allow entering a model name and selecting a diagnostic code', () => {
        cy.get('input[placeholder="Enter model name"]').type('TestModel');
        cy.get('.ant-select').should('exist');
        cy.get('.ant-select').click();
        cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
        cy.get('.ant-select-item-option').first().click();
      });
    });

    context('File upload validation', () => {
      it('Should display an error when an unsupported file type is uploaded', () => {
        cy.get('input[placeholder="Enter model name"]').type('TestModel');
        cy.get('.ant-select').should('exist');
        cy.get('.ant-select').click();
        cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
        cy.get('.ant-select-item-option').first().click();
        // Attach an invalid file type
        cy.get('input[type="file"]').attachFile('breathai.png');
        cy.contains('breathai.png is not an xlsx, xls, or csv file').should('be.visible');
        cy.get('.btns').should('be.disabled');
      });

      it('Should display an error when uploaded file has missing required columns', () => {
        cy.get('input[placeholder="Enter model name"]').type('ICD10_Model');
        cy.get('.ant-select').should('exist');
        cy.get('.ant-select').click();
        cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
        cy.get('.ant-select-item-option').first().click();
        // Attach an valid file type
        cy.get('input[type="file"]').attachFile('training_wrong.xlsx');
        cy.get('.btns').should('not.be.disabled');
        cy.get('.btns').click();
        //error message should appear
        cy.contains('Missing required columns: gender, primary diagnosis code (mediclaim). Please fix your file.').should('be.visible');
      });

      it('Should display an error when uploaded file only contains headers', () => {
        cy.get('input[placeholder="Enter model name"]').type('ICD10_Model');
        cy.get('.ant-select').should('exist');
        cy.get('.ant-select').click();
        cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
        cy.get('.ant-select-item-option').first().click();
        // Attach an valid file type
        cy.get('input[type="file"]').attachFile('training_empty.xlsx');
        cy.get('.btns').should('not.be.disabled');
        cy.get('.btns').click();
        //error message should appear
        cy.contains('The file appears to be empty. Please check the content and try again.').should('be.visible');
      });

      it('Should display preview table when valid Excel file is uploaded', () => {
        cy.get('input[placeholder="Enter model name"]').type('ICD10_Model');
        cy.get('.ant-select').should('exist');
        cy.get('.ant-select').click();
        cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
        cy.get('.ant-select-item-option').first().click();
        // Attach an valid file type
        cy.get('input[type="file"]').attachFile('training_file.xlsx');
        cy.get('.btns').should('not.be.disabled');
        cy.get('.btns').click();
        //preview table should be displayed
        cy.get('table').should('exist');
      });

    });

    context('Interactions in Preview File Page', () => {
      it('Should navigate back to Upload File step when Back button is clicked', () => {
        cy.get('input[placeholder="Enter model name"]').type('ICD10_Model');
        cy.get('.ant-select').should('exist');
        cy.get('.ant-select').click();
        cy.get('.ant-select-item-option').should('have.length.greaterThan',0);
        cy.get('.ant-select-item-option').first().click();
        // Attach an valid file type
        cy.get('input[type="file"]').attachFile('training_file.xlsx');
        cy.get('.btns').should('not.be.disabled');
        cy.get('.btns').click();
        //preview table should be displayed
        cy.get('table').should('exist');
        //back button
        cy.get('.btns').first().click();
        cy.contains('Upload File').should('be.visible');
        cy.get('input[placeholder="Enter model name"]').should('exist');
      });
    });

})