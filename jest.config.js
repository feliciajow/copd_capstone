module.exports = {

     transform: {
 
       '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
 
     },
     moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx'],
     setupFilesAfterEnv: ['@testing-library/jest-dom'],
     testEnvironment: 'jsdom',
};