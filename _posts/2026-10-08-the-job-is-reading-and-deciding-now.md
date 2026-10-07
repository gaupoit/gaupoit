---
layout: post
title: "The Job Is Reading and Deciding Now"
date: 2026-10-08 00:40:00 +0700
summary: "AI made writing cheap: code, analysis, reports, even this blog's first drafts. What it did not make cheap is reading the output carefully and deciding what to do with it. Seven mistakes from the last three weeks, and what each one taught me about the two skills that are left."
tags: [diary, ai, decision-making, lessons]
---

> Not part of the hospital series. This one is a pattern I keep seeing across every project I touched in the last month.

## Writing got cheap

Most of what I ship now starts as text an agent wrote. Code, migration scripts, data imports, ad-spend analyses, deploy runbooks, the first draft of the last blog post. Producing a plausible answer costs a few cents and a few minutes.

That changed where my mistakes come from. I rarely make a mistake writing anymore. I make them reading: I look at a correct-looking output and accept it. Or I make them deciding: I let something happen that nobody chose on purpose.

I keep a lessons-learned file. I went through the last three weeks of it, and almost every entry is one of those two failures. None of them is "the AI wrote bad code."

## Part one: reading

### The number that went up by one

A client's web app has a type check that runs only on the files a pull request changes. Errors in other files are reported as "pre-existing". Two pull requests were built in parallel. One added a call to a shared hook with three arguments. The other made a fourth argument required. Each passed review on its own.

After the first one merged, I rebased the second and pushed. The pre-existing count went from 43 to 44. I read past it. The second PR merged, and the QA build broke on exactly that call.

The information was on my screen. It was one number, and it had changed. The tool had done its job; I had not done mine. A rise in "pre-existing errors" is a new error. It just has a label that tells you not to look.

### The coverage that looked fine

I imported a hospital's old operative reports from a Google Form spreadsheet into structured forms. The matcher mapped each column header to a field label. Coverage looked good: only about 8% of answers were left unmapped.

Then I printed every header-to-field decision and read them one by one. On two-sided cases, answers had landed in the one-side fields, because both sections share labels. Skin sutures went into the under-skin row. "Points to note" went into the technique-improvement field.

The percentage measured how many answers found *a* field. It said nothing about whether it was the *right* field. The only way to know was to read the decisions, all of them.

### The residual I called a measurement

I wanted to know how much of a shop's ad budget went to one campaign type. Its API was rate-limited, so I took total spend, subtracted what I could measure, and reported the rest as that campaign type: "about 95%." When the API finally answered, it was 23%. The rest was a different ad type that the API does not break down by product.

I had not read the number wrong. I had *named* it wrong. "Total minus what I know" is unattributed spend, not the thing I expected it to be. Now anything computed as a remainder gets labeled as one, and the parts I measured plus the unattributed part have to add up to the total.

### The summary that was confidently wrong

Yesterday I asked an agent to describe how I built a set of training videos, so I could turn it into a post. It read the project's README and scripts and wrote a clean summary: voice narration, music, speech-to-text checks, all of it. The first blog draft followed it, and filled in a few vivid anecdotes for good measure.

Before publishing, the agent checked the rendered files directly. Only one of the nine videos had an audio track. The other eight were silent, with captions only. The anecdotes had no source at all.

The README described what the pipeline *can* do. The `.mp4` files showed what it *did*. A summary of the docs is not a description of the work, and reading the artifact (here, one `ffprobe` call per file) is the only check that counts.

## What good reading looks like

These four have the same shape. The output looked complete, and the problem was one level below the summary. What I try to do now:

- **Read the decisions, not the score.** Coverage, pass rates and green checks summarise. The row-by-row log is where the wrong answers are.
- **Read the deltas.** Any count that changed between two runs gets an explanation before I move on, especially one labeled "pre-existing", "skipped" or "warnings".
- **Ask where each number came from.** Measured from its own source, or computed as what is left over? Only the first one gets a name.
- **Read the artifact, not the description of it.** The file, the database row, the rendered page, the actual HTTP response. Docs and summaries say what should be true.
- **Quote from the latest output, not from memory.** I once reported "26 matched" from a run I remembered; the dry run in front of me said 25.

## Part two: deciding

Reading tells you what is true. Deciding is what you do about it, and agents make it easy to skip, because every step looks like it has already been decided by someone.

### The config that protected nothing

I locked a headless agent out of the project's secrets with the Claude Code sandbox settings. The config looked right. One key in it was not supported by that version, and the tool silently dropped the *entire* settings object. The agent could read `.env`, write into the source tree and reach the internet. It looked configured and protected nothing.

The decision I had skipped: *how do I know this works?* I had treated "I wrote the config" as "the sandbox is on". Now a security setting is only real after a probe: run the agent with it, try to read the secret, try the forbidden write, try the outside request. Decide what proof you need before you trust it, then go get that proof.

### The outage I blamed on the wrong thing

A chat bot I run went quiet for three hours. A rate-limit error from the messaging API was in the logs, so I blamed the API and suggested a restart. The real cause was the laptop the bot ran on, going to sleep after one minute idle. The socket kept reporting "connected" after each brief wake, so nothing looked broken.

The mistake was deciding where to look based on the most visible clue. One command (`pmset -g log`) would have shown the sleep. Choosing the order in which you check causes is a decision, and the cheapest check that could rule out the biggest cause goes first.

### Two agents, one deploy

Two sessions worked on the same production branch. One had already backed up the database, synced and restarted production. The other, unaware, started the same runbook. It only stopped because its first step was a read-only check that showed production already at the new commit.

Nobody had decided who owned the deploy. Each agent was doing the right thing in isolation. The rule now is that one agent owns a deploy, the others report and stop, and every deploy starts with a read-only check of what is already there.

## What good deciding looks like

- **Decide what proof you need before you look at the result.** Otherwise any result looks like proof.
- **Decide who owns each irreversible step.** Deploys, migrations, deletes, messages sent to people. Agents will happily all do it.
- **Order the checks by cost and reach.** The fastest check that could rule out the most goes first, not the one suggested by the loudest log line.
- **Decide what "done" means.** Merged is not done. Deployed is not done. The page returning 200, the backup restored once, the clip with an audio track: that is done.
- **Decide what not to delegate.** I let agents write almost everything. I do not let them decide what counts as verified.

## Why these two, specifically

AI is very good at producing the thing that looks like the answer. It is getting good at checking its own work too: the agent that wrote the wrong summary was also the one that caught it, when it went back to check its claims against the files.

But the process came from me. Somebody has to decide that reading the files is part of the job, notice that 43 became 44, and choose to print the mapping log instead of trusting the percentage. That person has to be able to read output faster than it is produced and make calls about it without waiting for certainty.

Those were always senior skills. What changed is that juniors used to build them slowly, by writing everything by hand and making these mistakes at a human pace. Now the writing is free, and the mistakes arrive at machine pace. Reading and deciding are not a later-career skill anymore. They are the first thing to practise.

## How I practise

Nothing clever. Three habits:

1. **A lessons-learned file.** Every time I read past something or let something happen undecided, it gets an entry: context, mistake, fix. Writing it down is what makes it a habit instead of an anecdote. Most of this post came from that file.
2. **One question before accepting output:** "What would I see if this were wrong?" Then I go and look for exactly that.
3. **Slow down at the summary.** When an agent says "all done, everything passes", that sentence is my cue to open the actual output.

The writing will keep getting cheaper. The judgment about what you just read, and what you will do about it, is what you are paid for now.
