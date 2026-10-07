---
layout: post
title: "I Stopped Screen-Recording Training Videos. Now I Compile Them."
date: 2026-10-08
summary: "Nine training videos for doctors and coordinators, about thirty minutes in total, and not one of them was screen-recorded. A Playwright script captures the real app step by step, Remotion turns the steps into video, and the timeline decides how long each step stays on screen."
tags: [diary, video, playwright, remotion, healthcare]
---

> Series: Building a non-profit health information system for a craniofacial care center. This is entry three. The last one was about [modeling the treatment plan as a matrix](/2026/05/04/the-treatment-plan-is-a-matrix-not-a-workflow/). I promised the next entry would be about repeating procedures. That one is still unresolved, so this one jumped the queue.

## The problem with screen recordings

The system went live, and the center needed training material. Doctors register patients, coordinators book appointments, someone runs the waiting-room queue screen. Each role needed a short video in Vietnamese showing exactly where to click.

The obvious way is to open the app, start a screen recorder and talk. I have done that before, and I know how it ends. You record a ten-minute take, stumble on minute eight, start again. A week later a doctor asks to rename a button label, and every video that shows that button is now wrong. Training videos for software that is still changing go stale the moment you export them.

So I did not record anything. I wrote the videos as code.

## The idea in one paragraph

A Playwright script drives the real app and, at each step, saves a screenshot plus the box of the element it is about to click or type into. Remotion takes those steps and builds the video: the camera zooms onto the element, a cursor moves there and clicks, typed text appears inside the field, a caption explains what is happening. A timeline function decides how long each step stays on screen: from the caption's reading time, or from the length of its voice line when there is one. When a label changes, I edit one line, recapture, and render again. Nothing gets re-shot.

## Step one: a demo copy of the app, not production

Every frame in the videos is the real production build, running on a stack that is completely separate from production.

- A git worktree on its own branch, cut from `develop`, serving the production bundle with `vite preview`.
- Its own Postgres and an S3 mock (LocalStack) in Docker, on different ports, with fresh keys.
- Reference data copied from production: treatment templates, forms, specialties, diagnosis lists. Only those tables. No patient table was read.
- A seed script that wipes patient data and creates nine made-up children and nine appointments, dated around today.

This is a health system, so this part was not optional. Nothing in a training video can be a real patient, and the demo stack never holds a secret from production.

One rule I learned the hard way: **reseed before every capture.** Each clip changes the data (it registers a patient, books a slot, cancels one), and the appointment dates are relative to the day you run the script. Capture clip three without reseeding, and the calendar is empty, or full of yesterday.

## Step two: explore before scripting

Before writing a single clip, I wrote throwaway Playwright scripts that just walk through a screen and dump what they find: screenshots, the accessibility tree, full-page scroll shots of long forms. The folder ended up with close to three hundred files.

It looks wasteful. It is where I learned which elements had proper labels, which dialogs opened slowly, and which flows broke when you clicked faster than a human would.

## Step three: a clip is a lesson plan

The capture scripts read almost like a lesson plan. Each call names the element on screen and the caption for that step, in the same line:

```js
r.chapter('Bước 1', 'Thông tin hành chính và gia đình');
await r.type(p.getByRole('textbox', { name: 'Họ và tên *' }), 'Nguyễn Gia An',
  'Nhập họ và tên của bé. Ô có dấu * là bắt buộc.');
await r.tip('Ô "Số hồ sơ" để trống: máy tự cấp số tiếp theo khi lưu.',
  p.getByRole('textbox', { name: 'Số hồ sơ' }));
await r.click(p.getByRole('button', { name: 'Thêm chẩn đoán' }),
  'Bấm "Thêm chẩn đoán" để chọn lý do đến khám.');
```

The recorder runs Chromium at 1440×810 with a device pixel ratio of 2, Vietnamese locale and timezone. Each step writes a sharp screenshot and the element's box into a `steps.json`. That file is the whole interface between capture and video.

A few details that mattered more than I expected:

- **Elements are found by role and accessible name, never by CSS class.** The videos survive restyling. If a script cannot find "Họ và tên *", the label changed, and the video should change with it.
- **Hide the text caret.** A blinking caret captured at random moments looks like flicker in the final video. One injected style rule fixes it.
- **Phone flows on a stage.** Parents use the app on their phones. Instead of mixing portrait recordings into a landscape video, the recorder opens a small page that shows the app in a 360×720 phone frame on a brand-coloured background, so every clip keeps the same 16:9 frame.

