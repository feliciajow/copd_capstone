import React from 'react';
import Login from '../src/pages/login'

describe('Login Page', () => {
    beforeEach(() => {
        cy.viewport(1200, 1000);
        cy.mount(
          <MemoryRouter>
              <Login email="sihuii2709@gmail.com"/>
          </MemoryRouter>
        );
    });

    context('Login Page Rendering', () => {
      it('Should display the Login section section', () => {
        cy.get('h1').should('contain', 'Welcome Back');
        //button for refreshing of page
        cy.get('button').first().click();
      });

      it('Should log in successfully and redirect to the dashboard', () => {
        // Fill in the login form
        cy.get('input[name="email"]').type('judy234@gmail.com');
        cy.get('input[name="password"]').type('judy2345');
        cy.get('button[type="submit"]').click();
        cy.url().should('include', '/dashboard');
        cy.contains('Welcome to the Dashboard').should('be.visible');
      });

      it('Should display an error message for invalid login credentials', () => {
        // fill in the login form with invalid credentials
        cy.get('input[name="email"]').type('invaliduser@gmail.com');
        cy.get('input[name="password"]').type('wrongpassword');
        // submit the form
        cy.get('button[type="submit"]').click();
        // an error message is displayed
        cy.contains('Login failed').should('be.visible');
      });

      it('Should display validation messages for empty fields', () => {
        // submit the form without filling in any fields
        cy.get('button[type="submit"]').click();
        // validation messages
        cy.contains('Please input your email!').should('be.visible');
        cy.contains('Please input your password!').should('be.visible');
      });

      it('Should display a validation message for short passwords', () => {
        cy.get('input[name="email"]').type('judy234@gmail.com');
        cy.get('input[name="password"]').type('short');
        // submit the form
        cy.get('button[type="submit"]').click();
        // validation message
        cy.contains('Passwords must be at least 8 characters long.').should('be.visible');
      });

      it('Should open the Forgot Password modal and allow email submission', () => {
        cy.contains('Forgot password').click();
        cy.get('.ant-modal').should('be.visible');
        cy.contains('Forgot Password').should('be.visible');
        // fill in the email field and submit
        cy.get('input[placeholder="Enter your email"]').type('judy234@gmail.com');
        cy.get('button').contains('Reset Link').click();
        cy.contains('Reset Token').should('be.visible');
      });
    });
})