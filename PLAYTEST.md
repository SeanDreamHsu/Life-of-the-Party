# Friend playtest

Live site: https://lotp-playtest.vercel.app

Vercel project: `lotp` in `seandreamhsus-projects`.
The requested `lotp.vercel.app` was already in use, so the test uses
`lotp-playtest.vercel.app`. The default project address is
https://lotp-lovat.vercel.app.

## Playing and giving feedback

Use a laptop or desktop. The first visit opens the tutorial. Click a tile next
to the host to queue an action, then choose **End the Hour** to resolve it.
Use **WASD** or the **arrow keys** to queue movement, at one minute per tile.
Keyboard movement pauses while help, the sprite gallery, or feedback is open,
and while typing in a field or using the room selector.

Press **F** to focus the host’s current room and floor, including planned moves.
Change this shortcut in **Settings → Focus on the host**; the browser remembers
the chosen key. **Reset to F** restores the default.

Choose a floor in the left panel to look around. Walk onto a staircase on the
rear landing and use **Take stairs** to travel; each trip costs one minute and
can be undone while planning.

The **Playtest feedback** button opens a notes panel. Notes are saved locally
when browser storage is available. **Copy report** and **Download report**
include the notes, game version, current hour, suspicion, guest counts, viewport
size and recent game events. The tester must send the report back manually;
there is no server-side feedback inbox or automatic submission.

This alpha has no win/lose screen, injury failure, audio, or saved game. Reloading
restarts the run. Search engines are instructed not to index the test; the URL
is public and requires no login.

## Updating the deployment

The initial deployment includes the current local game and art changes, including
uncommitted changes. The Vercel project is also connected to the GitHub repository.

Run from this directory:

```sh
npm run build
npm run verify:art
npx vercel deploy --prod --scope seandreamhsus-projects
```

The playtest address is attached as a project production domain, so subsequent
production deployments should update it automatically. Verify the public address
after each deployment.

The local `.vercel` project link is ignored by Git. Vercel builds from source
using `vercel.json`; generated output, dependencies and project notes are excluded
from uploads with `.vercelignore`.
