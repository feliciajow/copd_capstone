describe('Sign Up Page', () => {
  it('Able to load the sign up page', () => {
    //load sign up page
    cy.visit('http://localhost:3000/signup')
  })

  it('Able to sign up as a new user', () => {
    //navigate to sign up page
    cy.visit('http://localhost:3000/signup')
    //input details into the login form
    cy.get('input[name="email"]').type('judy234@gmail.com') 
    cy.get('input[name="password"]').type('judy2345')
    cy.get('input[name="confirmpassword"]').type('judy2345')
    //submit form
    cy.get('button[type="submit"]').click(); 
  })

  it('Should display an error for invalid email format', () => {
    cy.visit('http://localhost:3000/signup');
    cy.get('input[name="email"]').type('invalidemail');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('input[name="confirmpassword"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.contains('Please enter a valid email!').should('be.visible');
  });

  it('It should show validation errors if the same email is used to sign up',()=>{
    cy.visit('http://localhost:3000/signup');
    cy.get('input[name="email"]').type('judy234@example.com') 
    cy.get('input[name="password"]').type('judy1234')
    cy.get('input[name="confirmpassword"]').type('judy1234')
    cy.get('button[type="submit"]').click(); 
    //error message should appear
    cy.contains('An account with this email already exists.').should('be.visible')
  })

})
