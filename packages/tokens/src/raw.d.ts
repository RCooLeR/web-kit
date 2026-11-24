// Vite's `?raw` import, used by the tests to read Bootstrap's stylesheet as text.
declare module "*?raw" {
  const content: string;
  export default content;
}
