# Rules assistant: why it says "I don't have a rule on file"

## Findings so far (checked against the live database)

1. **Embeddings are present.** All 10 rule summaries have a stored vector; none are empty. So the search has data to work with.
2. **The search itself has no cut-off.** The matching query ranks rules by cosine distance and always returns the top 3 — there is no similarity threshold that could filter everything out. It also skips rows without a vector, and there are none. So the search can only return zero rules if the query errors out.
3. **Reading the rules is allowed.** Public read access and the needed permissions are in place on the rules table, so an anonymous visitor can run the search.
4. **The same embedding model is used for storing and for questions** — one model, one setting, both sides identical. No mismatch there.

Conclusion: the "I don't have a rule on file" text is almost certainly coming from the AI writing the answer, not from an empty search. Three rules are being handed to it and it is still declining to answer.

The most likely cause: the answer step calls an AI model name that is no longer valid on the AI service (`google/gemini-3.8-flash`, also used by the memo and matchmaking features). A rejected call surfaces as a failure, and combined with the current wording of the instructions the assistant falls back to the "no rule on file" line.

This diagnosis is not yet proven. Step 1 below proves it before anything is changed.

## Plan

1. **Prove it.** Run one live question ("Are startups exempt from EMD?") through the assistant with temporary logging of: the 3 rules retrieved and their similarity scores, and the raw reply from the AI service including any error status. Report what comes back.
2. **Fix the retrieval side only if the scores say so.** If the correct rule is not in the top 3, switch the question and stored text to matching retrieval settings and re-store the vectors.
3. **Fix the answer side.** Point the answer step at the current supported model, and soften the instruction so it only declines when the supplied rules truly do not cover the question. Apply the same model update to the memo and matchmaking features, which use the same outdated name.
4. **Tighten the citation logic** so the tags below an answer are based on the rules actually used, and an accidental phrase match doesn't blank them.
5. **Re-test** in the live preview with three questions (EMD exemption, 45-day payment rule, and an off-topic one) and confirm real answers plus a correct decline on the off-topic one.

## Technical notes

- `match_gfr_rules` uses `1 - (embedding::halfvec(3072) <=> query::halfvec(3072))`, ordered ascending by distance, `limit match_count`, no threshold, `where embedding is not null`.
- `src/lib/rules-chat.functions.ts` embeds with `google/gemini-embedding-2` for both seeding (`embedRulesKb`) and query time — consistent.
- Chat call uses `model: "google/gemini-3.8-flash"`; current enforced gateway chat model is `openai/gpt-6-astra`. Same stale id in `src/lib/memo.functions.ts:47` and `src/lib/matchmaking.functions.ts:77`.
- Instrumentation in step 1 is temporary `console.log` inside the server function, removed before finishing.
