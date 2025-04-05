import React from 'react';
import Model from '../src/pages/Models'
import { MemoryRouter } from 'react-router-dom';

describe('Models Page', () => {
    beforeEach(() => {
      cy.viewport(1200, 1000);
      cy.mount(
        <MemoryRouter>
            <Model email="sihuii2709@gmail.com"/>
        </MemoryRouter>
      );
    });

    context('Model Page Rendering', () => {
      it('Should display the Model section section', () => {
        cy.get('h1').should('contain', 'Models History');
        //button for train new model
        cy.get('button').last().click();
        //button for refreshing of page
        cy.get('button').first().click();
      });

      it('Model table will be displayed',()=> {
        cy.get('table').should('exist');
        cy.get('table').contains('0.79').should('exist');
      });
    });

    context('Model table interactions', () => {

      it('Should allow sorting by C Index', () => {
        cy.get('table').contains('C Index').click();
        cy.get('table').first().should('contain', '0.787');
      });

      it('Should allow sorting by timestamp', () => {
        cy.get('table').contains('Created At').click(); 
      });

      it('Should allow pagination', () => {
        cy.get('table').should('exist');
        cy.get('.ant-pagination').should('exist');
        cy.get('.ant-pagination-item').contains('2').click();
      });

    });
})