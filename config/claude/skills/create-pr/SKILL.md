---
name: create-pr
description: Create a verified pull request with explicit human confirmation and visual evidence when relevant.
---

# Create a pull request

1. Confirm the branch is not the default branch and the working tree is understood.
2. Review the complete base-to-head diff and recent commits.
3. Run all required tests and record exact results.
4. Push only the current working branch after verifying target and rollback evidence.
5. Write a factual title and body with summary, tests, risks, and rollback notes.
6. For visual changes, include before/after images or explain why no rendered surface changes.
7. Run `gh pr create` once after the publication contract is satisfied.

Never fabricate results, reviewers, issue links, or screenshots.
