import React from 'react';
import Model from '../src/pages/Models'
import { MemoryRouter } from 'react-router-dom';

describe('Viewing of Models Page', () => {
    beforeEach(() => {
      cy.viewport(1200, 1000);
      cy.mount(
        <MemoryRouter>
            <Model email="sihuii2709@gmail.com"/>
        </MemoryRouter>
      );
    });
  
    it('Should display the Model section section', () => {
      cy.get('h1').should('contain', 'Models History');
      //button for train new model
      cy.get('button').last().click();
      //button for refreshing of page
      cy.get('button').first().click();
    });

    it('Model table will be displayed',()=> {
        
    });
})