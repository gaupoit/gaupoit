---
layout: post
title: "Ghost Typist: I Made Claude Code Let Me Pretend I'm the One Typing"
date: 2026-10-10 22:00:00 +0700
summary: "A Claude Code mod that types out the agent's code in a side pane, key by key, with keyboard sounds and an on-screen keyboard that lights each key, plus a Hacker Typer mode where your own key presses type it. Useless, and a good teacher: partial JSON, a Zeno's-paradox bug, a text field that remembered everything, why the recording is the real test, and what it takes to make a keyboard look like it is typing."
tags: [diary, claude-code, side-project, typescript]
---

Watching an AI agent code is strangely passive. You type a prompt, wait, and a finished
diff appears. You nod. You never see *how* it got there.

I missed the feeling of code appearing one key at a time. So I spent a couple of evenings building
**Ghost Typist**, a Claude Code mod that takes the code the agent is writing and types it
out in a side pane, key by key, with mechanical keyboard sounds. Under the code, an
on-screen keyboard lights up each key as it's "pressed". Then I added a Hacker Typer mode
where *my* key presses type the agent's code.

It is completely useless. I love it.

<video src="/assets/ghost-typist-guide.mp4" autoplay loop muted playsinline controls width="100%">
  Watch mode, then hacker mode, with the keyboard lighting each key: <a href="https://github.com/gaupoit/ghost-typist">see the demo on GitHub</a>.
</video>

Repo: [github.com/gaupoit/ghost-typist](https://github.com/gaupoit/ghost-typist)

```
/plugin install ghost-typist --marketplace gaupoit/ghost-typist
```

## What it does

- **Watch mode** (default): when the agent calls `Write`, `Edit`, `MultiEdit`,
  `NotebookEdit` or `Bash`, a pane on the right types the code out at a human-ish pace,
  with a cursor and a clicky (or thocky) keyboard.
- **The keyboard**: a US keyboard at the bottom of the pane lights the key of each
  character as it appears. Capitals and symbols light shift, a new line lights Enter, and
  indentation lights nothing.
- **Hacker mode** (`/typist mode hacker`): the code waits for you. Every letter key you
  press types the next 3–5 characters. Stop typing and it stops. The keyboard lights the
  keys of the code that appears, not the keys you hit: you mash `asdf` and it shows you
  typing `const`.
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

## Lesson 8: a keyboard that types for you is mostly about timing

Drawing a keyboard in a terminal is easy: five rows of `Text`, each key three columns
wide, and the pressed ones in inverse with the accent colour. Working out *which* key
types a character is a small lookup table: `A` is shift plus `a`, `{` is shift plus `[`,
and a newline is Enter. Making it look like typing was about timing and layout:

- **Lit only for one frame, keys would blink.** The pane redraws every 50 ms, but at
  110 WPM a character arrives only about every 110 ms, so most frames type nothing. A key
  stays lit for 5 frames (250 ms) after its character. I started at 3 frames (150 ms), then
  did the arithmetic: a space can cost up to 1.8 keystrokes, about 200 ms, which would leave
  a dark gap mid-word and make the "a key is lit" test flaky.
- **Indentation must not light the space bar**, or every new line would flash a burst of
  spaces. The pacing code already treats indentation as "your editor typed it", so the
  keyboard reuses that rule and lights nothing for it.
- **The keyboard slid down the pane** as the code grew, which looks nothing like a desk.
  Making the pane fill its height with a spacer above the keyboard fixed that, and the
  status line then floated in the middle of the pane. Both bugs were obvious in the recorded
  screenshots and invisible to every test, which is lesson 7 again.

In hacker mode, the trick is lighting the keys of the *code*, not the keys you pressed.
Your fingers mash the home row, and the screen says you typed
`` return `Hello, ${name}` ``.

## Lesson 9: the mod API's rules, learned from the validator

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
/typist keyboard off    # hide the keyboard
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
6. Animations live or die on timing: hold a lit state longer than the gap between events.
