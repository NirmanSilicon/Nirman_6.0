# Camera troubleshooting

## Messages the app shows and what to do

| Message | Cause | Fix |
|---|---|---|
| Camera permission was denied | The site was blocked | Click the camera icon in the address bar, allow it, press **Open camera** again |
| No camera was found on this device | None connected, or the system disabled it | Connect one; check the operating system's camera privacy switch |
| The camera is busy or blocked | Another app (a video call) has it | Close the other app and try again |
| This camera cannot give a usable picture | The requested size is unsupported | Press **Switch camera** |
| The browser blocked the camera on this page | The page is not secure | Camera access works only on `https://` or `http://localhost` |
| The camera was disconnected or stopped | Unplugged or put to sleep | Plug it in, press **Open camera** |
| This browser cannot use a camera on this page | Old or limited browser | Use a current Chrome, Edge, Firefox or Safari |

## Recognition problems

- **Hand seen, but no clear letter/pose**: keep the hand fully in view, palm toward the camera for most letters, one hand only, and hold still about a second.
- **"Hands detected" never shows**: check lighting (face the light, avoid a bright window behind you), keep your hand well within the frame, and move it away from skin-coloured backgrounds.
- **Words appear that were not signed**: raise **How careful?** to *Careful*; the word models have no "not a sign" answer.
- **Nothing happens on a laptop with a cover or an IR-only camera**: use another camera.
- **First start is slow**: the hand tracker downloads its model from this server once, then runs locally.

## Privacy reminders

Pictures are processed in the browser and never recorded or uploaded; the camera is off until **Open camera**; closing the dialog stops it. Only landmark numbers are ever stored, and only for signs you teach.

## What was not tested

A real webcam. The test browser refused camera access, so camera behaviour was tested only with a fake camera and synthetic hands (see TEST_REPORT.md). `docs/LIVE_WEBCAM_TEST_PROCEDURE.md` lists what to check by hand on a real device.