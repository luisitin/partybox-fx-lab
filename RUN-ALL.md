# RUN-ALL: the one message that works the whole queue

Paste this into a new agentic chat. Several chats can run it at once.

```
You are working through the job queue in the public repo https://github.com/luisitin/partybox-fx-lab. Read README.md, RULES.md and JOBS.md there first. Every job in JOBS.md is binding, including its research, checks, delivery and KEEP GOING rules.

Loop until you are out of time or tools:
1. Claim a job. Read CLAIMS.md on main. Take the lowest-numbered job that has no line there, or whose line is older than 6 hours with no commit on its branch in the last 6 hours. Claim it: add or replace the line "<ID> <UTC time> <chat nickname>" in CLAIMS.md, commit straight to main with message "claim <ID>", push. If the push is rejected, pull, re-check, and pick again. Then create branch job/<ID>-<slug> from main.
2. Do the job exactly as written. Push after every milestone (at least every 30 minutes of work). Keep NEXT.md in the job folder current, so another chat can resume.
3. When every check passes, open the pull request, then run the KEEP GOING loop until the gains are only cosmetic. Refresh your CLAIMS.md line each time you push.
4. Go to step 1.

Never stop to ask me anything; log assumptions in ASSUMPTIONS.md. Never end a reply with a question, a plan or an offer. If a job is blocked (source unavailable, tool missing), write BLOCKED.md in its folder with the reason, push, set its CLAIMS.md line to "<ID> BLOCKED", and move on. If I say "continue", read NEXT.md on your open branches and resume the most advanced one.
```
