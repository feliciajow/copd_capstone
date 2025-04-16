describe('Login Page', () => {
    it('Able to load the login page', () => {
      //load sign up page
      cy.visit('http://localhost:3000/')
    })

    it('No email should be displayed in the navbar if not login', () => {
      //load sign up page
      cy.visit('http://localhost:3000/')
      cy.get('.email-display').should('not.exist');
    })

    it('Should display the Login section section', () => {
      cy.visit('http://localhost:3000/')
      cy.get('h1').should('contain', 'Welcome Back');
      //button for refreshing of page
      cy.get('button').first().click();
    });

    it('Should display validation messages for empty fields', () => {
      cy.visit('http://localhost:3000/')
      // submit the form without filling in any fields
      cy.get('button[type="submit"]').click();
      // validation messages
      cy.contains('Please input your email!').should('be.visible');
      cy.contains('Please input your password!').should('be.visible');
    });

    it('Should not be able to login if account used to login have not been registered before', () => {
        //navigate to sign up page
        cy.visit('http://localhost:3000/')
        //input details into the login form
        cy.get('input[name="email"]').type('abcd@gmail.com') 
        cy.get('input[name="password"]').type('abcd1234')
        //submit form
        cy.get('button[type="submit"]').click();
        //go back to login page if unsuccessful login
        cy.url().should('eq', 'http://localhost:3000/');
        cy.contains('Account not found').should('be.visible')
    })
  
    it('Able to login to an account after registering', () => {
      //navigate to sign up page
      cy.visit('http://localhost:3000/')
      //input details into the login form
      cy.get('input[name="email"]').type('judy234@gmail.com') 
      cy.get('input[name="password"]').type('judy2345')
      //submit form
      cy.get('button[type="submit"]').click();
      //go to dashboard page if successful login
      cy.url().should('eq', 'http://localhost:3000/dashboard');
    })
 
})
