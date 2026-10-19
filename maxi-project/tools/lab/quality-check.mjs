// The acceptance command must not silently run in report-only mode.
process.env.QA_STRICT='1';
await import('./family-review.mjs');
