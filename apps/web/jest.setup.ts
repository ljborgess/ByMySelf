import '@testing-library/jest-dom';

/**
 * jsdom cannot navigate, so clicking a real anchor makes it log
 * "Not implemented: navigation". That is a jsdom limitation, not app
 * behaviour, and letting it through buries genuine console errors in noise.
 *
 * Only this one message is dropped -- anything else still surfaces, so a real
 * React warning or error is not silenced along with it.
 */
const originalConsoleError = console.error;

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const [first] = args;
    const message = first instanceof Error ? first.message : String(first);
    if (message.includes('Not implemented: navigation')) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});
