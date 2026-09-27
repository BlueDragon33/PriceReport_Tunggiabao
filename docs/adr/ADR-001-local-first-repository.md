# ADR-001: Local-first repository boundary

Status: Accepted — V6.19

New persistence logic goes through a repository boundary instead of spreading direct localStorage access. Existing keys remain unchanged. This gives verified writes, error semantics, testability and an IndexedDB seam.
