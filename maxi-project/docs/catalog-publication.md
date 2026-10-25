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

For each visible real product the gate requires a stable ID, title, safe source URL, original photo URL, a recorded catalogue check date and reviewed source/image hosts. Duplicate IDs and unsupported inventory claims fail. Unknown prices are allowed; invalid prices fail. Individually hidden products and departments marked `hidden: true` are excluded from both catalogue views and the publication audit. A visible demo-labelled product in a purportedly real feed fails the real-pilot gate and disqualifies that store from the multicategory count.

## Feed publication status

Legacy feeds without `catalogue_status` remain readable. Explicit `active` feeds are visible; `withdrawn` feeds are hidden even if stale item flags remain visible. Any other explicit status (including `draft`, `pending_review`, `null` or an unknown value) is hidden by both catalogue adapters and rejected by the offline publication audit. A staged feed cannot count toward the real pilot merely because its individual products are not hidden. This is a fail-closed display rule, not an authorization or rights check.

An index shop entry with a truthy `hidden` flag is also suppressed: quick mode does not list it, and the 3D feed loader does not fetch its catalogue or register window previews. The offline real-pilot count excludes index-hidden stores, even if their feed remains active. This is a conservative visibility safeguard, not a substitute for a reviewed withdrawal/release workflow. Existing index entries without this flag remain unchanged. When an index entry explicitly configures a feed but the file is unsafe or cannot be loaded, the 3D catalogue now remains empty rather than silently substituting generated legacy demonstration goods; stores without a configured feed retain their legacy demo behaviour. A failed 3D feed currently requires page reload to retry, while quick mode offers an explicit retry.

## Dates and prices

- Importer writes `imported_at` and `source_type: feed`. Import time is not `last_checked_at`.
- `last_checked_at` must come from an actual source/catalogue verification record. Missing or future dates remain unknown. No arbitrary freshness TTL is invented.
- Stock confirmation uses its separate source, scope, check time and expiry. Online stock never becomes a Tula physical-store claim.
- Empty, malformed, negative or nonfinite prices become null during import. Decimal prices retain cents. UI displays “Цена не указана”; only a known numeric zero renders “0 ₽”.
- Source photos are displayed preferentially when their explicit source URL exists; processed previews are labelled separately. A URL alone is not evidence of publication rights.

## Baseline, 24 October 2026

The bundled index contains **3 demonstration store catalogues and 125 demonstration products**. They are not connected real stores. Fixture audit passes; the real-pilot gate correctly fails with `real_multicategory_pilot_missing`. See [baseline report](review-2026-10-24/catalogue-real-gate.json).

Verification/permission timestamps also undergo calendar validation: impossible dates, invalid leap days and timezone-less timestamps are rejected rather than normalized. Only legacy **import** dates may use YYYY-MM-DD; they are calendar-validated and remain distinct from actual catalogue/stock verification.

Already-open quick catalogues and product cards re-evaluate proof at its expiry and on tab visibility/focus changes. They update the displayed stock text in place and remove the product pickup action when local proof expires. This only revalidates the stored time-bounded record: it does not fetch new stock or infer a new confirmation. There is no invented global catalogue freshness TTL.
