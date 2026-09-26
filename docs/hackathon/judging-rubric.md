# Judge Grading Rubric

Source: https://app.notion.com/p/coderabbit/Judge-Grading-Rubric-3e796e76cda181f7a8d7c2c8dc185c00
(fetched 2026-09-26, copied verbatim).

Each project is evaluated across five core dimensions. Judges score each category independently, then discuss the
overall ranking. No weights are given; the five dimensions appear to count equally.

## Overall judging principle

> We prioritize working systems over presentations, clarity over complexity, and real-world usefulness over novelty.
> The strongest projects feel like the first version of something real, not the last version of a demo.

## 1. Problem Relevance and Real-World Value

*What are you solving and for whom?*

We look for:
- A clearly articulated real problem, not a hypothetical one
- A defined user or customer, even if narrow
- Evidence that this problem actually exists today

High-scoring projects:
- Solve a recurring workflow or operational pain point
- Replace or significantly accelerate human effort
- Can explain value in one or two concrete sentences

Low-scoring projects:
- Abstract demos with no clear user
- Novelty apps without a reason to exist
- "It's cool" without a problem statement

## 2. Technical Execution and Engineering Quality

*Does the system actually work?*

We look for:
- Running software, not slides
- Clear system behavior end-to-end
- Thoughtful handling of inputs, outputs, and failure cases

High-scoring projects:
- Demonstrate live or recorded functionality
- Show meaningful logic beyond prompting
- Handle edge cases or constraints intentionally

Low-scoring projects:
- Static demos or mocked flows
- Hard-coded responses
- Heavy reliance on manual steps

## 3. Architecture and System Design

*Is this built like something that could evolve?*

We look for:
- Sensible component separation
- Appropriate use of tools, agents, retrieval, or orchestration
- Design decisions that match the problem scope

High-scoring projects:
- Can explain why the system is structured this way
- Use AI where it adds leverage, not everywhere
- Show awareness of latency, cost, or scaling tradeoffs

Low-scoring projects:
- Single monolithic script with no structure
- Overengineered pipelines with no justification
- Tool usage that feels forced or decorative

## 4. Production Readiness and Feasibility

*Could this realistically run beyond today?*

We look for:
- Reasonable assumptions about deployment and usage
- Awareness of limitations and next steps
- A path to reliability, even if incomplete

High-scoring projects:
- Could be deployed with incremental work
- Acknowledge what would need to change for production
- Show realistic scope decisions for a 3-hour sprint

Low-scoring projects:
- Depend on fragile hacks or unrealistic assumptions
- Ignore reliability, data quality, or security entirely
- Would collapse under real usage

## 5. Clarity of Vision and Continuation Potential

*Would you keep building this?*

We look for:
- A clear sense of what comes next
- Ownership and conviction from the team
- A believable future roadmap

High-scoring projects:
- Can articulate next features or improvements
- Feel like the start of a real product
- Show pride and intention, not just completion

Low-scoring projects:
- Built only to win a prize
- No sense of direction beyond the demo
- Hard to imagine anyone using it again

## Demo checklist (derived from the rubric, not part of it)

- [ ] One or two sentences: who the user is, what pain, how much human effort it removes
- [ ] Live, end-to-end run on real input, no mocked or hard-coded responses
- [ ] Show a failure or edge case being handled on purpose
- [ ] Explain the structure and why Jev sits where it does (and where it doesn't)
- [ ] Latency and cost numbers
- [ ] What would change for production: limitations, reliability, security
- [ ] What comes next: the roadmap
