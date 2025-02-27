import Login from '../src/pages/login';
import { useNavigate } from 'react-router-dom';

describe('login.cy.js', () => {
  it('Rendering of login Page', () => {
    cy.viewport(1200, 1000);
    cy.mount(<Login />);
  })
})