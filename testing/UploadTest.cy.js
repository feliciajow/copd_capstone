import React from 'react';
import UploadFile from '../src/pages/UploadFile'
import ExcelTemplate from '../src/pages/downloadExcel'
import Retrain from '../src/pages/retrain'
import { mount, render, shallow } from 'cypress/react'
import 'cypress-file-upload';

describe('Testing of Upload File Page', () => {
  beforeEach(() => {
    cy.viewport(1200, 1000);
    cy.mount(<Retrain email="sihui@gmail.com" />);
  });

  it('Rendering of Upload File Page', () => {
    cy.get('.ant-steps-item').first().should('have.class', 'ant-steps-item-active');
    cy.get('h1').should('contain', 'Upload File');
    //check if predict button exist
    cy.get('.btns').should('exist');
  })

  it('Rendering of download excel file', () => {
    cy.mount(<ExcelTemplate/>);
    cy.get('p').should('contain', 'Download template file');
    cy.get('button').contains('COPD Asthma Excel Template').should('exist');
  })

  it('Download excel file', () => {
    cy.mount(<ExcelTemplate/>);
    cy.get('button').contains('COPD Asthma Excel Template').should('exist');
    cy.get('button').contains('COPD Asthma Excel Template').click();
  })

  it('Uploading of a file of a wrong type, png', () => {
    cy.get('input[type="file"]').attachFile('lakitus-cloud.png');
    cy.get('.ant-alert').should('contain', 'is not an xlsx, xls, or csv file');
  })

  it('Uploading of a xlsx or csv file will disable the upload button', () => {
    cy.get('input[type="file"]').attachFile('visits 270723 deident.xlsx');
    cy.get('.btns').should('not.be.disabled');
  })

  it('Able to preview file contents after uploading a file', () => {
    cy.get('input[type="file"]').attachFile('visits 270723 deident.xlsx');
    cy.get('.btns').should('not.be.disabled');
    cy.get('.btns').click();
    //correct position of step tracking using eq(1) means second step is active
    cy.get('.ant-steps-item').eq(1).should('have.class', 'ant-steps-item-active');
    cy.contains('button', 'Back').click();
  })
})