# Math Escape Room (3D Prototype)

A browser-based 3D escape room where students complete 10 levels of math challenges.

## Run

Use a local web server from this folder:

```powershell
cd "D:\Escape Room"
python -m http.server 8000
```

Then open:

`http://localhost:8000/dashboard.html`

Choose role:
- `Student` -> student dashboard/login
- `Teacher` -> teacher dashboard/report

## Gameplay

- Click **Start Game** to lock cursor.
- Move with `W A S D`, jump with `Space`, and sprint with `Shift` (when unlocked).
- Look at a question door and press `E` to answer.
- Solve 3 questions to unlock the level treasure.
- Find the treasure chest and press `E` to collect it.
- Collecting treasure advances to the next level.
- After level 10, the game celebrates and restarts at level 1.

## Assessment Features

- Student dashboard login with full name (`dashboard.html`).
- Course track selection on login:
  - `Algebra 1`
  - `Precalculus`
- Fresh question session each login (new session seed).
- Randomized, level-scaled questions (difficulty increases every level).
- Wrong answer regeneration: every incorrect attempt replaces that station with a new question.
- ROBOX-style box cursor reticle in the center.
- Station visuals are rendered as mini 3D doors.
- Room visuals/layout change each level.
- Player is moved to a new room configuration each level (new room name, spawn, anchors, layout).
- After every level:
  - Automatic shout-out to the student by name
  - Level summary (time, score gain, attempts, accuracy)
  - New unlockable reward/perk (speed, jump, score bonus, penalty shield, sprint)
  - Named treasure unlock/collection (unique treasure name per level)
- Live classroom metrics in HUD:
  - `Time`
  - `Score`
  - `Attempts`
  - `Accuracy`

## Teacher Report

- Open `teacher.html` to view per-level records.
- Includes: date, student, course, level, time, score gain, attempts, accuracy, reward.
- Includes treasure name per level as well.
- Export CSV or clear report from the page.
- Teacher dashboard is PIN-protected via server-side auth API.

## Vercel Environment Variables

Set these in your Vercel project settings:

- `TEACHER_PIN`: your teacher PIN (example: `8520$`)
- `TEACHER_AUTH_SECRET`: long random secret for signing teacher sessions

## Customize Questions

Course-generated pools are built in `generateCourseQuestionPool(...)` in `game.js`.
Question templates are implemented in generator functions such as:
- `generateAlgebraQuestion(...)`
- `generatePolynomialQuestion(...)`
- `generateTrigQuestion(...)`
- `generateExpLogQuestion(...)`
- `generateSequenceQuestion(...)`
