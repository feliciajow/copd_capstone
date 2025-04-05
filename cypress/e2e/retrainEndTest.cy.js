describe('Retrain file Page', () => {
  it('Able to load the retrain file page', () => {
    //load retrain page
    cy.visit('http://localhost:3000/retrain')
  })
  it('Should not view upload section if account not login', () => {
    //navigate to retrain page
    cy.visit('http://localhost:3000/retrain')
    cy.contains('You have to login to your account to train your file.').should('be.visible')
    cy.get('input[type="file"]').should('not.exist');
    cy.get('button').contains('Upload File').should('not.exist');
  })

  it('Should be able to view upload section if account is login', () => {
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
  })
})