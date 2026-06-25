# Scope: E2E Testing Track

## Architecture
- Comprehensive, requirement-driven, opaque-box E2E test suite.
- Mocks browser environment in Node or uses a lightweight browser runner (like Playwright/jsdom).
- Validates the key features (Omni-Search, Filtering, Autocomplete, Venn Comparison, Dictionary, Database Editor, BGG API Import).
- **Performance Benchmarking**: Measures and asserts search latency (<1ms with edit distance 2 on 4700+ games), vector autocomplete (<500μs), Venn comparison (<100μs), UI blocking (0ms / <8ms/frame), and worker heap memory (<10MB).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup Test Infra | Design test runner/harness, install dependencies (e.g. jsdom, jest, etc.), verify standard app loads | None | DONE |
| 2 | Tier 1-2 & Perf Tests | Write Feature Coverage, Boundary, and Latency/Memory performance benchmarks | M1 | DONE |
| 3 | Tier 3-4 & UI Frame Tests | Write Cross-Feature, Real-World, and UI frame rate blocking test cases | M2 | DONE |
| 4 | Verification & Handoff | Run full test suite against initial/integrated app, verify tests pass, write TEST_READY.md | M3 | DONE |
