# Production Release Authority

Production authority is separate from constitutional compliance.

A commit is eligible for production only when all of the following are true:

1. Universal Constitution adoption remains enforced with no disabled pillars or waivers.
2. Canonical production verification passes on the exact code being released.
3. Runtime dependency audit passes at high severity.
4. Full test suite passes, including domain, storage, migration, backup, import/export, DOM and smoke gates.
5. Production build succeeds.
6. Chromium browser regression succeeds.
7. The generated artifact contains the application shell, manifest and service worker.
8. Deployment is performed only from `main` after verification.

The Production Release Gate never treats Constitution PASS alone as release approval.

## Authority chain

```
Universal Constitution
        ↓
Pull Request quality gates
        ↓
main
        ↓
Production Release Gate
        ↓
verified dist artifact
        ↓
GitHub Pages deployment
```

If verification fails, deployment is skipped. A failed deployment is not reported as production success.
