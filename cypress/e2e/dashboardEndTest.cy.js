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
        cy.get('.diagnostic-btn').click();
        //click the checkboxes
        cy.get('.ant-checkbox-wrapper')
        .first()
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
        cy.contains('button', 'OK').click();
        cy.get('.predict-btn').click();
        // wait for the prediction to complete
        cy.wait(2000); 
        //show percentage in the dashboard box
        cy.contains('%').should('be.visible');
    })

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

    it('Should display loading state while waiting for prediction', () => {
        //navigate to dashboard page
        cy.visit('http://localhost:3000/dashboard')
        cy.get('select.input-field').eq(1).select('male');
        cy.get('input[placeholder="Enter age"]').type('45');
        cy.get('input[placeholder="Enter times admitted"]').type('3');
        cy.get('.diagnostic-btn').click();
        //click the checkboxes
        cy.get('.ant-checkbox-wrapper')
        .eq(1)
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
        cy.contains('button', 'OK').click();
        cy.get('.predict-btn').click();
        cy.get('.ant-spin').should('be.visible');
    });

})