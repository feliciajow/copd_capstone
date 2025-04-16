it('Should load the Models Page successfully', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    cy.visit('http://localhost:3000/models');
    cy.get('h1').should('contain', 'Models History');
})

it('Should display the models table with data', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    cy.visit('http://localhost:3000/models');
    cy.get('table').should('exist'); // Verify the table exists
    cy.get('table').contains('Model ID').should('be.visible');
    cy.get('table').contains('C Index').should('be.visible');
    cy.get('table').contains('Created At').should('be.visible');
});

it('Should allow sorting by C Index', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    cy.visit('http://localhost:3000/models');
    cy.get('table').contains('C Index').click();  
});

it('Should allow sorting by Created At', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    cy.visit('http://localhost:3000/models');
    cy.get('table').contains('Created At').click();
    cy.get('table').find('tr').eq(1).should('exist');
});

it('Should allow pagination', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    cy.visit('http://localhost:3000/models');
    cy.get('.ant-pagination').should('exist');
    cy.get('table').find('tr').should('exist');
});

it('Should go back to retrain page when train new model clicked', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    cy.visit('http://localhost:3000/models');
    cy.get('.ant-pagination').should('exist');
    cy.get('table').find('tr').should('exist');
    cy.contains('+ Train New Model').click();
    cy.wait(2000);
    cy.get('h1').should('contain', 'Upload File');
});

it('Should display the models table when clicked on refresh button', () => {
    cy.visit('http://localhost:3000/');
    cy.get('input[name="email"]').type('judy234@gmail.com');
    cy.get('input[name="password"]').type('judy2345');
    cy.get('button[type="submit"]').click();
    cy.wait(2000);
    cy.visit('http://localhost:3000/models');
    cy.get('table').should('exist'); 
    cy.contains('Refresh').click();
});
