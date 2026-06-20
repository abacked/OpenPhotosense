# Contributing

Thank you for helping make media more accessible. Contributions of code, labeled test fixtures, documentation, design review, and accessibility expertise are welcome.

## Workflow

1. Open an issue for substantial behavior or methodology changes.
2. Fork the repository and create a focused branch.
3. Install the Python and frontend dependencies from the README.
4. Add tests for changed behavior and run all local checks.
5. Submit a pull request explaining the user impact, approach, and verification.

Keep modules small, type public interfaces, avoid logging video contents or user filenames, and preserve the report schema unless the change is explicitly versioned. Detector changes must document the rationale, fixtures used, and expected false-positive/false-negative tradeoff. Do not claim medical safety or WCAG certification.

Use `ruff format` for Python and the existing TypeScript/Tailwind conventions. Commits should be scoped and use imperative subjects.

## Reporting security issues

Do not open public issues for vulnerabilities involving uploads, file handling, or data exposure. Use the repository's private security advisory feature.

By contributing, you agree that your work is licensed under Apache-2.0 and affirm that you have the right to submit it.

