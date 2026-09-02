// Stands in for a `*.module.css` import under Jest, which (unlike Vite) has
// no CSS loader of its own. Returns the class name itself for any property
// accessed, so `styles.badge` reads as `'badge'` in a test instead of
// crashing on an unparsed CSS file.
export default new Proxy(
  {},
  {
    get: (_target, prop) => prop,
  },
);
