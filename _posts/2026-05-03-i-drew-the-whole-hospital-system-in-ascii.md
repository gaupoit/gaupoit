---
layout: post
title: "I Drew the Whole Hospital System in ASCII Before Touching Figma"
date: 2026-05-03
summary: "Why ASCII wireframes beat Figma for the first conversation with non-technical clients, with rough numbers on agent token cost."
tags: [diary, design, ai-cost, healthcare]
---

> Series: Building a non-profit health information system for a craniofacial care center. I am writing one diary entry for every decision that ended up mattering. This is the first.

## The setup

A craniofacial center treats kids born with cleft lip and palate. The treatment lasts fifteen to twenty years and crosses six or seven specialties. Right now they manage everything on paper and Excel. They asked me to build them a real system, on a non-profit budget, with two months on the clock.

I had one meeting with the doctors before kickoff and one more meeting two weeks after that. In between, I needed to validate the entire UX with people who do not read Figma, do not care about my React stack, and will tell me politely that the design "looks fine" even when they do not understand it.

So before I opened a single design tool, I opened a Markdown file and started drawing boxes with pipes and dashes.

## Why not Figma

I love Figma for production design. I do not love Figma for the first conversation with a client. Three reasons.

First, **agent cost**. Most of my design exploration runs through Claude. Every screen I push through a vision model costs tokens, and a high fidelity Figma frame is worth thousands of them per round trip. When I am still figuring out whether a screen should even exist, I do not want to pay vision-model rates to ask "does this make sense." Plain text costs almost nothing to read, write, or revise.

Second, **iteration speed**. A wireframe should be cheap enough that I can throw it away. The moment I open Figma, I start fiddling with corner radii. ASCII forces me to stay at the level of "what goes where, and in what order." I can rewrite a whole screen in thirty seconds.

Third, and the one I underestimated, **doctors can actually read ASCII**. Boxes and labels look enough like the paper forms they already use that they nod along instead of going quiet. A polished Figma screen, on the other hand, invites the wrong feedback. They start commenting on the blue, on the font, on the icon for "patient." None of that is useful in week one.

## What an ASCII wireframe looks like

Here is one cell from the file I shipped to the doctors. This is the patient overview header.

```
+-----------------------------------------------------------------+
| Baby A   ID-001   Female   3 years 2 months                     |
| Diagnosis: Left unilateral cleft lip and palate                 |
|            (anatomical regions 2, 4, 6, 8)                      |
| Comorbidity: Pierre Robin sequence                              |
| Status: Post-op follow-up, lip repair (session 3 of 5)          |
+-----------------------------------------------------------------+
```

That is it. No frames, no components, no auto-layout. A doctor reads it and immediately tells me whether the diagnosis line is in the right format, whether the word for "comorbidity" matches what they actually say in the clinic, and whether the post-op session counter is the most important piece of state to show at the top. That is the conversation I needed to have, and a Figma screen would have buried it under decoration.

The full file ended up at sixteen hundred lines covering six user flows and roughly twenty screens. It lives in the repo as a single Markdown document. Engineers read it. The product owner reads it. The doctors read the printout.

## The flow trick

The single most useful pattern in the file is not the screen wireframes. It is the flow diagrams between them. Same syntax: pipes, boxes, and a vertical reading order. Here is the registration flow in miniature.

```
  B0: Profile type (active or prenatal)
        |
        v
  B1: Patient demographics
        |
        v
  B2: Parents (at least one parent required)
        |
        v
  B3: Family history and consanguinity
        |
        v
  B4: Primary diagnosis (generates Patient ID)
        |
        v
  B7: Confirm and create record
```

A doctor scans the column and immediately tells me "you forgot prenatal risk factors at B2," or "B3 has to come before B2 because we ask consanguinity first in our intake form." That feedback is the entire point of week one. I am not selling a design. I am extracting the implicit workflow that lives only in their heads.

## What it actually saved me

Rough numbers from this round.

**Token cost.** A round of Figma exploration through a vision model was running me somewhere between fifty cents and two dollars per iteration once I included context. The same iteration on the ASCII file is fractions of a cent. I went through more than fifty iterations on the wireframe file before the first doctor meeting. The math is obvious.

**Calendar time.** I had the first complete pass in roughly six hours of writing, mostly because I could draft a screen in a paragraph and keep moving. A Figma version of the same surface area would have taken me three or four days, and I would have been precious about every screen.

**Reuse.** The same file is now the spec the developers read. The flow diagrams turned into route maps. The screen sketches turned into component shells. Nothing was wasted, because the artifact was always plain text in the repo.

## Where ASCII falls down

I am not going to pretend it is a free lunch. Three honest weaknesses.

It cannot show density. When a real screen has nine columns of clinical data, ASCII either lies about the spacing or sprawls past the right margin. I had to switch to tables in a few spots, and even then the doctors squinted.

It cannot show interaction. Anything that depends on hover, drag, or animation has to be described in a sentence next to the box. The anatomical region picker, which is a clickable diagram of nineteen regions of the face, was the one screen where ASCII gave up and I had to draw a rough SVG instead.

It does not survive copy-paste into Word. The doctors wanted printouts. Half the box characters turned into question marks the first time I exported. I learned to test the print path before every meeting.

## What I would do differently next time

Two things.

I would write the flow diagrams first and the screens second. The flow diagrams are where the real disagreement lives. Screens just show the disagreement. I wasted maybe a day polishing screen wireframes for a flow that the doctors then rerouted in five minutes.

I would build a tiny "ASCII to PDF" script up front. I ended up doing it manually for every meeting, which is exactly the kind of small recurring pain that compounds across a project.

## What is next in this series

The next entry is about the matrix model itself. Treatment for a cleft kid is not a sequence of steps. It is a two dimensional grid of specialty crossed with age band, and getting the doctors to agree that this was the right model was harder than any line of code I have written so far.

If you are building anything in healthcare, anything for non-technical experts, or anything where you cannot afford twenty rounds of Figma, try the boring thing first. Open a Markdown file and draw a box.
