import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

test('renders welcome page initially', () => {
  render(
    <Router>
      <App />
    </Router>
  );
  const linkElement = screen.getByText(/please sign in or sign up to continue/i);
  expect(linkElement).toBeInTheDocument();
});
