---
layout: post
title: "The Treatment Plan Is a Matrix, Not a Workflow"
date: 2026-05-04
summary: "Cleft care lasts twenty years and crosses seven specialties. Modeling it as a sequence of steps was wrong. This is what a matrix model looks like, and how the doctors initially refused to believe it."
tags: [diary, design, healthcare, schema]
---

> Series: Building a non-profit health information system for a craniofacial care center. This is entry two. The first one was about [drawing the whole system in ASCII before touching Figma](/2026/05/03/i-drew-the-whole-hospital-system-in-ascii/).

## What I built first, and why it was wrong

When the doctors first described the treatment to me, they walked me through it in chronological order. "Before the baby is born, we do this. At two weeks, we do that. At three months, we do the lip surgery. At nine months, we do the palate." So I built what they described. A wizard. Step one, step two, step three. The patient record had a `current_stage` field with an enum of fifteen values.

It was a beautiful little state machine. It was also completely wrong.

## The conversation that killed it

Two weeks in, I sat with a plastic surgeon and an orthodontist at the same table. I showed them the wizard. The surgeon said "great, this is exactly the lip and palate flow." The orthodontist said "where do I do my work?" I said "click step seven, age five, dental review." She said "that step happens at the same time as step nine, hearing screening, which the ENT does, and step eleven, which is speech therapy, which I don't do at all." She was not arguing. She was telling me a fact about her job that I had been refusing to hear.

The treatment is not a sequence. It is multiple sequences happening in parallel, owned by different specialists, all anchored to the same patient and the same age clock.

## What the model actually looks like

Imagine a spreadsheet. Rows are specialties. Columns are age bands. Each cell holds zero or more procedures.

```
                  Prenatal  0-2wk   2-6mo   6-18mo  18-36mo  3-5y    5-12y   12-17y  18+
  ---------------+---------+-------+-------+-------+--------+-------+-------+-------+-----
  Plastic surg   |         |       |  lip  | palate|        | revis |       | revis |
  Orthodontics   |         |  NAM  |  NAM  |       |        |       | brace | brace |
  ENT            |         | hear  |       | tubes |  tubes | tubes | tubes | check | check
  Speech         |         |       |       |       |  eval  | thera | thera | check |
  Dentistry      |         |       |       |       |        | check | restor| ortho |
  Genetics       | counsel |       |       |       |        |       |       |       |
  Psychosocial   |         |       |       |       |        |       | eval  | eval  | eval
```

That is the actual mental model. A child enters the grid at some age band, which could be prenatal, could be five years old after immigrating. The system shows the cells that should have happened, the cells that are happening now, and the cells coming up next. Each cell's procedure has a tolerance window: do this between X and Y months of age, or it counts as a missed window.

The doctor who logs in only cares about her row. The orthodontist sees the orthodontics row. The ENT sees the ENT row. The center director sees the whole grid for one patient at a time, and the aggregate across all patients in the analytics view.

## What this changed in the schema

The wizard model had `Patient.current_stage`, `Patient.next_action`, `Patient.completed_steps`. Tidy. Testable. Wrong.

The matrix model has four primary tables instead. There is a `treatment_template` that defines the grid as specialty crossed with age band. There is a `procedure_template` that lives in each cell with its tolerance window. There is a `treatment_plan` that copies the template at patient registration time, so future template changes do not retroactively rewrite history. And there is a `procedure_instance` that records each actual visit, linked to its template but free to deviate, with an audit trail of why.

The `current_stage` field is gone. There is no current stage. There is a current age band, computed from date of birth at read time, and a set of cells whose status (done, in window, upcoming, missed) is derived from the procedure_instance history. State that I used to store, I now derive.

## The auto-suggest trick

Once the matrix exists, a small thing becomes possible that the wizard could not do at all. When a doctor opens a patient record, the system computes the patient's current age band, intersects it with the doctor's specialty, and shows exactly the procedures that should be considered today. Not all fifteen open items. Three or four, filtered to her row.

The orthodontist opens Baby A's record at age three. The system looks at the orthodontics row, finds two cells that fall inside the current age window (one in 18 to 36 months, one upcoming in 3 to 5 years), and surfaces those. The plastic surgeon opens the same record and sees a different list. Same data, different lens.

This is the feature that finally sold the doctors on the model. Not the matrix view itself, which they found "interesting but academic." The auto-suggest. The first time the orthodontist clicked a patient and saw exactly her two cells, no scrolling, no filtering, she said "okay, this is how it should work." That was the meeting.

## The hardest part: doctors do not think in matrices either

Here is the thing nobody warns you about. The matrix is the right data model. It is not the right UI by default. If you put a nine-by-seven grid in front of a doctor as the home view, their eyes glaze over. They think in patient stories, not grids.

The fix was to keep the matrix as the underlying truth and offer three views on top of it.

The first view is the patient timeline. A horizontal age axis with procedure dots on it, colored by status. A doctor reads it like a clinical narrative, left to right, no grid required.

The second view is the auto-suggest panel I described above, which is what doctors actually open most days. The matrix is implicit. They do not see it.

The third view is the matrix itself, but only on a "case review" screen, used for inter-specialty consultations. There it is genuinely useful, because the whole point of that meeting is to see all the rows at once.

So the model is a matrix. Two of the three primary surfaces hide it. That is fine. The model serves the data; the surfaces serve the humans.

## Two things I would do differently

I would build the auto-suggest before the matrix view. The matrix view is what convinced me the model was right. The auto-suggest is what convinces the doctors. Those are different audiences and different proofs, and I optimized for the wrong one in week one.

I would also stop treating "missed window" as an error state. In real practice, a kid arrives at four years old having had no surgery in their home country. Every cell from zero to four is "missed," and labeling them as failures in red feels punitive. I switched the color to gray and added a separate "secondary case" badge. Doctors stopped wincing at the screen.

## What is next

The next entry is about the part I am still uncertain on: how to model a procedure that repeats N times with no fixed schedule, like a series of taping sessions on a baby's lip. The data model has three patterns for this and I am not sure which one I will keep.

If you are building anything with longitudinal care, anything where multiple specialists own different parts of the same record, or anything where the user told you "it goes step by step" and you believed them, redraw it as a grid first. Then build whatever UI the doctor actually wants on top.
