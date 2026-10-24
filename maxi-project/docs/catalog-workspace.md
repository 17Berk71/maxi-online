# Local catalogue review, revisions and withdrawal

Requirements: FR-DATA-002/003/004/005, FR-CAT-004/006, NFR-006/008. This CLI operates only on explicitly selected **local directories**. It has no upload/deploy function. Do not point it at a mounted live site or use it to publish private photos. No active project feeds have been changed as part of its tests.

## Prepare and inspect

Complete the importer into a separate review directory using `--out`; do not have the importer write into an active catalogue. Then prepare a new, previously nonexistent candidate directory:

```sh
node tools/feeds/catalog-workspace.mjs prepare --source /tmp/import-output --candidate /tmp/review-001
node tools/feeds/catalog-workspace.mjs diff --current /tmp/local-preview --candidate /tmp/review-001
node tools/feeds/catalog-workspace.mjs inspect --target /tmp/local-preview
```

Omit `--current` for the first preview. `prepare` returns a candidate fingerprint and an audit report; an invalid report exits 1 but keeps the candidate for inspection. Preparation does not modify the source or active directory. Existing candidate directories are never overwritten. Reports include product additions/removals/changes, hide/restore changes and changed local media.

Real catalogues require the reviewed metadata described in [catalog-publication.md](catalog-publication.md). Supply `--manifest /private/review.json` during both preparation **and activation**. The manifest is not copied into the candidate, revision or public assets. Audits are recomputed at activation/rollback time; editing a stored report cannot grant approval. `--require-real` adds the multicategory pilot gate; it is a readiness check rather than a requirement for taking products out of view.

## Local activation

```sh
node tools/feeds/catalog-workspace.mjs activate --candidate /tmp/review-001 --target /tmp/local-preview --revision REVIEWED_CANDIDATE_FINGERPRINT --expected CURRENT_INDEX_SHA256
```

Use the printed fingerprint and active-index hash literally. For a directory with no index, `--expected missing` is required. These are separate identifiers:

| Identifier | Purpose |
|---|---|
| Candidate fingerprint / revision | Identifies the exact reviewed content and assets |
| Active index SHA-256 | Refuses activation if the current index changed since inspection |

The tool writes a complete immutable `releases/<fingerprint>/` directory, checks all references, then replaces only the active `index.json` by a same-filesystem rename. Existing files and releases remain available for rollback. Local browser clients must reload to read the new index; open 3D sessions are not live inventory subscriptions.

All writers using this tool cooperate through `.catalog-lock`. A conflicting writer or a stale expected hash stops the update. A crashed process may leave a lock directory; investigate the process and interrupted operation before removing that exact lock. The guard does not claim to coordinate arbitrary external tools editing files directly. Atomic pointer replacement is tested against process/filesystem errors; hardware power-loss durability is not certified.

## Bulk withdrawal

Pass a JSON hide list during preparation:

```json
{"Synthetic store": ["product-1", "product-2"], "Another synthetic store": "*"}
```

```sh
node tools/feeds/catalog-workspace.mjs prepare --source /tmp/local-preview --candidate /tmp/review-withdrawal --hide /tmp/hide-list.json
```

Unknown store/product IDs are errors. `"*"` withdraws every product in that store. A completely withdrawn store is explicitly marked `catalogue_status: "withdrawn"`; neither the 3D nor quick catalogue fills it with legacy demo products. Window previews are conservatively removed after any product withdrawal because old window records do not contain product IDs. Withdrawn stores cannot satisfy the real-pilot minimum store/category gate.

This is catalogue visibility control, not access control, legal content erasure or deletion of historical assets. Existing saved looks are browser-local snapshots and disclose that products/photos may have changed. Do not use hiding as a substitute for image permission or privacy controls.

## Rollback

```sh
node tools/feeds/catalog-workspace.mjs rollback --target /tmp/local-preview --revision PREVIOUS_REVISION --expected CURRENT_INDEX_SHA256
```

Activation returns the previous revision. Before rollback, the tool verifies stored file hashes, the full content fingerprint and current audit metadata. Modified/corrupt revisions, unsafe paths, symlink assets, conflicting locks and stale index hashes are rejected. A legacy active catalogue is snapshotted before the first activation, so it can also be restored without replacing its original files. No automatic garbage collection deletes retained revisions.

## Evidence

Node filesystem tests use temporary synthetic catalogues and cover preparation, repeat activation, changed assets, withdrawal, legacy rollback, stale hashes, candidate tampering, invalid rights records, symlinks, corrupted revisions and interrupted revision creation. Browser tests load the generated revision with its real versioned paths, withdraw the item and restore it at 390px/1280px. Separate actual-mall tests verify all-hidden shops stay empty and index-level demo flags propagate into product links.
