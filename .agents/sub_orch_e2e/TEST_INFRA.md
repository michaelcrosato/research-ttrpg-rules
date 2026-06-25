# E2E Test Infra: OmniRuleset Engine

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design details, only on explicit interface contracts, message schemas, and DOM elements.
- Methodology: Category-Partition (testing representative inputs for features), Boundary Value Analysis (BVA for numeric and state boundaries), Pairwise Combinatorial Testing (cross-feature interactions), and Real-World Workload Testing (scenarios).

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross) |
|---|---------|----------------------|:----------------:|:-----------------:|:--------------:|
| 1 | Dynamic Rules Synthesis Sandbox (F1) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | AI-Driven Playtest Sandbox & GM Automation (F2) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 3 | Structural Conflict Analysis Module (F3) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 4 | UI Integration Tab and Layout (F4) | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 5 | Worker Messaging Protocol (F5) | PROJECT.md Architecture | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Jest with JSDOM environment, run via `npx jest --runInBand`.
- **Pass/Fail Semantics**: All tests must compile, run, and successfully verify assertions (exit code 0).
- **Test Case Format**: Each test case sets up DOM nodes, mocks fetch/worker interfaces, triggers target events, and asserts UI status or state transitions.
- **Directory Layout**:
  - `tests/omniruleset.test.js`: Core E2E test suite covering Tiers 1-4.
  - `tests/setup.js`: Global configuration and JSDOM mocks.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | End-to-End Synthesis to Playtest Loop | F1, F2, F3, F4, F5 | High |
| 2 | Conflict Detection and Resolve Override Workflow | F1, F3, F4, F5 | High |
| 3 | GM Combat Playtest Session with Multiple Dice Rolls | F2, F4 | Medium |
| 4 | Character progression and State Sheet Updates | F2, F4 | Medium |
| 5 | Multi-Game Complex Synthesis Sandbox | F1, F3, F5 | High |

## Coverage Thresholds
- **Tier 1**: ≥5 per feature (25 total)
- **Tier 2**: ≥5 per feature (25 total)
- **Tier 3**: Pairwise coverage of major feature interactions (≥5 total)
- **Tier 4**: ≥5 realistic application scenarios (5 total)
- **Total Minimum**: 60 test cases