## Step four: voice, and checking it without listening

Captions alone work, and most of the clips ship that way. But I wanted to know what a narrated version costs, so I built the voice pipeline on the first clip.

A script turns the captions into narration. It is mostly the same text, but written Vietnamese is not always speakable Vietnamese. `kg` has to become "ki lô gam", a slash between options becomes "hoặc", an asterisk becomes "dấu sao", a date like `3/2026` becomes "3 năm 2026". Without that pass, the voice reads symbols aloud and sounds broken.

I compared four voices on the same paragraph before choosing one, then generated every line as its own audio file. The registration clip alone is 48 lines.

Listening to every line to catch mispronunciations is slow, and I stop hearing mistakes long before line 48. So I made the machine listen. Each generated line is transcribed back with Whisper (large-v3-turbo through `mlx-whisper`, running locally on the Mac), and a small script prints only the lines where words from the script are missing in the transcript, with what it wanted and what it heard. Instead of 48 lines to listen to, I get a short list to fix in the narration rules and regenerate. Speech-to-text as a test suite for text-to-speech turned out to be the most useful twenty lines of the project.

## Step five: the audio sets the timing

This is the part I would keep if I threw everything else away.

The timeline is a plain TypeScript function, with no React in it. It takes the steps and the measured length of each voice line, and decides how many frames each step gets: a short lead-in, the voice line, a small tail. If there is no voice yet, it falls back to subtitle reading speed, about 13 characters per second for Vietnamese.

Captions-only clips use the reading-speed timing. The narrated clip uses the voice timing. Same steps, same code; the only difference is whether a voice file exists.

The same function feeds two outputs: the length of the Remotion composition, and the `.srt` subtitle file. Video, voice and subtitles come from one set of numbers, so they cannot drift apart. I never once nudged a caption by hand.

## Step six: the composition

The Remotion component turns each step into motion:

- a camera that eases in and zooms onto the target element
- an animated cursor that travels there, with a ripple on click
- typed text revealed left to right inside the field's box
- a caption bar, and "Lưu ý" (note) callouts with a spotlight that dims the rest of the screen
- chapter cards, an intro, and an outro that lists three or four takeaways

Output is 1920×1080 at 30 fps. Rendering is one command per clip.

## Music without a license question

I did not want to sort out licensing for background music in a hospital's training videos, so I wrote the music. A short Python script with NumPy and SciPy generates a calm loop: a soft pad under a slow electric-piano arpeggio, I–vi–IV–V in C at 72 BPM. It is seeded, so every render gets the exact same track. In the narrated clip it plays at full level in the intro and outro and drops under the voice.

The only AI-generated visual is an abstract background loop in the brand colours, used behind the intro and outro cards. No text, no people, nothing that could look like a real clinic.

## The whole loop

```bash
node scripts/seed.mjs                    # fresh fake patients, dates around today
node capture/clip1-register.mjs          # screenshots + steps.json
npx remotion render src/index.ts clip1-register out/clip1-register.mp4
bun scripts/srt.ts clip1-register        # subtitles from the same timeline
```

I review drafts in Remotion Studio, and through grids of stills pulled from each render, which catch a wrong screen faster than watching at full speed. When a step fails (a slow dialog, a selector that matched two things), the capture script saves a `clipN-fail.png` of where it stopped, and I fix the script and run it again.

Nine clips, from two to five minutes each, about thirty minutes in total. Once the recorder and the composition existed, eight of the nine were captured and rendered in a single night. The ninth, the parent's-phone flow, needed the phone stage and came a few days later.

## What I have not decided

Only the registration clip ships with voice and music. The other eight are captions only, and silent. I rendered a captions-only cut of the registration clip too, so the center can compare the two side by side.

The trade-off is real. Voice makes a clip easier to follow for someone who is not looking at the screen the whole time. It also adds a step to every wording change: regenerate the line, run the speech-to-text check, render again. Captions change with one edit. The pipeline supports both, and the doctors will decide which one they actually watch.

## What is next

The repeating-procedures entry, for real this time.

If you need training videos for software that is still changing, try treating them as a build output instead of a recording. Script the clicks against a demo copy, let the voice decide the timing, and make speech-to-text check the voice for you. The first clip takes a few days. Every change after that takes minutes.
