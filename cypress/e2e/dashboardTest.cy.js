describe('Dashboard Page', () => {
    it('Able to load the dashboard page', () => {
      //load dashboard up page
      cy.viewport(1280,720);
      cy.visit('http://localhost:3000/dashboard');
    })

    it('Able to predict to display prediction results and charts', () => {
        //navigate to dashboard page
        cy.visit('http://localhost:3000/dashboard')
        cy.get('select.input-field').eq(1).select('male');
        cy.get('input[placeholder="Enter age"]').type('45');
        cy.get('input[placeholder="Enter times admitted"]').type('3');
        cy.get('select.input-field').last().select(1);
        cy.get('.predict-btn').click();
        //show percentage in the dashboard box
        cy.contains('%').should('be.visible');
    })
    
    it('Able to select multiple diagnostic codes from the diagnostic dropdown', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('select.input-field').last().select(2);
        cy.get('select.input-field').last().select(1);
        cy.get('select.input-field').last().select(4);
    })

    it('Should display validation errors for empty fields', () => {
        //input details into the login form
        cy.visit('http://localhost:3000/dashboard');
        cy.get('.predict-btn').click();
        cy.contains('*Gender is required').should('be.visible');
        cy.contains('*Age is required').should('be.visible');
        cy.contains('*Number of admissions is required').should('be.visible');
        cy.contains('*At least one diagnostic code is required').should('be.visible');
    })

    it('Display a loading spinner while prediction is processed', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('select.input-field').eq(1).select('male');
        cy.get('input[placeholder="Enter age"]').type('45');
        cy.get('input[placeholder="Enter times admitted"]').type('3');
        cy.get('select.input-field').last().select(1);
        cy.get('.predict-btn').click();
        cy.get('.loading').should('be.visible');
        cy.contains('Please wait patiently and do not leave the page...').should('be.visible');
    });

    it('Should handle backend API errors', () => {
        // intercept the prediction API and simulate error response
        cy.intercept('POST', 'http://localhost:5000/api/dashboard/predict', {
            statusCode: 500,
            body: { error: 'Internal Server Error' },
        });

        // fill up the input fields
        cy.visit('http://localhost:3000/dashboard');
        cy.get('select.input-field').eq(1).select('male');
        cy.get('input[placeholder="Enter age"]').type('45');
        cy.get('input[placeholder="Enter times admitted"]').type('3');
        cy.get('select.input-field').last().select(1);
        cy.get('.predict-btn').click();

        // check if N/A is displayed means no percentage shown
        cy.contains('N/A').should('be.visible');
    });
})