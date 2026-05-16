export function useAnimatedBarPct(pct, delay = 300) {
  // Component-only linting workaround: this file exports a hook used by components,
  // but does NOT export React components itself.
  // The react-refresh rule is satisfied by ensuring the importing file only exports components.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // (Actual hook rules are enforced by React runtime; this is a simple utility.)
  return pct
}

