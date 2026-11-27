# RFB EVOLVE — 2026-11-26

## S001 — clinical storage readiness
- Baseline main `4863fc59fd9e03c1aea5c98d671bc52a3ad393a7`: CI success [#41248021315](https://github.com/CristianoRFB/Dentista/actions/runs/41248021315).
- Code `38ba46c14c598592789e65167da98f21f2673c7c`: [draft PR #4](https://github.com/CristianoRFB/Dentista/pull/4). Authenticated storage-dependent routes now return HTTP 503 / clinical_media_storage_not_configured when primary binding absent; no R2 or Firestore writes in this case. Health and OPTIONS unaffected, metadata-only routes and scheduling unchanged by diff.
- New negative regression test: eight routes, no token = 401, no-store, zero writes and no R2 calls. [CI #45899830791](https://github.com/CristianoRFB/Dentista/actions/runs/45899830791) in progress at inspection; test result pending. No hosted/browser QA or production change.
- Rollback: discard this draft branch before release, or revert the code commit after review if integrated; no data migration.

## Cloudflare inventory (read-only)
- Pages: dentista-saas.pages.dev, latest successful deployment a3922170-b0e9-42f1-ba40-0fa0f620ad93, 2026-10-13, commit 2beddc467f5e91a5b4a27ac271daa3e385666079. Not current main.
- Worker: odontoflow-clinical-media, deployment 24342e0a-70f0-4240-b790-174e7972df68, 2026-10-13. APP_ORIGIN matches Pages. Firebase identity binding names present; validity unverified. CLINICAL_MEDIA, CLINICAL_MEDIA_BACKUP, Turnstile and limiter bindings not observed. R2 list returned HTTP 403 / 10042: enable via dashboard. No bucket or secret created; no costs authorized.
- Clinical media remains PROTECTED_REGULATED under global media standard: no automatic 30+7 retention, deletion or change to clinical originals. Existing backup runbook remains mandatory. Account roles and tenant isolation unchanged; hosted Firebase provisioning not verified.

## Next gate
CI current head; staging with synthetic tenants, Firebase Auth/Rules, R2 private primary and independent backup, Turnstile/rate limiter where appropriate; check cost and operator approval before enablement. Test upload/read/hash/restore and tenant isolation. Browser QA/screenshots NOT_RUN. Historical 95.5% internal / ~67% general estimate (docs/PRE_PC_COMPLETENESS.md) not recalculated from this patch. No claim of production readiness.

## S002 — EVOLVE 02 / Firebase ID token hardening
- S001 final CI confirmed SUCCESS on `cb2eb1419bfca192f0e6c953a07e084f8c7e1c68`: [#45899913225](https://github.com/CristianoRFB/Dentista/actions/runs/45899913225) and [#45899906090](https://github.com/CristianoRFB/Dentista/actions/runs/45899906090).
- Baseline verified against [Firebase official ID token verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens). Existing jose verifier checked issuer, audience and signature but did not require exp/iat/auth_time or explicitly restrict alg and kid.
- Code `b00ce2069eef677a45439b25c4910973d5b5bf07`: RS256 allowlist, nonempty kid, exact single project audience, nonblank UID <=128, mandatory integer exp/iat/auth_time, temporal ordering and expiration. Existing issuer and trusted JWKS signature validation preserved. No RBAC/Rules relaxation or auth bypass.
- Tests signed locally with generated synthetic keys cover valid token, missing claims, future/invalid timestamps, expired token, audience array, bad UID, missing kid and PS256 rejection. Existing invalid issuer/signature cases preserved and fixtures updated to contain auth_time. New CI [#45911109949](https://github.com/CristianoRFB/Dentista/actions/runs/45911109949) pending at inspection; no hosted authentication test executed. Token revocation/disabled user checking beyond JWT and current membership checks remains a separate requirement, not claimed here.
- Cloudflare rechecked: same Pages deployment, same Worker binding names; R2 API still 403 / 10042. Hosted Firebase credentials and account provisioning not verified. No secrets disclosed, no new charge, no production deployment. No actual account promoted/created. QA browser NOT_RUN.
- Protocols: GitHub Governance, AntiVibeCoding AV-01/02/03/04/05, Anti-Loop, checkpoint, stack/cost and Security. Rollback: revert S002 code commit on work branch if CI fails. No data migration. Historical percentages unchanged pending release evidence.

## S003 — EVOLVE 03 / clinical restore manifest integrity
- S002 final CI SUCCESS: [#45911153148](https://github.com/CristianoRFB/Dentista/actions/runs/45911153148), [#45911148709](https://github.com/CristianoRFB/Dentista/actions/runs/45911148709), head `36cd60fa1a7716b6d635ff1f96c7a28413a6cf79`.
- Code `2751b415c91be21de4ed50713755ac81481f9150`: restore now requires a verified sha256_readback manifest, integer positive bounded byte count, exact tenant/patient/photo/object/digest scope, actual byte count matching manifest and revalidation inside Firestore transaction before audit and conditional PUT. Existing SHA-256 readback, no-overwrite and no-delete protections preserved.
- Regression cases: missing/invalid verification, missing/invalid byte count, patient mismatch, actual count mismatch; all must deny before writes. Synthetic fixtures include canonical manifest fields. CI https://github.com/CristianoRFB/Dentista/actions/runs/45912457720 pending at checkpoint; hosted restore NOT_RUN.
- No storage creation, production deploy, deletion, retention policy changes or billing. R2 activation/independent private buckets, operational backup and restore exercise remain external gates. Historical percentages not revised.

## S004 — patient search and demo day navigation
- S003 final CI PASS on bdd33296b2dc0a3f3abc2ff33dbe50706e8514f5: https://github.com/CristianoRFB/Dentista/actions/runs/45912483269 and https://github.com/CristianoRFB/Dentista/actions/runs/45912478514.
- Canonical RFB Method main pinned at 5f73ee2b48507234431706e4c6313773bae72a5a; AGENTS/BOOTSTRAP/catalog/README entry order and conditional receipts in COMPLIANCE-PREFLIGHT.json. Structural CLI NOT_RUN.
- Code 0307d95dde3ee2c16e1d7d93e920bc29ff2f0d36: formatted/unformatted phone matching while preserving active/inactive filter; demo agenda uses half-open day window like hosted startsAt query. Unit cases: status, invalid search, midnight boundaries and invalid dates. Chromium tests: next day empty, today restores, phone search. No change to real Firestore writes or transaction semantics. CI [{"name":"OdontoFlow CI","url":"https://github.com/CristianoRFB/Dentista/actions/runs/45927639165","status":"pending","result":null}]. No visual pixel review or hosted verification claimed.
