describe('Retrain file Page', () => {
  it('Able to load the retrain file page', () => {
    //load retrain page
    cy.visit('http://localhost:3000/retrain')
  })
  
  it('Should hide the upload section for guest users', () => {
    //navigate to retrain page
    cy.visit('http://localhost:3000/retrain')
    cy.contains('You have to login to your account to train your file.').should('be.visible')
    cy.get('input[type="file"]').should('not.exist');
    cy.get('button').contains('Upload File').should('not.exist');
  })

  it('Should display the upload section for login users', () => {
    //navigate to sign up page
    cy.visit('http://localhost:3000/signup')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com') 
    cy.get('input[name="password"]').type('judy2345')
    cy.get('input[name="confirmpassword"]').type('judy2345')
    cy.get('button[type="submit"]').click(); 
    cy.visit('http://localhost:3000/')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com')
    cy.get('input[name="password"]').type('judy2345')
    //submit form
    cy.get('button[type="submit"]').click();
    //load retrain page
    cy.visit('http://localhost:3000/retrain')
    cy.get('input[type="file"]').should('not.exist');
    cy.get('button').contains('Upload File').should('not.exist');
  });

  it('Should successfully train a model after file upload', () => {
    //navigate to sign up page
    cy.visit('http://localhost:3000/signup')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com') 
    cy.get('input[name="password"]').type('judy2345')
    cy.get('input[name="confirmpassword"]').type('judy2345')
    cy.get('button[type="submit"]').click(); 
    cy.visit('http://localhost:3000/')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com')
    cy.get('input[name="password"]').type('judy2345')
    //submit form
    cy.get('button[type="submit"]').click();
    //load retrain page
    cy.visit('http://localhost:3000/retrain')
  });

  it('Should go back to preview page if training of model failed', () => {
    //navigate to sign up page
    cy.visit('http://localhost:3000/signup')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com') 
    cy.get('input[name="password"]').type('judy2345')
    cy.get('input[name="confirmpassword"]').type('judy2345')
    cy.get('button[type="submit"]').click(); 
    cy.visit('http://localhost:3000/')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com')
    cy.get('input[name="password"]').type('judy2345')
    //submit form
    cy.get('button[type="submit"]').click();
    //load retrain page
    cy.visit('http://localhost:3000/retrain')
  });

  it('Should be able to view models after successful upload', () => {
    //navigate to sign up page
    cy.visit('http://localhost:3000/signup')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com') 
    cy.get('input[name="password"]').type('judy2345')
    cy.get('input[name="confirmpassword"]').type('judy2345')
    cy.get('button[type="submit"]').click(); 
    cy.visit('http://localhost:3000/')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com')
    cy.get('input[name="password"]').type('judy2345')
    //submit form
    cy.get('button[type="submit"]').click();
    //load retrain page
    cy.visit('http://localhost:3000/retrain')
  });
});