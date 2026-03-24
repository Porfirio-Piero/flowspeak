# PRD: FlowSpeak - Natural Language Task Builder

## Problem Statement
Users want to describe tasks in plain English and see them visualized.

**Solution:** FlowSpeak - type what you want to do, see a visual plan, click to run.

---

## Build Estimate: 3 hours

---

## Target Users
- Small business owners
- Non-technical founders
- Operations managers

---

## MVP Scope

### Feature 1: Natural Language Input
- Text area for describing a task
- AI parses description into steps
- Confidence score shown to user

### Feature 2: Visual Step Display
- Show parsed steps as connected boxes
- Clear input → action → output flow
- Editable step descriptions

### Feature 3: Run Preview
- Button to preview execution
- Display what would happen
- Status indicator for each step

---

## Implementation

### Frontend
- Next.js 14 App Router
- React Flow for visualization
- Tailwind CSS styling
- Browser storage for data

### AI Integration
- OpenAI GPT-4 for parsing
- Structured JSON output
- Confidence scoring

---

## Success Criteria
1. User types a task description
2. System shows steps visually
3. User can edit and preview
4. Build completes in under 8 hours

---

## Build Breakdown

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup | 0.5h | Next.js project |
| Parser | 1h | OpenAI integration |
| Visuals | 1h | React Flow display |
| Polish | 0.5h | Styling, preview |

**Total: 3 hours**

---

## Acceptance Criteria
- [ ] Natural language input works
- [ ] Steps display visually
- [ ] Preview mode works
- [ ] Deployable to Vercel
- [ ] Build time ≤ 8 hours