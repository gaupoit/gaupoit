---
layout: post
title: "Ghost Typist: I Made Claude Code Let Me Pretend I'm the One Typing"
date: 2026-10-10 22:00:00 +0700
summary: "A Claude Code mod that types out the agent's code in a side pane, key by key, with keyboard sounds, plus a Hacker Typer mode where your own key presses type it. Useless, and a good teacher: partial JSON, a Zeno's-paradox bug, a text field that remembered everything, and why the recording is the real test."
tags: [diary, claude-code, side-project, typescript]
---

Watching an AI agent code is strangely passive. You type a prompt, wait, and a finished
diff appears. You nod. You never see *how* it got there.

I missed the feeling of code appearing one key at a time. So I spent a couple of evenings building
**Ghost Typist**, a Claude Code mod that takes the code the agent is writing and types it
out in a side pane, key by key, with mechanical keyboard sounds. Then I added a Hacker
Typer mode where *my* key presses type the agent's code.

It is completely useless. I love it.

<video src="/assets/ghost-typist-guide.mp4" autoplay loop muted playsinline controls width="100%">
  Watch mode, then hacker mode: <a href="https://github.com/gaupoit/ghost-typist">see the demo on GitHub</a>.
</video>

Repo: [github.com/gaupoit/ghost-typist](https://github.com/gaupoit/ghost-typist)

```
/plugin install ghost-typist --marketplace gaupoit/ghost-typist
```

## What it does

- **Watch mode** (default): when the agent calls `Write`, `Edit`, `MultiEdit`,
  `NotebookEdit` or `Bash`, a pane on the right types the code out at a human-ish pace,
  with a cursor and a clicky (or thocky) keyboard.
- **Hacker mode** (`/typist mode hacker`): the code waits for you. Every letter key you
  press types the next 3–5 characters. Stop typing and it stops.
- It's purely cosmetic: the agent never waits for the show.

Below are the lessons, because the toy turned out to be a good teacher.

## Lesson 1: the code is visible before the tool call even runs

Claude Code mods can hook `turn.step`, the model's response *as it streams*. A tool call
arrives as a `tool` chunk (name and id), then `input` chunks: the arguments' JSON, a few
characters at a time. So while the model is still writing a file, the hook already sees:

```
{"file_path":"/src/api.ts","content":"export async function get
```

The hook passes every chunk on untouched and copies the argument pieces into a queue. A
50 ms ticker types from that queue into a pane. The agent's output is richer than the
final diff: you can watch the arguments being written.

## Lesson 2: you need a JSON reader that's fine with half a string

`JSON.parse('{"content":"imp')` throws. I wrote a tiny lexer that tracks `{`/`[` depth
and whether the next string is a key, and decodes string values up to wherever the input
stops. Two details matter:

- Drop an escape that is cut in half (`\` or `\u00` at the very end) instead of printing
  junk.
- Don't mistake a value for a key: `{"description":"content","content":"real"}`.

The best test was a property test: cut the JSON at *every* position and check the decoded
text is always a prefix of the final text. One loop covers every way the API could split
the stream.

## Lesson 3: "catch up proportionally" never catches up

The typist falls behind the model, so once the model finishes a call the rest should be
typed within a time window. My first version set the speed each tick to `left / window`.
The test said it got through 236 of 400 characters.

It's Zeno's paradox. Each tick recomputes the speed from what is *left*, but the window
never shrinks, so the remainder decays geometrically and never reaches zero. The fix is a
real deadline: track time since the stream ended, and each tick type at least
`left × dt / remaining` characters.

**Anything that must finish by a time needs a clock, not a ratio.**

## Lesson 4: human timing is about what you skip

Random jitter alone looked robotic. What made it feel human was a few costs per
character:

| Character | Cost (keystrokes) |
| --- | --- |
| Newline | 3.5× (you pause at the end of a thought) |
| `;` `{` `}` `(` `)` | 1.8× |
| Leading indentation | ~0 (your editor auto-indents) |
| Everything else | 0.6–1.4× random |

## Lesson 5: one looped clip, not a sound per key

Spawning `afplay` on every keystroke would start dozens of processes a second. Instead the
mod plays one synthesised 3-second clip of irregular key presses on a loop, and stops it
with an `AbortSignal` when typing pauses. Your ear can't tell.

## Lesson 6: a text field remembers everything you mash

The first hacker mode used a text `Input` in the pane: every edit = one key. It worked,
and every mashed key stayed in the field: `asdfjkl;asdfjkl;qwerty…` growing across the
pane.

I tried three ways to clear it:

1. Redraw it with a different `value` each time (`''` / `' '`). Text stayed.
2. Give the `Input` a new `key` on every press to force a remount. Text stayed.
3. Wrap it in a `Box` with a new `key` on every press. Text *still* stayed.

The terminal holds a field's typed text whatever you redraw. So I stopped using a text
field. Hacker mode now draws 36 hidden `Button`s (`a–z`, `0–9`) inside a
`display: "none"` box, each with a `hotkey`, and counts the presses. Nothing is left on
screen. The trade-off: only letters and digits count, so mash the home row, not the space
bar.

A related trap: each key press redraws the pane, so by the time the press would reach the
Button's `onPress`, the handler it was drawn with is gone, and the engine logs
`no handler is held under handle 12498`. The hook now answers the press itself instead of
passing it on.

## Lesson 7: record it, and watch the recording

All tests were green before I recorded the guide video with
[VHS](https://github.com/charmbracelet/vhs) (a scripted terminal recorder: `vhs
docs/guide.tape` replays a real Claude Code session). Then I watched the frames and found
three things no test had caught:

- The mashed-keys mess from lesson 6.
- The `no handler` error line in the transcript.
- Watch mode finished short files at **2,324 WPM**. With a 1.5 s finish window, a 400-
  character file is effectively instant: correct code, wrong feeling. I raised the window
  to 8 s and it now reads at a believable 450–600 WPM.

Tests check what you thought to assert. A recording shows what the user actually sees.
For anything visual, the video is the test.

## Lesson 8: the mod API's rules, learned from the validator

- `$` (the engine handle) may only be passed to top-level functions. My helpers lived
  inside `register` as closures and `claude plugin validate` refused them. Module-level
  state and top-level functions fixed it.
- In tests, calls the plugin makes on `$` (`ui.open`, `audio.play`) are answered from
  beneath with `{ value }`, not the bare result.
- The test `$` has no state noun, so I couldn't preload state. That turned out well: the
  real test fakes a model stream through `turn.step`, advances a mocked clock, and checks
  the pane says `done · 100%`. End to end, with no mocks of my own code.

## Try it

```
/plugin install ghost-typist --marketplace gaupoit/ghost-typist
/typist                 # open the pane (it opens by itself on wide terminals)
/typist mode hacker     # every letter you press types the agent's code
/typist sound thock     # clicky, thock or off
```

Sound plays on macOS. The pane docks beside the transcript on terminals at least 144
columns wide.

Next on the list: for `Edit` calls, type over the real file at the right line instead of
showing only the new text.

## Takeaways

1. Agent streams carry more than the final diff: tool arguments are visible while they're
   being written.
2. Parse partial data with a reader built for it, and test it at every cut point.
3. Anything that must finish on time needs a deadline, not a proportional speed-up.
4. When a UI widget fights you three times, stop using that widget.
5. Green tests aren't the finish line for UI. Record it and watch it.
