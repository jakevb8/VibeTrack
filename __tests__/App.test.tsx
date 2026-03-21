/**
 * @format
 * Smoke test: verify App module exports a default function component.
 */
import 'react-native';
import App from '../App';

it('App exports a React component', () => {
  expect(typeof App).toBe('function');
});
