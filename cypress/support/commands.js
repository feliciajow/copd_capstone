// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

// cypress/support/commands.js

Cypress.Commands.add('login', (email, password) => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5000/api/users/loggedin', // your login API endpoint
      body: { email, password },
    }).then((response) => {
      window.localStorage.setItem('authToken', response.body.token); // or use cookies if applicable
    });
  });
  
  