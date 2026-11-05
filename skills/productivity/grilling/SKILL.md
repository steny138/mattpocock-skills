---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Grow the tree only inside the scope the user has set, and give every branch its **provenance**: a verified fact (an incident, the code, a protocol), a goal or constraint the user stated, or your own proposal, labelled as yours. A proposal the user accepts becomes an agreed decision or requirement and keeps its agent-proposal label. A goal the user has not stated (a deadline, an SLA) is a fair **discovery** question: ask it open, with no recommended answer. A failure that has not happened is a **risk**, not a branch, until an agreed goal cannot be met without handling it or the user takes it into scope; collect risks and list them once, for the user to take on or leave. Recommend the smallest answer that meets the agreed goals, and name the cost of any recommendation that adds scope.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer (a discovery question gets `➡️ open: no default`). Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch with provenance visited, every risk listed, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
