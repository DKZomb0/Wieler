import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login prompt', () => {
  render(<App />);
  expect(screen.getByText(/wieler uitslagenlog/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});
