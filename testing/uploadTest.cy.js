import React from 'react';
import Retrain from '../src/pages/retrain'
import { MemoryRouter } from 'react-router-dom';

describe('Viewing of Retrain Page', () => {
    beforeEach(() => {
      cy.viewport(1200, 1000);
      cy.mount(
        <MemoryRouter>
            <Retrain email="sihuii2709@gmail.com"/>
        </MemoryRouter>
      );
    });
  
    it('Should display the Model section section', () => {
      cy.get('h1').should('contain', 'Upload File');
    });

})