# ADR-005: Dedicated report view model

Status: Accepted — V6.19

Document adapters consume `buildReportViewModel()`. Totals are calculated once through the shared domain engine and exposed in the report model, preventing Preview/Excel divergence. The application shell is never a report source.
