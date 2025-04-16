describe('Dashboard Page', () => {
    it('Able to load the dashboard page', () => {
      //load dashboard up page
      cy.viewport(1280,720);
      cy.visit('http://localhost:3000/dashboard');
    })

    it('Should display the Estimated Readmission section and charts', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('h3').should('contain', 'Estimated Readmission');
        cy.get('.chart-container').should('exist');
        cy.get('.chart').should('have.length', 2);
    });

    it('Should display the Estimated Death section and charts', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('h3').should('contain', 'Estimated Death');
        cy.get('.chart-container').should('exist');
        cy.get('.chart').should('have.length', 2);
    });

    it('Should log out and redirect to login page', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('.login-btn').click();
        cy.url().should('include', '/');
        cy.contains('Welcome Back').should('be.visible');
    });
    
    it('Should display the Select Model dropdown but no selection allowed if no account login', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('select.input-field').should('exist');
        cy.get('select.input-field').should('be.disabled');
    });

    it('Should display selectable diagnostic code checkboxes when the diagnostic button is clicked', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('.diagnostic-btn').click();
        cy.get('.ant-checkbox-wrapper')
          .eq(0)
          .scrollIntoView()
          .find('input[type="checkbox"]')
          .check({ force: true });
        cy.get('.ant-checkbox-wrapper')
          .eq(2)
          .scrollIntoView()
          .find('input[type="checkbox"]')
          .check({ force: true });
    });
  
    it('Should allow searching and filtering of diagnostic code/description/category', () => {
    cy.visit('http://localhost:3000/dashboard');
    cy.get('.diagnostic-btn').click();
    cy.get('input[placeholder="Search filter based on diagnostic category/code/description"]').type('Asthma');
    cy.get('.ant-checkbox-wrapper')
        .first()
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
    });
  
    it('Should show no results when searching for non-existent diagnostic codes', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('.diagnostic-btn').click({force : true});
        cy.get('input[placeholder="Search filter based on diagnostic category/code/description"]').type('J55');
        cy.wait(2000);
        cy.contains('No diagnostic codes available').should('be.visible');
    });
  
    it('Should allow users to deselect previously checked diagnostic options', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('.diagnostic-btn').click();
        cy.get('input[placeholder="Search filter based on diagnostic category/code/description"]').type('Asthma');
        cy.get('.ant-checkbox-wrapper')
          .first()
          .scrollIntoView()
          .find('input[type="checkbox"]')
          .check({ force: true });
        cy.contains('button', 'OK').click();
        cy.wait(2000);
        cy.get('.diagnostic-btn').click();
        cy.wait(2000);
        cy.get('.ant-checkbox-wrapper')
          .first()
          .scrollIntoView()
          .find('input[type="checkbox"]')
          .uncheck({ force: true });
        cy.contains('button', 'OK').click();
        cy.wait(2000);
        cy.contains('Asthma').should('not.be.visible');
    });
  
    it('Should display error messgaes if one of the field is not entered', () => {
        cy.visit('http://localhost:3000/dashboard');
        cy.get('input[placeholder="Enter age"]').type('45');
        cy.get('.diagnostic-btn').click();
        //click the checkboxes
        cy.wait(2000);
        cy.get('.ant-checkbox-wrapper')
          .first()
          .scrollIntoView()
          .find('input[type="checkbox"]')
          .check({ force: true });
        cy.wait(2000);
        cy.contains('button', 'OK').click();
        cy.get('.predict-btn').click({force:true});
        cy.wait(2000);
        //show percentage in the dashboard box
        cy.contains('Gender is required').should('be.visible');
        cy.wait(2000);
        cy.contains('Number of admissions is required').should('be.visible');
    });

    it('Able to predict to display prediction results and charts', () => {
        //navigate to dashboard page
        cy.visit('http://localhost:3000/dashboard')
        cy.get('select.input-field').eq(1).select('male');
        cy.get('input[placeholder="Enter age"]').type('45');
        cy.get('input[placeholder="Enter times admitted"]').type('3');
        cy.get('.diagnostic-btn').click();
        cy.wait(2000);
        //click the checkboxes
        cy.get('.ant-checkbox-wrapper')
        .first()
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
        cy.contains('button', 'OK').click();
        cy.wait(2000);
        cy.get('.predict-btn').click();
        // wait for the prediction to complete
        cy.wait(3000); 
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
        cy.wait(2000);
        cy.get('.ant-checkbox-wrapper')
        .eq(1)
        .scrollIntoView()
        .find('input[type="checkbox"]')
        .check({ force: true });
        cy.wait(2000);
        cy.contains('button', 'OK').click();
        cy.wait(2000);
        cy.get('.predict-btn').click({force:true});
    });

    it('Should hide result buttons appear after making predictions', () => {
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
        cy.wait(2000);
        cy.contains('button', 'OK').click();
        cy.wait(2000);
        cy.get('.predict-btn').click({force:true});
        cy.wait(2000);
        cy.get('.resultbtn').should('be.visible');
    });

    it('Should not see the percentages after clicking on hide button', () => {
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
        cy.wait(2000);
        cy.contains('button', 'OK').click();
        cy.wait(2000);
        cy.get('.predict-btn').click({force:true});
        cy.wait(3000);
        cy.get('.resultbtn').should('be.visible');
        cy.wait(2000);
        cy.get('.resultbtn').first().click({force:true});
        cy.wait(2000);
        cy.contains('**').should('exist');
    });

})
