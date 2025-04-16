describe('About Page', () => {
  beforeEach(() => {
      // Visit the About Page before each test
      cy.visit('http://localhost:3000/about');
  });

  it('Should load the About Page successfully', () => {
      // Verify the page title
      cy.get('h1.about-title').should('contain', 'Saving a life with AI prediction calculator');
      // Verify the goal section is visible
      cy.get('.goal-section').should('be.visible');
      // Verify the step-by-step section is visible
      cy.get('.steps-section').should('be.visible');
  });

  it('Should display the step-by-step process', () => {
      // Verify the step titles
      cy.get('.step-title').should('contain', 'Upload Data');
      cy.get('.step-title').should('contain', 'Train Model');
      cy.get('.step-title').should('contain', 'Get Predictions');
      cy.get('.step-title').should('contain', 'Save Lives');
  });

  it('Should display the graph explanation section', () => {
      // Verify the graph explanation title
      cy.get('.graph-title').should('contain', 'What Our Predictions Look Like');
      // Verify the graph images are visible
      cy.get('.graph-card img').should('have.length', 2);
      cy.get('.graph-card img').first().should('have.attr', 'alt', 'Readmission Probability Curve');
      cy.get('.graph-card img').last().should('have.attr', 'alt', 'Death Probability Curve');
  });

  it('Should navigate to the Dashboard page when "Get predictions" button is clicked', () => {
      // Click the "Get predictions" button
      cy.get('.about-button').click();
      // Verify the URL is updated to the Dashboard page
      cy.url().should('include', '/dashboard');
  });
});
