# Catalogue evidence and publication audit

Requirements: FR-CAT-002/003/004/005/006, FR-DATA-003/004/007, NFR-008.

`node tools/feeds/audit-catalog.mjs` validates the bundled **demonstration fixtures**. It does not authorize publishing real merchant content. `--require-real` additionally requires at least two real store records across different categories; this is a minimal demonstration check, not an agreed final store/SKU target.

```sh
node tools/feeds/audit-catalog.mjs --require-real --manifest /path/to/review.json --report /path/to/report.json
```

A failed gate exits 1. Successful syntax checks cannot authenticate permissions, product identity or current inventory. This offline tool does not fetch remote URLs. Real URL/image verification and authorized review remain required; no scraping or publication is performed.

## Review manifest

The top-level `stores` object is keyed by the exact feed-index store name. Each record contains:

| Field | Meaning |
|---|---|
| `approved_for_publication` | Explicit boolean approval from an authorized reviewer |
| `permission_reference` | Nonempty reference to the actual rights/source permission record; keep private agreements outside the public repository |
| `reviewed_at` | ISO timestamp with explicit timezone (e.g. `2026-10-24T08:00:00Z`), never a future date |
| `expires_at` | Optional ISO timestamp with timezone; when supplied, an empty, malformed or expired value blocks the gate |
| `category` | Nonempty category string for the reviewed store; objects/numbers do not qualify as categories |
| `allowed_source_hosts` | Exact reviewed merchant hostnames |
| `allowed_image_hosts` | Exact reviewed original-photo hostnames |

There are no real approval records in this branch. Do not fill these fields with fictional approvals to pass a check.

For each visible real product the gate requires a stable ID, title, safe source URL, original photo URL, a recorded catalogue check date and reviewed source/image hosts. Duplicate IDs and unsupported inventory claims fail. Unknown prices are allowed; invalid prices fail. Hidden products are excluded.

## Dates and prices

- Importer writes `imported_at` and `source_type: feed`. Import time is not `last_checked_at`.
- `last_checked_at` must come from an actual source/catalogue verification record. Missing or future dates remain unknown. No arbitrary freshness TTL is invented.
- Stock confirmation uses its separate source, scope, check time and expiry. Online stock never becomes a Tula physical-store claim.
- Empty, malformed, negative or nonfinite prices become null during import. Decimal prices retain cents. UI displays “Цена не указана”; only a known numeric zero renders “0 ₽”.
- Source photos are displayed preferentially when their explicit source URL exists; processed previews are labelled separately. A URL alone is not evidence of publication rights.

## Baseline, 24 October 2026

The bundled index contains **3 demonstration store catalogues and 125 demonstration products**. They are not connected real stores. Fixture audit passes; the real-pilot gate correctly fails with `real_multicategory_pilot_missing`. See [baseline report](review-2026-10-24/catalogue-real-gate.json).
