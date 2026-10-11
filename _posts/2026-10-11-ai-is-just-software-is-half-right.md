---
layout: post
title: "\"AI Is Just Software\" Is Half Right"
date: 2026-10-11 12:30:00 +0700
summary: "On All-In this week, David Friedberg said AI is just software, a program people wrote. He is right about what it is and wrong about how it behaves. Nobody writes an LLM's behavior; it is learned, and even its makers can't read it. Three diagrams on why that matters, and what it changes when you build agents."
tags: [diary, ai, agents, lessons]
---

> Not a build log this time. A line from a podcast that kept bugging me, because the half that's wrong is the half that bites when you ship agents.

## The line

On [All-In this week](https://www.youtube.com/watch?v=TBLHdXABwAg), the hosts argued about whether Claude might be conscious. David Friedberg's answer was simple: it's software. A program people wrote. Stop talking about it like a being.

I agree with where he lands. Treat it as software. Test it, measure it, hold someone accountable for it.

But "just software" hides the part that matters most when you build with it. Traditional software does what its code says. An LLM does what it learned. Nobody wrote that part, and nobody can read it.

## Who writes the behavior

![Traditional code writes behavior. An LLM learns it.](/assets/ai-just-software/llm-vs-code-behavior.svg)

With normal code, the developer writes the behavior directly. Read the code and you know what it does.

With an LLM, the developer writes the *training recipe*: the architecture, the loss function, the data pipeline. That's a few thousand lines. The behavior ends up somewhere else, in hundreds of billions of numbers set by training. Nobody typed "how to answer a skincare question" or "how to debug Python". Those skills formed on their own.

The closest analogy I have: traditional code is writing a recipe. An LLM is designing a cooking school. You write the curriculum and the grading. The chef's skill is learned, and you can't open the chef's head to read it.

## Same shop, two jobs

Take a small online shop. Two things it needs:

**Job 1: shipping fee.** You write the rules.

```python
def shipping_fee(weight_kg, inner_city):
    if inner_city:
        return 20000 if weight_kg <= 2 else 30000
    return 35000
```

A 3kg order outside the city costs 35,000đ. Run it a million times, same answer. If it's wrong, you open the file and fix the line.

**Job 2: a customer asks "is this lipstick OK for oily skin?"** There is no `answer_oily_skin_question()` function. The model answers from what it learned.

Because no line of code owns that answer:

- Ask slightly differently ("my skin gets a bit greasy") and you can get a different answer.
- When the bot over-praises a product, there's no line to point at.
- To fix it, you change the prompt, the data, or add a check outside the model. Then you measure again from scratch.

| | Shipping fee | LLM answering customers |
| --- | --- | --- |
| Who writes the behavior | The developer | Training |
| Know the output in advance | Read the code | Run it |
| Testing | Unit tests cover every branch | Accuracy on a set of sample questions |
| Fixing a bug | Fix the line | Change prompt or data, or add an outside check |

## Where the behavior lives

So it's in the weights. But not in one place you can point at.

![One concept spreads across many neurons. One neuron serves many concepts.](/assets/ai-just-software/llm-superposition.svg)

In code, every concept has an address: a variable, a function. In a model, one concept is spread across many neurons, and each neuron takes part in many unrelated concepts. Researchers call it superposition. (The diagram is an illustration, not a real model.)

Two consequences. You can't point at "the part that makes the bot pushy". And changing one thing can shift other behaviors you didn't expect.

## Interpretability is reverse engineering

Because nobody can read the weights, there's a whole research field that dissects models from the outside, a bit like neuroscience for networks. It looks for *features* (concepts the model represents inside) and *circuits* (how information flows to an answer).

The example I remember: in 2024 Anthropic found a feature for the Golden Gate Bridge inside Claude. When they turned it up, the model brought the bridge into every answer. Ask for a recipe, get the bridge. Ask who it is, and it said it was the bridge.

That experiment shows both halves. There is real structure inside, and you can act on it. But it took serious research to find, not a quick read of the code.

## It's still not magic

To be fair to Friedberg: an LLM is still deterministic computation. Same weights, same input, same seed, same output. No will slips in between the matrix multiplications.

The unpredictability comes from *our* limited understanding of a computation that big. Weather works the same way. Pure physics, still hard to forecast.

So yes, it's software. Just add one clause: software whose behavior was learned, not written.

## What this changes when I build agents

If the model is software that guesses, don't let it decide alone. Let it propose. Let code and people decide.

![The LLM proposes. Code and people decide.](/assets/ai-just-software/llm-agent-guardrails.svg)

- **A prompt is not a spec.** Writing "never discount more than 10%" doesn't mean it won't. Hard rules go in the guardrail, in code.
- **Evals replace unit tests.** Keep a set of real customer questions, measure the hit rate, rerun it every time you change the model or the prompt.
- **A human approves the steps that can't go wrong.** Refunds, cancellations, messages to your biggest customers.
- **Log everything in production.** Real edge cases only show up with real users, and they're what you feed back into the eval set.

## The short version

"AI is just software" is useful when it stops you from treating AI as a god. It's dangerous when it makes you think AI is as controllable as a function.

Treat it as software. Probabilistic software. Measure it with numbers, wrap it in normal code, and keep a person at the steps that must not fail.
