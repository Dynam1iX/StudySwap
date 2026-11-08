# Final test — StudySwap (Final Project, A4)

Tester (team member): Amanzhan Nurash
Date: 2026-11-08
System: https://studyswap-phi.vercel.app (final version, after PR #58)
Participants: AITU students who are **not** members of the team (no names — P1, P2, …)

## Method
Each participant signs in with their own AITU e-mail on their own phone. The tester gives the task, starts a stopwatch when the participant first touches the screen and stops it when the task is done. No help is given during a task. The tester writes down problems the participant had.

- **SC1** — find 3 possible swap partners for a subject the participant needs. Target: ≤ 2 min.
- **SC2** — create and publish a barter card (AI check included). Target: < 3 min.
- **SC3** — the whole journey works on a 360 px wide screen (or the phone's narrowest mode) without horizontal scrolling or cut-off buttons. Target: yes for every participant.

## Results per participant

| Participant | Phone / screen width | SC1 time | SC2 time | SC3 OK? | Problems noticed |
| --- | --- | --- | --- | --- | --- |
| P1 | iPhone 15 (393 px) | 11.2 s | 48.3 s | Yes | None |
| P2 | iPhone 17 (402 px) | 14.6 s | 66.0 s (1:06) | Yes | None |
| P3 | Samsung Galaxy S23 (360 px) | 15.3 s | 50.8 s | Yes | None |

## Summary (Stage 2 vs final)

| Success criterion | Target | Stage 2 result (5 users) | Final result (3 users) | Met? |
| --- | --- | --- | --- | --- |
| SC1 Find 3 partners | ≤ 2 min | 46.8 s average | 13.7 s average (max 15.3 s) | Yes (3/3) |
| SC2 Create a card | < 3 min | 48.4 s average | 55.0 s average (max 66.0 s) | Yes (3/3) |
| SC3 Works on 360 px | Yes | Yes (5/5) | Yes (3/3) | Yes |

## Observations
All three participants completed both tasks without help, and every time was well inside its target. SC1 was about 3.4 times faster than in Stage 2. SC2 took about 7 s longer on average than in Stage 2, which we expected: the final version runs an AI check on every card before it is published, and that wait is included in the time. The layout worked on all phones, including a Galaxy S23 with a 360 px wide screen, with no horizontal scrolling or cut-off buttons. With only 3 participants these results are an indication, not a statistical proof.
