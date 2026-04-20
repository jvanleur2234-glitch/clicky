---
name: subagent-dev
description: Execute implementation plans by dispatching fresh subagents per task with systematic two-stage review (spec compliance then code quality). Adapted from obra/superpowers for use with any multi-agent system.
compatibility: Created for Zo Computer
metadata:
  author: josephv.zo.computer
  source: Hermes Agent (NousResearch) / obra/superpowers
  license: MIT
---

# Subagent-Driven Development

## Core Principle
**Fresh subagent per task + two-stage review = high quality, fast agent iteration.**

## When to Use
- You have an implementation plan with independent tasks
- Quality and spec compliance are important
- You want automated review between tasks
- You want agents to work autonomously for extended periods

## The Process

### 1. Read and Parse Plan
Extract ALL tasks with full text upfront. Create a todo list.

### 2. Per-Task Workflow

**Step 1: Dispatch Implementer**
```python
delegate_task(
    goal="Implement Task 1: [specific task]",
    context="""TASK FROM PLAN: [full text]
    PROJECT CONTEXT: [tech stack, conventions]
    FOLLOW TDD: 1. Write failing test 2. Implement minimal code 3. Verify test passes 4. Commit""",
    toolsets=['terminal', 'file']
)
```

**Step 2: Spec Compliance Review** (after implementer completes)
- All requirements from spec implemented?
- File paths match spec?
- Nothing extra added (no scope creep)?

**If issues found → fix → re-review. Only continue when PASS.**

**Step 3: Code Quality Review** (after spec compliance)
- Follows project conventions?
- Proper error handling?
- No security issues?

**If issues found → fix → re-review. Only continue when APPROVED.**

**Step 4: Mark Complete**

### 3. Final Integration Review
After ALL tasks complete — verify everything works together, all tests pass.

## Task Granularity
**Each task = 2-5 minutes of focused work.**

Good: "Create User model with email and password fields"
Bad: "Implement user authentication system"

## Red Flags — Never Do These
- Start implementation without a plan
- Skip reviews (spec compliance OR code quality)
- Accept "close enough" on spec compliance
- Start quality review BEFORE spec compliance is PASS
- Move to next task while either review has open issues
- Let implementer self-review (separate reviewer needed)

## Integration with Other Skills
- **writing-plans** → creates the plan this skill executes
- **test-driven-development** → implementers follow TDD
- **systematic-debugging** → if bugs encountered during implementation

## Remember
```
Fresh subagent per task
Two-stage review every time
Spec compliance FIRST
Code quality SECOND
Never skip reviews
```

**Quality is not an accident. It's the result of systematic process.**
