import 'cypress-file-upload';

describe('Retrain file Page', () => {
  it('Able to load the retrain file page', () => {
    //load retrain page
    cy.visit('http://localhost:3000/retrain')
  })
  
  it('Able to view contents of the retrain file page', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    // Navigate to retrain page
    cy.visit('http://localhost:3000/retrain');
    //load retrain page
    cy.get('h1').should('contain', 'Upload File');
  })

  it('Should be able to interact with the model form', () => {
    cy.visit('http://localhost:3000/');
    // Log in as a user
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    // Navigate to retrain page
    cy.visit('http://localhost:3000/retrain');

    // Enter model name and upload a valid file
    cy.get('input[placeholder="Enter model name"]').type('TestModel');
    cy.get('.ant-select').click();
    cy.get('.ant-select-item-option').contains('J44 (COPD)').click();
    cy.get('.ant-select').should('contain', 'J44 (COPD)');
  });

  it('Should hide the upload section for guest users', () => {
    //navigate to retrain page
    cy.visit('http://localhost:3000/retrain')
    cy.contains('You have to login to your account to train your file.').should('be.visible')
    cy.get('input[type="file"]').should('not.exist');
    cy.get('button').contains('Upload File').should('not.exist');
  })

  it('Should upload a valid file successfully', () => {
    cy.visit('http://localhost:3000/');
    // Log in as a user
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    // Navigate to retrain page
    cy.visit('http://localhost:3000/retrain');
    // Enter model name and upload a valid file
    cy.get('input[placeholder="Enter model name"]').type('TestModel');
    cy.get('.ant-select').click();
    cy.get('.ant-select-item-option').contains('J44 (COPD)').click();
    cy.get('.ant-select').should('contain', 'J44 (COPD)');
    cy.get('input[type="file"]').attachFile('training_file.xlsx');
    cy.get('.btns').click();
    cy.wait(3000);
    cy.get('table').should('exist');
  });

  it('Should successfully train a model after file upload', () => {
    cy.visit('http://localhost:3000/');
    // Log in as a user
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    // Navigate to retrain page
    cy.visit('http://localhost:3000/retrain');
    // Enter model name and upload a valid file
    cy.get('input[placeholder="Enter model name"]').type('TestModel');
    cy.get('.ant-select').click();
    cy.get('.ant-select-item-option').contains('J44 (COPD)').click();
    cy.get('.ant-select').should('contain', 'J44 (COPD)');
    cy.get('input[type="file"]').attachFile('training_file.xlsx');
    cy.get('.btns').click();
    cy.wait(3000);
    cy.get('table').should('exist');
    cy.contains('button', 'Proceed').click();
    cy.contains('Please wait patiently and do not leave this page...').should('be.visible');
  });

  it('Should raise an error if upload a wrong file type', () => {
    cy.visit('http://localhost:3000/');
    // Log in as a user
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    // Navigate to retrain page
    cy.visit('http://localhost:3000/retrain');
    // Enter model name and upload a valid file
    cy.get('input[placeholder="Enter model name"]').type('TestModel');
    cy.get('.ant-select').click();
    cy.get('.ant-select-item-option').contains('J44 (COPD)').click();
    cy.get('.ant-select').should('contain', 'J44 (COPD)');
    cy.get('input[type="file"]').attachFile('breathai.png');
    cy.contains('breathai.png is not an xlsx, xls, or csv file').should('be.visible');
  });

});
