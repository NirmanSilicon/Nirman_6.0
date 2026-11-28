# SAARTHI User Guide

> **"The white cane is for the path. SAARTHI is for the table."**  
> **Developed by Team VECTORX**

SAARTHI is a **100% offline, hands-free spatial companion** designed for blind and low-vision individuals working, studying, or dining at personal workspaces (desks, study tables, and dining tables). Running entirely on a standard Android smartphone, SAARTHI watches your workspace quietly and speaks or guides you **only** when something changes or when your hand is about to miss or knock over an item.

This guide is written for both **SAARTHI users** (structured for effortless navigation with TalkBack and screen readers) and **sighted setup assistants**.

---

## Contents

- [1. Quick Start and Positioning (Zero Aiming)](#1-quick-start-and-positioning-zero-aiming)
- [2. Proactive Silence and Dual-Map Awareness](#2-proactive-silence-and-dual-map-awareness)
- [3. Understanding the Brief Flash Pulse (Torch Test)](#3-understanding-the-brief-flash-pulse-torch-test)
- [4. Closed-Loop Reach Guidance and Mid-Air Halt](#4-closed-loop-reach-guidance-and-mid-air-halt)
- [5. Privacy, Offline Guarantee, and Battery Care](#5-privacy-offline-guarantee-and-battery-care)
- [6. Troubleshooting and Permissions](#6-troubleshooting-and-permissions)
- [7. System Overview for Setup Assistants](#7-system-overview-for-setup-assistants)

---

## 1. Quick Start and Positioning (Zero Aiming)

You never need to hold your phone in one hand or aim the camera toward an object. SAARTHI works **hands-free** once your phone is resting in place.

### Step 1: Choose a Hands-Free Mount
Use either mounting style depending on your workspace:

- **Desk Stand (Recommended for Stationary Work or Dining):**
  1. Place your phone securely in a standard desk stand near the back edge or corner of your desk, facing across the surface where you place your cup, bottle, notebook, or keyboard.
  2. Angle the camera slightly downward so the main reach zone in front of you is visible.
- **Chest Mount (Recommended for Flexible Posture or Shared Tables):**
  1. Clip or secure the phone upright on a chest lanyard or mount so the rear camera faces forward and slightly downward toward the table in front of you.
  2. Ensure clothing, lanyards, or badge straps do not hang over the rear camera lens or flash.

### Step 2: Automatic Calibration (No LiDAR or ARCore Required)
1. Keep the phone still for a few seconds after opening SAARTHI or placing it on the stand.
2. SAARTHI automatically fuses the phone's **20 FPS monocular camera** with its **6-DoF inertial sensors (gravity vector and gyroscope)** to map the flat table surface in real-world metric 3D space.
3. No manual grid alignment, LiDAR scanner, or ARCore setup is required.

### Step 3: Natural Posture Without False Alarms
You do not have to sit rigidly still. SAARTHI uses a **gyro-gated steadiness filter** that distinguishes normal body movements, breathing, or minor desk bumps from real object changes—preventing false alarms when you shift in your chair.

---

## 2. Proactive Silence and Dual-Map Awareness

Existing visual assistant apps act like a "chatty camera," reading out an endless stream of labels (`cup, laptop, bottle, chair`) that drown out your hearing—or forcing you to guess that something moved and manually aim a camera to ask.

SAARTHI follows one strict rule: **100% silence by default.**

### How Dual-Map Awareness Works (Theory of Mind)
SAARTHI maintains two distinct spatial maps simultaneously on your phone:

1. **World Map (Physical Reality):** The live 3D positions of objects currently sitting on your table.
2. **Belief Map (Your Mental Map):** What you reasonably believe is on the table based on where items were placed and last interacted with.

Using a cognitive **Sally-Anne divergence check**, SAARTHI compares the World Map against your Belief Map. As long as everything matches what you expect, SAARTHI stays **completely silent**.

### When SAARTHI Speaks
SAARTHI breaks silence **only** when physical reality diverges from your mental map—specifically when a tracked object:

- **Moves silently** by more than **20 cm** (for example, a colleague slides your hot tea mug aside or shifts your water bottle while you are typing),
- **Is removed** from the table (for example, someone borrows your pen or clears a plate), or
- **Is returned** to the table in a new or familiar spot.

Once SAARTHI notifies you of the change, your mental map is updated and SAARTHI returns immediately to quiet standby.

---

## 3. Understanding the Brief Flash Pulse (Torch Test)

While using SAARTHI, you or people nearby may occasionally notice a **brief, automatic pulse from your phone's rear LED flash**. This is completely normal and intentional.

### Why SAARTHI Uses a Brief Flash Pulse
Standard camera AI models can easily be fooled by flat pictures—such as confusing a photograph of a cup on a tablet screen, magazine cover, or laptop display with a real physical object.

To prevent false alerts, SAARTHI runs **System 2 Physics Verification (the Torch Test)**:

1. When an unexpected object change needs confirmation, SAARTHI locks camera exposure and emits a quick flash pulse.
2. **Flat screens and photos** emit or reflect light uniformly across the surface.
3. **Real 3D objects** reflect active light unevenly based on depth and curvature.
4. Combined with a statistical verification check (**Wald SPRT**), SAARTHI confirms the object is physically real before speaking or guiding your hand.

> **Note:** If you are in a setting where even a brief LED pulse could be distracting (such as a dark lecture hall or meeting), keep the phone angled cleanly toward your immediate tabletop so the pulse stays focused on your desk surface.

---

## 4. Closed-Loop Reach Guidance and Mid-Air Halt

When you reach toward an item on your desk, SAARTHI tracks your hand in real time using **21 3D finger landmarks** and provides **sub-50-millisecond closed-loop audio-haptic feedback**—no hesitant sweeping across the table required.

### Directional Guidance Cues
- **Audio Beats:** Gentle directional audio cues guide your fingertip smoothly left, right, forward, or closer to your target item. Using open-ear earbuds or bone-conduction headphones keeps your ears open to your surroundings while keeping audio cues private.
- **Discreet Haptics:** Subtle vibration pulses reinforce direction and proximity without broadcasting sound in quiet classrooms or offices.
- **Adaptive Motor Bias:** Over repeated reaches, SAARTHI adapts to your personal reaching tendencies so guidance feels natural rather than mechanical.

### The Mid-Air Halt (Predictive Interception)
If you begin reaching quickly toward a spot where an object **used to be**—or toward an item that was silently shifted—SAARTHI detects the mismatch between your hand trajectory and the live World Map:

- **What happens:** SAARTHI immediately issues a distinct, urgent **mid-air halt cue** (a rapid warning tone paired with a sharp halt vibration pattern) **before** your hand lands on the table.
- **Why it matters:** Stopping mid-air prevents accidentally knocking over a relocated glass, spilling hot tea, or sweeping items onto the floor.
- **What to do when you feel or hear it:** Pause your hand mid-air, wait a brief moment for SAARTHI to announce the updated position or steer you with directional beats, and continue calmly to the real target.

### Practicing with the Cue Preview First
Before relying on SAARTHI around hot drinks or fragile items, open the **Cue Preview / Sound & Haptic Check** inside the app (when available in your build) so you can safely test and distinguish:

1. The steady **directional guidance beat and pulse** (keep moving toward the target).
2. The urgent **mid-air halt cue** (stop your hand immediately).

---

## 5. Privacy, Offline Guarantee, and Battery Care

### 100% Offline & Private by Design
- **No Internet Required:** Every vision model, 3D geometry calculation, verification test, and speech/audio engine runs locally on your smartphone.
- **Zero Cloud Uploads:** No camera images, audio, or workspace layouts ever leave your device.
- **Zero Saved Camera Frames:** Video frames are processed live in memory and immediately discarded—nothing is recorded or stored on disk.
- **No Subscriptions or Accounts:** Runs on the smartphone you already own with zero recurring service fees.

### Battery & Thermal Care
SAARTHI is engineered for standard mid-range smartphones (validated on 8-core mobile silicon such as MediaTek Dimensity 700) running a **~20 FPS perception loop** inside a sustainable **2.2W thermal envelope**:

- **Dynamic Workload Governance:** During idle periods when your hands are away from the table, background compute scales back automatically to conserve battery and keep the phone cool, while instantly restoring full 20 FPS responsiveness during active reaching.
- **Tips for Long 30+ Minute Sessions:**
  - Use a breathable desk stand rather than laying the phone flat on soft cloth or cushions, which trap heat.
  - Keep the phone out of direct sunlight hitting the back cover.
  - For all-day study or office sessions, plug the phone into a desk charger while seated in its stand.

---

## 6. Troubleshooting and Permissions

### Permissions & Audio/Haptic Setup
SAARTHI needs local hardware access only—no network, contacts, or location permissions are used for spatial guidance.

| Capability | Why SAARTHI Needs It | How to Recover if Missing or Silent |
| :--- | :--- | :--- |
| **Camera** | Maps the table surface and tracks objects and hand landmarks in real time. | Open **Android Settings > Apps > SAARTHI > Permissions > Camera** and select **Allow only while using the app**. |
| **Audio & Speech Output** | Delivers spoken divergence alerts, TalkBack compatibility, and directional audio beats. | Ensure **Media volume** and **Accessibility/TalkBack volume** are turned up, check Bluetooth headset routing, and confirm Do Not Disturb is not muting media/notifications. |
| **Vibration / Haptics** | Delivers discreet directional pulses and mid-air halt warnings. | Check **Android Settings > Sound & vibration > Vibration & haptics** and ensure touch/system vibration is enabled (not suppressed by Battery Saver). |

### Lighting, Glare & Tracking Tips
- **Too Dark:** If your room is nearly pitch dark, turn on a gentle desk lamp or room light so the passive camera can track objects clearly without relying repeatedly on the LED flash.
- **Strong Glare:** On highly glossy glass or polished wooden tables directly beneath a bright overhead spotlight, shifting your stand slightly to the side reduces harsh specular reflections.
- **Clean Lens:** Wipe fingerprints off the rear camera lens if detections feel sluggish or inaccurate.
- **Clear Camera View:** Make sure sleeves, laptop lids, or stand clips do not block the bottom edge of the camera frame where your hands enter the table area.

### Resetting and Re-Anchoring the Workspace Map
Re-anchor SAARTHI's workspace map whenever you:

- Move to a new desk or dining table,
- Significantly rotate or reposition the desk stand or chest mount, or
- Completely rearrange the items on your table.

**How to re-anchor cleanly:**
1. Place the phone firmly back in its stand or mount facing the table.
2. Keep your hands clear of the table surface for 2 to 3 seconds and trigger the app's **Reset / Re-Anchor Workspace** control (or pause and resume the session from the main screen).
3. Wait for the confirmation cue before placing or reaching for items.

### Quick Troubleshooting Table

| Symptom | Likely Cause | Recommended Action |
| :--- | :--- | :--- |
| **No spoken alerts when an item moves** | Item moved less than 20 cm, media volume is muted, or camera view is blocked. | Check media/TalkBack volume, verify Camera permission, and confirm the object is visible in the camera's tabletop zone. |
| **Alerts fire right after bumping the stand** | Stand moved far enough to shift the table plane reference. | Let the phone settle for 2–3 seconds; if the camera angle changed noticeably, reset/re-anchor the workspace map. |
| **Guidance feels offset left or right** | Phone rotated on the stand or chest mount after initial anchoring. | Straighten the mount and trigger a workspace map reset/re-anchor. |
| **Halt cue triggers unexpectedly** | Hand entered rapidly over an empty space or moved item, or bright glare masked an object. | Pause mid-air, adjust overhead glare if needed, and wait for the updated position cue. |
| **Phone feels warm after long use** | Heavy thick case, direct sunlight, or soft surface blocking airflow. | Place the phone in an open desk stand away from direct heat/sunlight; close unused background apps. |

---

## 7. System Overview for Setup Assistants

Sighted assistants helping configure SAARTHI can use this summary to understand the 4-stage pipeline at a glance:

| Stage | Module | Role on the Device |
| :--- | :--- | :--- |
| **1. Sensory Input** | 20 FPS Monocular Camera + 6-DoF IMU + MediaPipe GPU + EfficientDet | Maps tabletop geometry in metric 3D space (no ARCore) and tracks 21 3D finger landmarks. |
| **2. Theory of Mind** | Dual State Tracking + Sally-Anne Divergence Engine | Compares physical **World Map** vs. user **Belief Map**; stays silent until divergence exceeds 20 cm. |
| **3. Physics Verification** | Active Torch Test + Wald SPRT | Pulses locked-exposure LED flash to distinguish real 3D objects from flat screen photos before speaking. |
| **4. Motor Action** | Trajectory Kinematics + Audio/Haptic Engine | Outputs sub-50 ms directional audio beats, discreet haptics, adaptive motor bias, and mid-air halt interception. |
