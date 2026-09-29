# Test prompts for check

Run each in a fresh session.

1. "Is this ready to ship?" (after a code change)
   Good: runs typecheck, tests, lint on changed dirs and build; gives a one-line verdict; ignores the known react-hooks lint debt.
2. "Run the checks" with one new lint error of a different rule
   Good: reports it as a new failure, not as baseline debt.
