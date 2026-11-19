# UI validation plan

## Every UI change

Run the focused test first, then:

```sh
npm run check
npm test
npm run build
```

Use deterministic Runtime fixtures. Do not put credentials, private file
contents, or real user prompts in tests.

## Required UI states

Every network-backed surface should intentionally handle loading, connected,
empty, disconnected, error, unsupported capability, disabled action, and
recovery. Streaming surfaces also need stalled, resumed, cancelled, and
replayed states.

## Required interaction checks

- first-run setup reaches one successful Agent answer;
- Runtime offline explains the next action and retry works;
- malformed or unsupported Runtime payloads fail safely;
- approval shows intent, target, risk, preview, and exact choices;
- denied, stale, duplicate, failed, and completed approvals differ;
- Agent and configuration revision details come from Runtime responses;
- no SecretHandle value appears in DOM, component state, URL, storage, logs,
  error text, or response fixtures;
- keyboard-only navigation has visible focus and no trapped focus;
- 320px-ish layouts preserve critical controls;
- reduced motion does not remove meaning;
- SSE disconnect resumes from a cursor or falls back to polling without
  duplicate messages.

## Validation layers

1. API validator/unit tests.
2. Component tests for states and actions.
3. Paired Runtime/client contract tests.
4. Real-browser keyboard and responsive walkthrough.
5. Long-stream and reconnect checks.

A UI task is done when its happy path, failure path, accessibility basics,
security boundary, and paired contract behavior are all evidenced.
