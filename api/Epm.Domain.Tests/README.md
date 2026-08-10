# Epm.Domain.Tests

One file per rule, named after the rule's file in `api/Epm.Api/Domain/`.

## The one rule about these tests

**They never read the database.** Every input is an inline literal copied from
`docs/spec/02-BUSINESS-RULES.md` or `03-CHANGE-ORDER-PROCESS.md`, with the spec
section quoted in the test name or a comment.

That is P-04, and the reason is worth restating: if a figure in `Fixture.cs`
turns out to be wrong, **no test starts lying**. The specification is the
oracle, not the demo data. A test that asserted against a fixture row would go
green for a wrong reason the moment someone "fixed" the fixture to match a bug.

## What a test file must contain

- The worked example from the spec, asserted exactly, with the section reference.
- The edge cases the spec calls out (empty contract, zero total, milestones).
- A property test wherever there is rounding or distribution.

## Running

```bash
cd api && dotnet test
```

The API locks its own exe while running — stop it first, or the build fails on
the copy step rather than on anything you wrote.
