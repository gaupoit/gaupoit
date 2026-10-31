---
layout: post
title: "All Tests Green, Then Claude Said 403: My Cloudflare Worker Was Calling From Hong Kong"
date: 2026-10-31 20:30:00 +0700
summary: "I shipped a guest video maker for Meomeo with 83 of 83 tests passing, then the first real render on prod failed with a 403 from the Anthropic API. The key was fine. The request was leaving from Hong Kong, because that is where Cloudflare sends visitors from Vietnam. How I found it, why no test could have, and the small Durable Object that fixed it."
tags: [diary, cloudflare, workers, anthropic, lessons]
---

> A short one. The kind of bug no test catches, and that I'd have missed if I hadn't clicked the button on prod myself.

## What broke

Today I opened a new feature on Meomeo: anyone can make a short video on the site without signing in. The code was done, 83 of 83 tests passed, local runs were smooth, and the deploy went out. I opened the page, picked a template, uploaded two clips and pressed render.

The job sat on the "write the script" step for a while, then failed. The refund logic worked, so the free credit came back. The video didn't.

## The error

`wrangler tail` showed what the Anthropic API answered:

```
403 {"error":{"type":"forbidden","message":"Request not allowed"}}
```

Not a 401 (bad key). Not a 429 (rate limit). A 403 with a very generic sentence. The key was fine: the same key worked from my laptop.

## The cause: the request left from Hong Kong

A Cloudflare Worker doesn't run in one place. It runs in the data center (colo) closest to the visitor, and when the Worker calls `fetch`, the request goes out from that same colo.

I opened `https://meoedit.com/cdn-cgi/trace` from a Vietnamese connection:

```
colo=HKG
loc=VN
```

Visitors in Vietnam usually land on the Hong Kong colo, and Hong Kong is not a region the Anthropic API serves. So every Claude call the Worker made for a Vietnamese visitor was refused.

The part that scared me more: Meomeo's paid landing-page generator (99k VND) calls Claude the same way. So the flow that actually makes money had very likely **never worked** for customers in Vietnam on prod. Nobody had paid for one yet, so nobody had seen it fail.

## Why tests and local dev missed it

- **Tests** mock the Anthropic API, so no real request ever leaves.
- **`wrangler dev`** runs on my laptop, so requests leave from my home network, not from a colo.
- **The deploy** succeeded, pages returned 200, everything looked green.

The bug needs three things at once: the code running on Cloudflare, a real visitor in Vietnam, and a real call to Anthropic. No environment before prod has all three.

## The fix: make the request leave from the US

Durable Objects accept a location hint (`locationHint`). A Durable Object created with `locationHint: "wnam"` lives in western North America, and a `fetch` made inside it leaves from there.

So all it takes is a Durable Object acting as a relay, allowed to call `api.anthropic.com` and nothing else:

```ts
export class ClaudeRelay extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    if (new URL(req.url).hostname !== "api.anthropic.com")
      return new Response("Not allowed", { status: 400 });
    return fetch(req);
  }
}
```

Then give the Anthropic SDK a custom `fetch` that goes through the relay:

```ts
const RELAYS = 8; // spread the load over a few objects

export function claude(env: Env): Anthropic {
  const relay = env.CLAUDE_RELAY.getByName(
    `wnam-${Math.floor(Math.random() * RELAYS)}`,
    { locationHint: "wnam" },
  );
  const relayFetch = (input: RequestInfo | URL, init?: RequestInit) =>
    relay.fetch(new Request(input, init));
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, fetch: relayFetch as typeof fetch });
}
```

Every place that used to say `new Anthropic(...)` now calls `claude(env)`. The Durable Object hands back the `Response` as is, so nothing else in the code had to change.

Two notes:

- `locationHint` only applies when an object is **first created**. An object that already exists stays where it is. Use new object names (here `wnam-0` to `wnam-7`) rather than reusing old ones.
- The relay only allows one hostname, so it can't turn into an open proxy for anyone who wants to send anything.

I deployed the fix and rendered again. This time the video came out.

## Takeaways

1. **A Worker calls out from the visitor's colo, not yours.** Any API that restricts by region (Anthropic, OpenAI, some payment gateways, bank APIs) can fail depending on where your user is. Don't assume the request leaves from where you think.
2. **Check `/cdn-cgi/trace` from the market you sell to.** One line saying `colo=HKG` is enough to ask the question.
3. **"Deployed" is not "working".** For a flow that takes money, run it once end to end on prod, as a user in the right market, before you call it live.
4. **A vague error is still a clue.** A 403 "Request not allowed" on a key that works elsewhere is almost always about location or policy, not code.

I got lucky this time because I clicked the button before a real customer paid. One new line on my deploy checklist: open `/cdn-cgi/trace` and make one real API call from a Vietnamese connection.
