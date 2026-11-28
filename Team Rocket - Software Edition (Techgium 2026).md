Folder Structure:

StreamWise/

│

├── CLAUDE.md

├── README.md

│

├── docs/

│ ├── ARCHITECTURE.md

│ ├── API_CONTRACTS.md

│ ├── DEVELOPMENT_GUIDELINES.md

│ ├── GLOSSARY.md

│ └── TESTING_STRATEGY.md

│

├── logs/

│ ├── person_1/

│ │ ├── DEVELOPMENT_LOG.md

│ │ ├── AI_WORKFLOW_LOG.md

│ │ └── TECHNICAL_NOTES.md

│ │

│ ├── person_2/

│ │ ├── DEVELOPMENT_LOG.md

│ │ ├── AI_WORKFLOW_LOG.md

│ │ └── TECHNICAL_NOTES.md

│ │

│ ├── person_3/

│ │ ├── DEVELOPMENT_LOG.md

│ │ ├── AI_WORKFLOW_LOG.md

│ │ └── TECHNICAL_NOTES.md

│ │

│ └── person_4/

│ ├── DEVELOPMENT_LOG.md

│ ├── AI_WORKFLOW_LOG.md

│ └── TECHNICAL_NOTES.md

### What each document must contain

| **Document**         | **Mandatory contents**                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `DEVELOPMENT_LOG.md` | Daily work, files modified, features completed, bugs, tests and pending tasks                                        |
| ---                  | ---                                                                                                                  |
| `AI_WORKFLOW_LOG.md` | Prompts given to Claude or other agents, instructions, generated code reviewed, rejected suggestions and corrections |
| ---                  | ---                                                                                                                  |
| `TECHNICAL_NOTES.md` | Technical terms used, definitions, libraries, algorithms, decisions, assumptions and things learned                  |
| ---                  | ---                                                                                                                  |

The shared files have different responsibilities:

- CLAUDE.md: Instructions every coding agent must follow.
- DEVELOPMENT_GUIDELINES.md: Coding conventions, architecture rules, Git workflow and ownership.
- API_CONTRACTS.md: Agreed communication between modules.
- GLOSSARY.md: Shared project terminology.
- TESTING_STRATEGY.md: What must be tested and how.

**Rule:** If an AI agent changes code, the responsible team member reviews it, runs the relevant tests and records the work. AI-generated code does not count as completed work until verified.

<br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>

# StreamWise — Project Development Guidelines

**Project:** StreamWise  
**Product:** Intelligent Video Streaming Platform  
**Initial Application Domain:** Educational Video Streaming  
**Team Size:** 4  
**Development Deadline:** 27 November 2026

# 1. Project Overview

StreamWise is an intelligent video streaming platform that optimizes video quality allocation based on:

- Visual content and complexity.
- Contextual importance of video segments.
- Viewer preferences.
- Real-time network conditions.
- Available bandwidth and playback buffer.

Education is the initial application domain used to demonstrate and validate the system. The architecture must remain extensible to other video categories and applications.

## Core objective

Develop a system that intelligently allocates available bandwidth across upcoming video segments to preserve important visual information while maintaining smooth playback.

The system must demonstrate a measurable difference between conventional Adaptive Bitrate (ABR) streaming and StreamWise's content-aware allocation approach.

# 2. Fundamental Development Principles

Every team member must follow these principles.

### 2.1 Build modularly

- Every module must have a clearly defined responsibility.
- Avoid unnecessary dependencies between modules.
- Modules must communicate through documented interfaces.
- Do not implement another member's functionality independently without coordination.
- Avoid creating monolithic files that combine unrelated responsibilities.

### 2.2 Preserve architectural consistency

- Follow the existing repository structure.
- Reuse existing implementations wherever possible.
- Do not replace working functionality without a documented reason.
- Discuss architectural changes with the team before implementing them.
- Do not introduce unnecessary frameworks, libraries, or services.

### 2.3 Prioritize functionality over complexity

- Implement a working baseline before advanced features.
- Prefer understandable and testable algorithms.
- Avoid unnecessary machine learning models.
- Do not introduce complex features simply to make the project appear more advanced.
- Every implemented feature must contribute to the core objective.

### 2.4 Do not fabricate functionality

- Never display simulated results as actual algorithm outputs.
- Clearly distinguish estimated values from measured values.
- Do not claim that a quality decision was applied unless playback actually followed it.
- Record limitations honestly.
- Every demonstration must be reproducible.

# 3. System Architecture

The project is organized into six major modules.

| **Module**                        | **Responsibility**                                              |
| --------------------------------- | --------------------------------------------------------------- |
| Video Ingestion & Processing      | Upload, validation, metadata extraction, transcoding and HLS    |
| ---                               | ---                                                             |
| Content Understanding Engine      | Scene detection, visual complexity, OCR and contextual analysis |
| ---                               | ---                                                             |
| Viewer Preference Engine          | User-selected viewing priorities                                |
| ---                               | ---                                                             |
| Network Intelligence              | Throughput, bandwidth, buffer and network monitoring            |
| ---                               | ---                                                             |
| Adaptive Quality Decision Engine  | Quality utility estimation and rolling-window allocation        |
| ---                               | ---                                                             |
| Streaming Experience & Evaluation | Playback, interface, ABR comparison and metrics                 |
| ---                               | ---                                                             |

## Architecture rules

1. Video processing must not depend on educational content classification.
2. Content analysis must produce structured metadata, not playback decisions.
3. The decision engine must not be tightly coupled to specific video formats.
4. Network intelligence must provide measurable network information.
5. Playback must be able to receive and execute quality decisions.
6. The evaluation interface must display actual system measurements.
7. All modules must use agreed data structures and API contracts.

## Extensibility requirement

The initial implementation will prioritize educational content, including:

- Classroom lectures and presentations.
- Screen-recorded technical tutorials.
- Animated educational explainers.

Do not hardcode the entire system around these three categories. Format-specific analyzers should be optional capabilities within a shared content-analysis architecture.

# 4. Coding Standards

## 4.1 General rules

- Write readable, maintainable code.
- Use meaningful variable, function and class names.
- Avoid unnecessarily long functions.
- Separate business logic from API routes and interface components.
- Handle exceptions explicitly.
- Remove unused imports, temporary code and debugging statements.
- Add comments where the implementation is not self-explanatory.
- Avoid duplicate implementations of existing functionality.

## 4.2 Python / Backend

- Follow PEP 8 conventions.
- Use type hints wherever practical.
- Use Pydantic schemas for API validation.
- Keep API routes separate from business logic.
- Use asynchronous functions appropriately.
- Avoid blocking operations inside asynchronous endpoints.
- Use pathlib for filesystem paths.
- Use safe subprocess argument lists; do not construct shell commands from user input.
- Handle file cleanup and processing failures.
- Keep configuration in environment variables or the existing configuration system.
- Never hardcode API keys, credentials or machine-specific paths.

## 4.3 React / Frontend

- Use reusable components.
- Keep API communication separate from presentation logic.
- Maintain consistent naming conventions.
- Handle loading, empty, success and error states.
- Avoid unnecessary component complexity.
- Do not hardcode backend responses as production data.
- Keep playback state and quality-decision state synchronized.
- Display units clearly for bitrate, bandwidth and buffer values.

## 4.4 Video processing

- Preserve the original uploaded source.
- Avoid unnecessary upscaling.
- Maintain aspect ratio.
- Ensure valid video dimensions and codecs.
- Maintain aligned timestamps and segment boundaries across renditions.
- Validate generated playlists and segments.
- Preserve audio where available.
- Do not assume that generating HLS playlists automatically enables arbitrary per-segment rendition switching.

# 5. Adaptive Quality Decision Engine Rules

The decision engine is the central technical component of StreamWise.

Its inputs may include:

- Segment-level visual complexity.
- Text and visual information density.
- Contextual importance.
- Viewer preferences.
- Available rendition bitrates.
- Estimated network throughput.
- Playback buffer occupancy.
- Previous rendition selection.

## Required approach

The initial implementation should use:

1. Normalized segment priority scoring.
2. Quality utility estimation for available renditions.
3. Marginal-utility-based greedy allocation.
4. Rolling-window optimization.
5. Bandwidth and buffer constraints.
6. Resolution-switching penalties.
7. Explainable allocation decisions.

## Important restrictions

- High-priority segments must not automatically receive the highest resolution.
- Never exceed the defined bandwidth budget intentionally.
- Do not ignore buffer health.
- Avoid unnecessary resolution oscillation.
- Keep the allocation algorithm independent of the frontend.
- Record the reason behind every quality decision.
- Make optimization parameters configurable.

## Evaluation

The system must be compared against conventional ABR under equivalent network conditions.

Do not manipulate the baseline to make StreamWise appear better.

# 6. API and Module Communication Rules

All team members must agree on data contracts before implementing integrations.

Every API or module interface must document:

- Input structure.
- Output structure.
- Data types.
- Required and optional fields.
- Units of measurement.
- Error responses.
- Expected behavior.

## Common conventions

- Use consistent JSON naming.
- Use seconds for timestamps.
- Use Mbps consistently for network throughput.
- Clearly document whether bitrate values are expressed in kbps or Mbps.
- Use stable video and segment identifiers.
- Keep segment numbering consistent across renditions.
- Include timestamps for segment alignment.
- Validate incoming data.

Do not independently change a shared API contract. Inform affected team members and update the documentation.

# 7. AI Agent and Claude Usage Guidelines

All team members may use Claude, ChatGPT, coding agents or other AI development tools.

However, AI-generated code must follow the same standards as manually written code.

## 7.1 Before assigning a task to an AI agent

Provide:

1. Project overview.
2. Existing repository structure.
3. Relevant architecture documentation.
4. The specific module being modified.
5. Expected functionality.
6. Files the agent is permitted to modify.
7. Required interfaces.
8. Testing requirements.
9. Explicit restrictions.

Do not ask an AI agent to build the entire project in one prompt.

## 7.2 While using AI agents

- Work on one clearly defined task at a time.
- Ask the agent to inspect existing code before modifying it.
- Require it to explain its implementation approach.
- Do not allow unnecessary restructuring.
- Do not allow it to overwrite unrelated modules.
- Ask it to identify dependencies before installing packages.
- Require error handling and tests.
- Review all generated code.
- Verify that the implementation follows existing project conventions.

## 7.3 After receiving generated code

The responsible team member must:

1. Inspect the modified files.
2. Understand the implementation.
3. Check for unintended changes.
4. Run relevant tests.
5. Test the actual functionality.
6. Review error handling.
7. Update documentation.
8. Record the AI interaction in AI_WORKFLOW_LOG.md.

AI-generated code is not considered completed until it has been reviewed and tested.

## 7.4 Instructions for Claude and other coding agents

Every agent must:

- Read CLAUDE.md and relevant project documentation before working.
- Respect module ownership.
- Follow existing naming and coding conventions.
- Avoid modifying unrelated files.
- Never invent API endpoints or data fields.
- Never silently replace existing functionality.
- Report all files created, modified and deleted.
- Report dependencies introduced.
- Report tests executed and their results.
- Clearly identify incomplete functionality.
- Never claim that tests passed without actually running them.

# 8. Git and Version Control Guidelines

## Branching

Each member must work on an individual feature branch.

Suggested branches:

- feature/video-infrastructure
- feature/content-analysis
- feature/quality-optimizer
- feature/player-dashboard

## Commit conventions

Use descriptive commit messages.

Examples:

- feat: implement HLS segmentation
- fix: correct segment timestamp alignment
- test: add optimizer bandwidth constraint tests
- docs: update API contracts

## Rules

- Never push unfinished work directly to main.
- Commit after completing meaningful functionality.
- Pull the latest shared changes before integration.
- Review changes before merging.
- Do not commit generated videos, temporary files, credentials or unnecessary storage artifacts.
- Resolve merge conflicts carefully.
- Never overwrite another member's work without coordination.

# 9. Testing and Quality Assurance

Every module must include tests.

## Video infrastructure

- Valid video upload.
- Invalid file rejection.
- Metadata extraction.
- Transcoding success and failure.
- Rendition validation.
- HLS playlist validation.
- Segment alignment.

## Content analysis

- Scene detection.
- OCR output validation.
- Visual complexity calculations.
- Missing or invalid frame handling.
- Segment metadata generation.
- Different educational video samples.

## Decision engine

- Priority score calculation.
- Quality utility estimation.
- Bandwidth constraints.
- Buffer constraints.
- Rolling-window allocation.
- Resolution-switching penalties.
- Missing metadata handling.

## Frontend and playback

- Video upload.
- HLS playback.
- Resolution changes.
- Network simulation.
- StreamWise decision execution.
- Conventional ABR playback.
- Metric recording and display.

## Testing rules

- Do not delete existing tests simply because they fail.
- Investigate failures before changing implementations.
- Test edge cases, not only ideal conditions.
- Record the test command and result.
- Never mark an untested feature as complete.

# 10. Documentation and Individual Logs

Every team member must maintain three separate documents.

Each person's documentation must be committed to the shared repository.

## 10.1 DEVELOPMENT_LOG.md

Record:

- Date and working hours.
- Tasks assigned.
- Work completed.
- Files created or modified.
- Features implemented.
- Bugs encountered.
- Bugs resolved.
- Tests executed.
- Test results.
- Pending work.
- Blockers and dependencies.

## 10.2 AI_WORKFLOW_LOG.md

Record:

- AI tool used.
- Task assigned.
- Exact prompts or relevant prompt excerpts.
- Files modified by the agent.
- Suggestions accepted.
- Suggestions rejected.
- Changes made after reviewing generated code.
- Errors encountered.
- Tests performed after AI-generated changes.

## 10.3 TECHNICAL_NOTES.md

Record:

- Technical terms encountered.
- Definitions and explanations.
- Libraries and frameworks used.
- Algorithms implemented.
- Important configuration choices.
- Architectural decisions.
- Assumptions.
- Known limitations.
- Concepts learned during development.

## Shared documentation

The repository must also maintain:

- CLAUDE.md
- README.md
- ARCHITECTURE.md
- API_CONTRACTS.md
- DEVELOPMENT_GUIDELINES.md
- GLOSSARY.md
- TESTING_STRATEGY.md

# 11. Team Collaboration and Ownership

Each module has one primary owner.

| **Person** | **Ownership**                     |
| ---------- | --------------------------------- |
| Person 1   | Video Infrastructure              |
| ---        | ---                               |
| Person 2   | Content Understanding             |
| ---        | ---                               |
| Person 3   | Decision Intelligence             |
| ---        | ---                               |
| Person 4   | Frontend, Playback and Evaluation |
| ---        | ---                               |

## Ownership rules

- Owners are responsible for implementation, testing and documentation.
- Other members may contribute, but must coordinate with the owner.
- Integration problems must be reported immediately.
- Shared contracts must be respected.
- Do not wait until the final day to report blockers.
- Every member must demonstrate their work daily.

## Daily progress reporting

At the end of each working day, every member must report:

1. What was completed?
2. What is currently working?
3. What remains incomplete?
4. What tests were performed?
5. What blockers exist?
6. What will be completed next?

# 12. Deadline and Feature Freeze

**November 25:** Module development and interface agreement.

**November 26:** Module integration and end-to-end testing.

**November 27:** Bug fixing, stabilization, validation and feature freeze.

By the end of November 27, the team must have:

- A working video ingestion pipeline.
- Multiple valid video renditions.
- Valid HLS playback.
- Segment-level content analysis.
- A functional quality allocation algorithm.
- Network-aware decision-making.
- Actual playback controlled by StreamWise decisions.
- A conventional ABR baseline.
- A working comparison interface.
- Reproducible measurements.

New features must not be introduced after the feature freeze unless they resolve a critical defect.

# 13. Definition of Done

A feature is complete only when:

- Its implementation exists.
- Its expected behavior is documented.
- It follows the agreed architecture.
- Relevant tests pass.
- It has been tested in the actual application where applicable.
- Errors are handled.
- Documentation is updated.
- The responsible member understands the implementation.
- Changes are committed to the appropriate branch.

A feature that only works in an isolated script but has not been integrated is not considered complete.

# 14. Final Team Principle

StreamWise is a collaborative engineering project, not four independent coding assignments.

Every member is responsible for the quality of their own module and the reliability of the complete system.

**Build modularly. Integrate early. Test continuously. Document everything. Never present simulated functionality as a working implementation.**

# **STREAMWISE — PROJECT REFERENCE & PROGRESS TRACKER**

**Project:** StreamWise  
**Product:** Intelligent Video Streaming Platform  
**Initial Use Case:** Educational Video Streaming  
**Team Size:** 4 Members  
**Development Deadline:** 27 November 2026  
**Hackathon:** 28 November 2026

**Document purpose:** Central reference for project scope, responsibilities, implementation progress, deliverables and remaining work.

# **1\. PROJECT OVERVIEW**

## **What is StreamWise?**

StreamWise is an intelligent video streaming platform that dynamically allocates video quality based on:

- Visual content and complexity.
- Contextual importance of video segments.
- Viewer preferences.
- Real-time network conditions.
- Available bandwidth and playback buffer.

Education is the initial application domain used to demonstrate the platform's capabilities. The architecture is intended to support other video categories in the future.

## **Core objective**

Instead of assigning video quality based only on network conditions, StreamWise analyzes video content and intelligently distributes available bandwidth across upcoming segments.

**Our central technical contribution:** Content-aware, context-aware, rolling-window adaptive quality allocation.

## **Initial video categories**

The prototype will prioritize:

1. Classroom lectures and presentation videos.
2. Screen-recorded technical tutorials.
3. Animated educational explainers.

The system should not be hardcoded exclusively for these formats.

# **2\. HOW STREAMWISE WORKS**

The overall workflow:

1. A user uploads a video.
2. The system validates and processes it.
3. The video is transcoded into multiple resolutions.
4. HLS segments and playlists are generated.
5. The Content Understanding Engine analyzes video segments.
6. The Viewer Preference Engine provides user-selected priorities.
7. Network Intelligence monitors available network conditions.
8. The Decision Engine estimates the utility of available resolutions.
9. A rolling-window optimizer allocates quality across upcoming segments.
10. The playback controller executes the selected quality decisions.
11. The system records performance metrics and compares its results against conventional ABR.

## **Core architecture**

| **Module**                            | **Purpose**                                                   |
| ------------------------------------- | ------------------------------------------------------------- |
| 1\. Video Ingestion & Processing      | Upload, validation, metadata, transcoding and HLS             |
| ---                                   | ---                                                           |
| 2\. Content Understanding Engine      | Visual analysis, scene detection, OCR and contextual analysis |
| ---                                   | ---                                                           |
| 3\. Viewer Preference Engine          | User-selected viewing priorities                              |
| ---                                   | ---                                                           |
| 4\. Network Intelligence              | Bandwidth, throughput, buffer and network monitoring          |
| ---                                   | ---                                                           |
| 5\. Adaptive Quality Decision Engine  | Quality utility estimation and bandwidth allocation           |
| ---                                   | ---                                                           |
| 6\. Streaming Experience & Evaluation | Player, interface, conventional ABR comparison and metrics    |
| ---                                   | ---                                                           |

# **3\. TEAM RESPONSIBILITIES**

Each module has one primary owner. Members may assist one another, but ownership must remain clear.

## **PERSON 1 — VIDEO INFRASTRUCTURE**

**Module:** Video Ingestion & Processing

### **Responsibilities**

- Maintain video upload and validation.
- Extract video metadata using FFprobe.
- Generate 360p, 480p and 720p renditions.
- Maintain aspect ratio and avoid unnecessary upscaling.
- Generate aligned HLS segments.
- Generate master and variant playlists.
- Validate segment timestamps and rendition alignment.
- Provide playback and segment metadata interfaces.
- Coordinate playback requirements with Person 4.

### **Deliverables**

- Working video upload pipeline.
- Video validation and metadata extraction.
- Multi-resolution transcoding.
- HLS segmentation.
- Valid master and variant playlists.
- Segment alignment validation.
- Playback integration contract.
- Automated tests.

## **PERSON 2 — CONTENT UNDERSTANDING**

**Module:** Content Understanding Engine

### **Responsibilities**

- Extract representative frames from video segments.
- Detect scene changes.
- Calculate visual complexity.
- Perform OCR and calculate text density.
- Identify relevant visual details such as diagrams, graphs and code-like regions where feasible.
- Generate contextual importance scores for the initial educational use case.
- Produce structured segment-level metadata.
- Coordinate the metadata contract with Person 3.

### **Initial implementation priorities**

1. Scene detection.
2. Visual complexity analysis.
3. OCR and text density.
4. Contextual importance scoring.

### **Deliverables**

- Scene detection implementation.
- Frame extraction.
- Visual complexity analysis.
- OCR/text density analysis.
- Contextual importance scoring.
- Segment metadata JSON.
- Analysis interface/API.
- Tests using representative educational videos.

## **PERSON 3 — DECISION INTELLIGENCE**

**Module:** Adaptive Quality Decision Engine

### **Responsibilities**

- Define the segment priority calculation.
- Implement quality utility estimation.
- Consider visual complexity and contextual importance.
- Incorporate viewer preferences.
- Estimate the benefit of each available rendition.
- Implement rolling-window allocation.
- Use marginal-utility-based greedy optimization initially.
- Enforce bandwidth and buffer constraints.
- Penalize unnecessary resolution switching.
- Generate explainable quality decisions.
- Coordinate decision integration with Person 4.

### **Deliverables**

- Segment priority scoring.
- Quality utility estimator.
- Rolling-window optimizer.
- Bandwidth constraint handling.
- Buffer-aware allocation.
- Resolution-switching penalty.
- Decision API/callable service.
- Decision explanations.
- Unit tests.

## **PERSON 4 — FRONTEND, PLAYBACK & EVALUATION**

**Module:** Streaming Experience & Evaluation

### **Responsibilities**

- Build the React frontend.
- Implement video upload interface.
- Integrate HLS playback.
- Integrate StreamWise quality decisions.
- Implement/configure conventional ABR baseline.
- Implement network simulation controls.
- Display current resolution and bitrate.
- Display network throughput and buffer health.
- Visualize segment-level quality allocation.
- Explain why StreamWise selected a particular rendition.
- Record performance metrics.
- Coordinate end-to-end integration.

### **Deliverables**

- Functional frontend.
- Video upload interface.
- Working HLS player.
- Conventional ABR mode.
- StreamWise playback mode.
- Network simulation.
- Quality allocation timeline.
- Playback metrics.
- Comparison dashboard.
- End-to-end integration tests.

# **4\. CURRENT PROJECT PROGRESS**

**Important:** The following status is based on the implementation reports available before this tracker was created. It is not a fresh repository audit. Every reported completion must be verified against the current code before being marked fully complete.

## **Module 1 — Video Infrastructure**

| **Component**                | **Current status**   | **Notes**                                                             |
| ---------------------------- | -------------------- | --------------------------------------------------------------------- |
| FastAPI foundation           | Reported complete    | Health endpoint reportedly working                                    |
| ---                          | ---                  | ---                                                                   |
| Video upload                 | Reported complete    | Upload API implemented                                                |
| ---                          | ---                  | ---                                                                   |
| File validation              | Reported complete    | Supported formats and size validation                                 |
| ---                          | ---                  | ---                                                                   |
| FFprobe metadata             | Reported complete    | Metadata extraction implemented                                       |
| ---                          | ---                  | ---                                                                   |
| Multi-resolution transcoding | Reported complete    | 360p, 480p, 720p                                                      |
| ---                          | ---                  | ---                                                                   |
| HLS segmentation             | Pending verification | Implementation prompt was issued; completion report not yet confirmed |
| ---                          | ---                  | ---                                                                   |
| Rendition alignment          | Pending verification | Must validate timestamps and segment boundaries                       |
| ---                          | ---                  | ---                                                                   |
| Playback integration         | Pending              | Must coordinate with Person 4                                         |
| ---                          | ---                  | ---                                                                   |

**Previously reported tests:** 11 upload/foundation tests and 13 transcoding tests passed. These results must be rerun against the current repository.

## **Module 2 — Content Understanding**

| **Component**                 | **Current status**          |
| ----------------------------- | --------------------------- |
| Scene detection               | Not started / not confirmed |
| ---                           | ---                         |
| Frame extraction              | Not started / not confirmed |
| ---                           | ---                         |
| Visual complexity analysis    | Not started / not confirmed |
| ---                           | ---                         |
| OCR/text density              | Not started / not confirmed |
| ---                           | ---                         |
| Contextual importance scoring | Not started / not confirmed |
| ---                           | ---                         |
| Structured segment metadata   | Not started / not confirmed |
| ---                           | ---                         |
| Analysis API                  | Not started / not confirmed |
| ---                           | ---                         |

## **Module 3 — Decision Intelligence**

| **Component**               | **Current status** |
| --------------------------- | ------------------ |
| Priority scoring            | Planned            |
| ---                         | ---                |
| Quality utility estimation  | Planned            |
| ---                         | ---                |
| Rolling-window optimization | Planned            |
| ---                         | ---                |
| Greedy allocation           | Planned            |
| ---                         | ---                |
| Bandwidth constraints       | Planned            |
| ---                         | ---                |
| Buffer constraints          | Planned            |
| ---                         | ---                |
| Switching penalties         | Planned            |
| ---                         | ---                |
| Decision API                | Planned            |
| ---                         | ---                |
| Unit tests                  | Planned            |
| ---                         | ---                |

## **Module 4 — Network Intelligence**

| **Component**                 | **Current status** |
| ----------------------------- | ------------------ |
| Throughput estimation         | Not confirmed      |
| ---                           | ---                |
| Network monitoring            | Not confirmed      |
| ---                           | ---                |
| Buffer monitoring             | Not confirmed      |
| ---                           | ---                |
| Network simulation            | Planned            |
| ---                           | ---                |
| Network condition integration | Planned            |
| ---                           | ---                |

## **Module 5 — Streaming Experience & Evaluation**

| **Component**                | **Current status**                   |
| ---------------------------- | ------------------------------------ |
| React frontend               | Existing project foundation to audit |
| ---                          | ---                                  |
| HLS playback                 | Not confirmed                        |
| ---                          | ---                                  |
| StreamWise playback control  | Not confirmed                        |
| ---                          | ---                                  |
| Conventional ABR baseline    | Planned                              |
| ---                          | ---                                  |
| Network simulation interface | Planned                              |
| ---                          | ---                                  |
| Quality timeline             | Planned                              |
| ---                          | ---                                  |
| Performance dashboard        | Planned                              |
| ---                          | ---                                  |
| ABR comparison               | Planned                              |
| ---                          | ---                                  |

# **5\. OVERALL PROJECT STATUS**

## **Current assessment**

**Development phase:** Core infrastructure partially implemented; intelligence and playback integration remain to be built or verified.

| **Area**              | **Assessment**        |
| --------------------- | --------------------- |
| Backend foundation    | Reported implemented  |
| ---                   | ---                   |
| Video upload          | Reported implemented  |
| ---                   | ---                   |
| Transcoding           | Reported implemented  |
| ---                   | ---                   |
| HLS                   | Awaiting verification |
| ---                   | ---                   |
| Content understanding | Pending               |
| ---                   | ---                   |
| Decision intelligence | Pending               |
| ---                   | ---                   |
| Network intelligence  | Pending verification  |
| ---                   | ---                   |
| Frontend/playback     | Pending verification  |
| ---                   | ---                   |
| Evaluation            | Pending               |
| ---                   | ---                   |

**Overall completion percentage: Not yet established.**

We should not assign an arbitrary percentage based on the number of files or modules created. Completion should be measured against working, tested and integrated deliverables.

After the initial repository audit, calculate:

```
Verified completed acceptance criteria / Total required acceptance criteria × 100
```

A component only counts as complete when its implementation, tests and required integration are verified.

# **6\. DEVELOPMENT MILESTONES**

## **November 25 — Module Development**

**Goal:** Each person produces a functional standalone module.

- Confirm module ownership.
- Finalize API contracts.
- Verify existing video infrastructure.
- Implement content analysis.
- Implement quality allocation.
- Develop frontend and playback integration.
- Demonstrate standalone functionality.
- Update individual development logs.

**Expected outcome:** All modules have working interfaces and demonstrable progress.

## **November 26 — Integration**

**Goal:** Complete the end-to-end workflow.

- Connect video processing and content analysis.
- Connect analysis and decision engine.
- Connect decision engine and playback.
- Integrate network intelligence.
- Implement conventional ABR baseline.
- Test actual StreamWise-controlled playback.
- Record initial performance measurements.

**Expected outcome:** At least one educational video works through both streaming modes.

## **November 27 — Stabilization and Feature Freeze**

**Goal:** Have a reliable demonstration-ready prototype.

- Fix critical integration issues.
- Verify HLS segment alignment.
- Validate quality allocation.
- Test network fluctuations.
- Test multiple educational video samples.
- Verify metric recording.
- Prepare reproducible demonstrations.
- Update documentation.
- Freeze new features.

**Expected outcome:** 80–90% of the agreed MVP functionality is complete and demonstrable.

## **November 28 — Hackathon**

Primary focus:

- Demonstration preparation.
- Conventional ABR versus StreamWise comparison.
- Visual presentation of actual results.
- Performance evaluation.
- Technical explanation.
- Final reliability fixes.

# **7\. END-TO-END ACCEPTANCE CHECKLIST**

The following workflow defines the minimum demonstrable product.

- Upload an educational video.
- Validate and extract metadata.
- Generate multiple resolutions.
- Generate aligned HLS segments.
- Analyze video segments.
- Generate segment-level metadata.
- Calculate segment priority and quality utility.
- Obtain network conditions.
- Allocate quality across upcoming segments.
- Apply decisions to actual playback.
- Record selected rendition for each segment.
- Run conventional ABR on the same video.
- Compare both systems under equivalent network conditions.
- Display actual results in the interface.

**The prototype is not considered end-to-end complete until both streaming modes work and the recorded decisions match actual playback.**

# **8\. EVALUATION METRICS**

The team must collect measurable results for both conventional ABR and StreamWise.

| **Metric**                | **Purpose**                                          |
| ------------------------- | ---------------------------------------------------- |
| Total bandwidth consumed  | Measure resource usage                               |
| ---                       | ---                                                  |
| Average bitrate           | Compare streaming quality allocation                 |
| ---                       | ---                                                  |
| Rebuffering ratio         | Measure playback interruptions                       |
| ---                       | ---                                                  |
| Average visual quality    | Evaluate overall quality                             |
| ---                       | ---                                                  |
| Important-content quality | Evaluate quality preservation for important segments |
| ---                       | ---                                                  |
| Text readability          | Evaluate preservation of educational details         |
| ---                       | ---                                                  |
| Decision latency          | Measure optimization overhead                        |
| ---                       | ---                                                  |
| Resolution switching      | Measure adaptation stability                         |
| ---                       | ---                                                  |

All experiments should use equivalent videos and controlled network conditions.

# **9\. INDIVIDUAL DOCUMENTATION REQUIREMENTS**

Every team member must maintain:

**DEVELOPMENT_LOG.md**

- Daily progress.
- Files modified.
- Features completed.
- Bugs and resolutions.
- Tests and results.
- Remaining work.

**AI_WORKFLOW_LOG.md**

- AI tools used.
- Prompts provided.
- Files modified by AI.
- Suggestions accepted or rejected.
- Human review and corrections.
- Tests after AI-generated changes.

**TECHNICAL_NOTES.md**

- Technical terminology.
- Libraries and frameworks.
- Algorithms.
- Implementation decisions.
- Assumptions and limitations.
- Concepts learned.

Shared documentation:

- CLAUDE.md
- README.md
- ARCHITECTURE.md
- API_CONTRACTS.md
- DEVELOPMENT_GUIDELINES.md
- GLOSSARY.md
- TESTING_STRATEGY.md

# **10\. DAILY PROGRESS UPDATE TEMPLATE**

Every team member must update their progress at the end of each working day.

| **Field**          | **Update** |
| ------------------ | ---------- |
| Member             |            |
| ---                | ---        |
| Date               |            |
| ---                | ---        |
| Module             |            |
| ---                | ---        |
| Tasks assigned     |            |
| ---                | ---        |
| Tasks completed    |            |
| ---                | ---        |
| Tasks in progress  |            |
| ---                | ---        |
| Tasks pending      |            |
| ---                | ---        |
| Files modified     |            |
| ---                | ---        |
| Tests executed     |            |
| ---                | ---        |
| Test results       |            |
| ---                | ---        |
| Blockers           |            |
| ---                | ---        |
| Next day's targets |            |
| ---                | ---        |

## **Team integration report**

The integration coordinator should also record:

- Modules successfully connected.
- Interfaces still pending.
- Integration failures.
- Critical bugs.
- Features that are not yet demonstrable.
- Current end-to-end acceptance status.

# **11\. DEFINITION OF COMPLETE**

A task is marked COMPLETE only when:

1. Implementation is finished.
2. Code has been reviewed.
3. Relevant tests pass.
4. Actual functionality has been verified.
5. Required interfaces work.
6. Documentation is updated.
7. Changes are committed to the repository.

Use these status labels consistently:

- **NOT STARTED** — No implementation has begun.
- **IN PROGRESS** — Implementation is underway.
- **BLOCKED** — Work cannot continue due to a dependency or issue.
- **IMPLEMENTED** — Code exists but has not passed full verification.
- **TESTED** — Tests have passed, but integration may remain.
- **COMPLETE** — Implementation, testing and required integration are verified.

# **12\. TEAM OPERATING PRINCIPLE**

StreamWise is one integrated product, not four independent coding assignments.

Every member is responsible for their own module, its documentation, its tests and its integration.

**Build modularly. Integrate early. Test continuously. Record progress honestly.**

The goal is not to have the most code by November 27.

The goal is to have a working intelligent streaming platform that can demonstrate, with real measurements, why its quality allocation approach is different from conventional ABR.

**Last updated:** 25 November 2026  
**Document owner:** StreamWise Team  
**Update frequency:** At least once per day

**Primary responsibility:** Make videos streamable and ensure the player can access individual renditions and aligned segments.

**Existing work to verify**

- Upload API and validation.
- FFprobe metadata extraction.
- Multi-resolution transcoding.

**New responsibilities**

1. Verify the existing upload and transcoding implementation.
2. Complete HLS segmentation if it is not finished.
3. Ensure 360p, 480p and 720p segments have aligned timestamps and boundaries.
4. Generate master and variant playlists.
5. Expose APIs for segment metadata, rendition information and HLS status.
6. Investigate and implement the playback interface required for external quality decisions.
7. Test playback across all generated renditions.

**Deliverables by November 27**

- Working upload-to-HLS pipeline.
- Valid HLS playlists and segments.
- Machine-readable segment/rendition metadata.
- Documented playback integration contract.
- Automated tests for processing and segmentation.

## **Decision Intelligence**

Core research contribution

**Primary responsibility:** Convert content understanding and network conditions into actual quality allocation decisions.

This person owns the central StreamWise algorithm.

**Responsibilities**

1. Define the segment metadata input contract with Person 2.
2. Implement the quality utility estimator.
3. Calculate segment priority using content information and viewer preferences.
4. Estimate the quality benefit of each available rendition.
5. Implement rolling-window bitrate allocation.
6. Enforce bandwidth and buffer constraints.
7. Penalize unnecessary resolution switching.
8. Produce an explainable decision for each segment.
9. Expose an API or callable service for the playback controller.

**Recommended initial algorithm**

- Weighted segment priority scoring.
- Marginal-utility-based greedy allocation.
- Rolling allocation window.
- Network safety margin and buffer constraints.

**Deliverables by November 27**

- Working optimizer.
- Quality utility estimator.
- Decision API.
- Example allocation results.
- Unit tests for bandwidth constraints, priority handling and switching penalties.
- Decision explanations.

**Primary responsibility:** Make StreamWise usable, demonstrable and measurable.

**Responsibilities**

1. Build the React interface for video upload and playback.
2. Integrate the HLS player with Person 1's playback contract.
3. Integrate StreamWise's decision controller with Person 3.
4. Implement or configure a conventional ABR baseline.
5. Build network simulation controls.
6. Display current bitrate, resolution, buffer health and bandwidth.
7. Display the segment-level quality allocation timeline.
8. Show why StreamWise selected a particular resolution.
9. Record playback and network metrics for both systems.

**Deliverables by November 27**

- Functional frontend.
- Working HLS playback.
- Conventional ABR playback mode.
- StreamWise playback mode.
- Network simulation.
- Comparison dashboard with real recorded measurements.
- Integrated end-to-end demonstration.

OH, I know exactly the aesthetic you're describing. 😭

You're not necessarily looking for _minimalist_ design. You're looking for design that feels like somebody actually made it.

Something with personality. Weird little details. Unexpected typography. Text overlapping images. Imperfect layouts. Playful interactions. Colours that shouldn't work together but somehow do. Websites that feel like they have a personality rather than looking like a SaaS landing page generated from the same five prompts.

I think the style you're gravitating towards sits somewhere between:

- **Anti-design:** Deliberately breaks conventional design rules.
- **Neo-brutalism:** Bold typography, harsh contrasts, visible borders, unapologetic layouts.
- **Editorial web design:** Feels like a magazine, art book or independent publication.
- **Indie web / Internet nostalgia:** Personal, quirky, experimental websites.
- **Maximalism:** Lots of visual elements, but with intentional composition.
- **Playful interactive design:** Websites that feel like little experiences rather than static pages.

Here are the places I'd actually recommend exploring.

## **1\. The websites I'd bookmark first**

These are the ones I'd prioritise over the usual Dribbble/Pinterest recommendations.

[HoverStat.es — free online color & design tool — tinytools](https://images.openai.com/static-rsc-4/8FY57PrZpN1IeewjiD_XKzaZXLDnAQw5-rt5PLGnTFfmlmi6m5EAKtxl0SFLx1WKCc0zcw72JhDzgZ3NYG1MA6V0q9tz1LASDhWo1yrY5YmOZuszH44NNMWVPW8dFoTKVMDfi7YRj8IpxQJxHLOAf6yiJwTa6O3g3aHs_7-pD2w?purpose=inline)

**1.** [**Hoverstates**](https://hoverstat.es/?utm_source=chatgpt.com)

My strongest recommendation

Experimental · Unconventional · Interactive

Websites that don't follow the usual design conventions. Strange navigation, unconventional layouts, expressive typography and interesting interactions. Exactly the rabbit hole I'd send you down.

[Haus - Awwwards](https://images.openai.com/static-rsc-4/NTGFLqSlRlWekBOPCVq5MQjJ-GZAycJH89ui9mKTGY3Q_OmtTl4TZXmqSfuxuGoQ3XGyjKaht9Y6fjEfk5nJLAgvkh2IuFrSbgwbdc395sOIJNU8mbPZvep64hYmi-z0ztC7ExSBvWb8ckVqt_aLBnxVf6nUCA-wuCjlQ2S9760?purpose=inline)

**2.** [**Awwwards**](https://www.awwwards.com/?utm_source=chatgpt.com)

Award-winning · Creative · Immersive

Look at experimental and immersive websites, not just the popular winners. Great for unconventional hero sections, animations, typography and storytelling.

[Brutalist Websites: 11 Inspiring Examples](https://images.openai.com/static-rsc-4/qaLvdlW7ZgI8ebCpPoxGE4mu_NiCNxPk9gY0W8j7SQtid6wRBKM5MEwikfEQkHjO8EGk3PJ5QgpLtV8ZYdQYYJrBa0daT_asUQnbqlqKGWS2prGpIFt6bIj4qzCfmTURZZGq67JsiAIbjITvoMwF2diHepU-EiZXODA4BhSZcnE?purpose=inline)

**3.** [**Httpster**](https://httpster.net/?utm_source=chatgpt.com)

Indie · Typography · Offbeat

A handpicked archive of websites with interesting visual identities. Particularly good for finding designs that don't look like standard startup templates.

[Re-public | Web Design Inspiration | Siteinspire](https://images.openai.com/static-rsc-4/e_khtk3FMJzK6jjqK7Dn-oEKEyfJ-OV6Sb8Zg5NgLrsrju0bR19FZudnC7AIzd1JLmmeKuQz1AWUukeTsxhj1qDOw4qApq3_Lo67450XEh_L0J05D7YA-lecr-X59vDbzMrg-1k49KVzYeMY6vxDMCT2b9t4OTnf0i4iS6KZcmU?purpose=inline)

**4.** [**SiteInspire**](https://www.siteinspire.com/?utm_source=chatgpt.com)

Editorial · Artistic · Curated

More refined, but not necessarily sterile. Explore fashion, art, culture, architecture and portfolio categories.

[WONDERLAND - The FWA](https://images.openai.com/static-rsc-4/QJoevXqzOTU2Vo8tDO62oRPhwpY4iBD2c8eavfqyreYLALvfNvdbr1PDsTddgCceAcUdQubrrjOVeRKDahlUvkRybYtCi7B-CEg5YnbYJmjJyDHSCRUMph5TLHo0Cf6qzM9cEEiLYW7EBx3WvcYsDaiuDo157kne0CcaQxpKheI?purpose=inline)

**5.** [**The FWA**](https://thefwa.com/?utm_source=chatgpt.com)

Experimental · Interactive · Art direction

For websites that feel like experiences. Explore unusual transitions, interactive storytelling, sound and creative front-end experiments.

[What Is Framer? A Design Tool Guide for 2026](https://images.openai.com/static-rsc-4/TMDskpqheNy73w13C5dOVRFogV3XkDM_J9PlefmrmWjv80BnCB7HJKCDwLpbjmqsoKh_eIhAVQJqkTzq2CwLPgeEMZdlXdnXl-ekSMgmHtMUbX-6bzU8jCIwBOf2Yt2PN6MWH7GMZ0udpanyZXEu7Il8npHPX97Po2W4ZEmiZhE?purpose=inline)

**6.** [**Recent Design**](https://recent.design/?utm_source=chatgpt.com)

Contemporary · Curated · Visual

A discovery feed for interesting recently published websites and visual work. Useful for seeing what independent designers are making now.

## **2\. For the really weird, cluttered, human side of the internet**

This is where I think you'll find some of your favourite references.

[Neocities: Create your own free website!](https://images.openai.com/static-rsc-4/o_8UQVJVpWICt6hIJ8qsIV9NIzj1hTVukPGk1yytg4N76-sQaXFa418NbHSf_o8fzFNjsLFUPW7U7h3HJtM2PW_n1TUG3k4q26F6pMsGptzKmZRoVZmWgrSYU6P-l7mlwhWgCYo4-2GWVKjK1BQ1ZE7AzxubDOYycLEIT005YI8?purpose=inline)

[**Neocities**](https://neocities.org/browse?utm_source=chatgpt.com)

Personal websites, handmade graphics, chaotic layouts, internet nostalgia. A goldmine for human personality.

[The 10 Best PKM Tools of 2024 💭. Manage cognitive overload with the… | by Stackradar | Stackradar | Medium](https://images.openai.com/static-rsc-4/KooRPHAAo1S3FmJ6qj34Khb3JErf1uEpHlvTfkIXFKxiUR1WRy6SAI_m-G-gcOnqsWJ7KiIPt8BkSztVi9CKaK9gQgt0V_RfFOUAQcHjO0sh5ww0QTea-fsBH9ejR4b2sP-m9o-zBX9c6q4TGROeld9n0soD7ugZylEZ8ZmdOB8?purpose=inline)

[**Are.na**](https://www.are.na/?utm_source=chatgpt.com)

Visual research, unusual references, art, collage, graphic design and unconventional ideas.

[Brutalist Websites: 11 Inspiring Examples](https://images.openai.com/static-rsc-4/zVlOtmN8B65etyZxYwqC3zkpaHtcOnGK6CHafmmL0Y2uoqJug7fRjK1YZcce7GHcaspxhAM7pMPyclHueDSC_TzLJgWrIizYRIWa9miZfVhWcpI-oI_rd1TpuRDg9lUDjN2lTvpzlqErB548DIcV5-LuOVyNZQpn0W4JmDOmkoI?purpose=inline)

[**Brutalist Websites**](https://brutalistwebsites.com/?utm_source=chatgpt.com)

Raw, awkward, rebellious, sometimes deliberately ugly. Wonderful inspiration for breaking design conventions.

[Powell Studio - Portfolio - Awwwards](https://images.openai.com/static-rsc-4/DdWpUkIO4IpsX_YfdnYqQco_BeoYWXAfXAmTkvkHS6iygdDLJamaUTc1vjKKssc61V16Drmt1XXKQ3BtdtKMDCnrMLqYaNGRssV0FxeOG5-0UnYgQ0G-K4COR9mh7Jw6atd10Ybc9mXiE3jpirzzxhplqOvc_hTDUPj_dCId1ys?purpose=inline)

[**HTTP Cats**](https://http.cat/?utm_source=chatgpt.com)

A fun reminder that even technical details can have personality. Explore playful error states and microcopy.

A little tip: Don't just look at the homepage. Explore the about pages, archives, contact pages, custom cursors, loading screens and error pages. That's where a lot of the personality lives.

## **3\. Some more specialised places worth exploring**

| **Website**                                                                             | **What I'd use it for**                             |
| --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| [Web Design Inspiration](https://www.webdesign-inspiration.com/?utm_source=chatgpt.com) | Handpicked websites, including experimental designs |
| ---                                                                                     | ---                                                 |
| [Best Website Gallery](https://www.bestwebsite.gallery/?utm_source=chatgpt.com)         | Full website references and portfolios              |
| ---                                                                                     | ---                                                 |
| [CSS Design Awards](https://www.cssdesignawards.com/?utm_source=chatgpt.com)            | Creative CSS, animation and interaction             |
| ---                                                                                     | ---                                                 |
| [404s](https://www.404s.design/?utm_source=chatgpt.com)                                 | Creative error-page ideas                           |
| ---                                                                                     | ---                                                 |
| [Typewolf](https://www.typewolf.com/?utm_source=chatgpt.com)                            | Typography combinations and font inspiration        |
| ---                                                                                     | ---                                                 |
| [Cargo](https://www.cargo.site/?utm_source=chatgpt.com)                                 | Artistic, unconventional portfolio websites         |
| ---                                                                                     | ---                                                 |

The Web Design Inspiration gallery explicitly describes its selection as hand-picked by human editors, which makes it particularly worth checking out.

Web Design Inspiration+1

## **4\. Design aesthetics I think you should explore**

Here are some visual directions I'd search for rather than simply searching for "modern website UI".

[Top 100 Most Creative and Unique Portfolio Websites | Muzli Blog](https://images.openai.com/static-rsc-4/e5Jq_b8ICxjc2FSTHPWgNGw2fkEBVHQ1ZxhI3r3l2UsKTTEOoBtB20QCUIhJ8WcTbD8E6tSbEO5AvUr5Yk2YKR6Jbg3jQbA_OYs80MSHdYAux_JM7EU9AFe6C4qT-UXr-VDKaKwR2XJoCaO_PR4Dv3ooMYvveFMLkSsQPoGyiFI?purpose=inline)

**Maximalist editorial**

Collages, layered imagery, typography, visual noise.

[Neocities - Activity](https://images.openai.com/static-rsc-4/1pRbTR_q11IZrgNZOfkDrb5GWQiEFk3c-fMIoXGb4Dm7Ui9fgr2uY3IQwjfQgy7qFL09jU7N2aUXFHWxrqv3tC170iRxaXBtdvd52B8tJOqSH3zv6aEYkeM1E9raSF_E4H-LZ4jlE88jdSzgU46Ey6p-5xxKt89VwlNN-YtfGDk?purpose=inline)

**Y2K / Internet nostalgia**

Pixel graphics, gradients, stickers, playful interfaces.

[Art Landing Page Website, Neubrutalism :: Behance](https://images.openai.com/static-rsc-4/RERbt1RRgyOdLGwl2vs4qbT_TeZPIvA1xCJ5szJ6qEZ3qNBXjaF-hWwmWVg_dDdrYqyh9wv6GqOg4E2aD8JmD4XdMqbU_TFNQySTXxvkaJZ0R7n0yqyau1hHLGO8ipZUwNenl4EIPGx_fIQQ1IupoctI8NtbvvbFqgcvrC0gbfg?purpose=inline)

**Neo-brutalism**

Thick borders, bold colours, imperfect alignment.

[nss magazine - Awwwards Honorable Mention](https://images.openai.com/static-rsc-4/JXLfZ0Lba99TwL6U0GY0BMDiKlHJHJ-h-U-n2jcJSJUZkBy06BMlnr4E56pFvlCcwsj2j-py6g9w3YcHJh7gBARcC_129Hz2YdC6E0GVlhDUtV9buv04N8__Ll1tbXTMON1FpalnxdCe8LRs6--rlDm7bCbFRcb_rl4ZWhUQxPk?purpose=inline)

**Independent magazine**

Editorial grids, unconventional spacing, art direction.

[bylydiaamaruch](https://images.openai.com/static-rsc-4/bLWJxaOrJrQYF3xXE-L4jze96aA9s1Fgr98btrY9Yi3mC0hywd9ycMgub0_HMc8l4m5fiv7rZinLNk0C2bB3aLgQb3U_wDv1cst-3sFCD0VXsxjfc0pZAuMRiFdVjNEnb8ELWXmX5N1dytZ5vimgAErEO3kItpJlvC3adnbsm6U?purpose=inline)

**Handmade / Illustrated**

Doodles, hand-drawn elements, illustrations, warmth.

[The rise of trinkets in graphic design and UI | by Nila Damodar | Bootcamp | Medium](https://images.openai.com/static-rsc-4/1ryY623tLrhGEoje_X2iP2LdeauuMxAN0v4SPEqQ-EH0jYQMh4MmspmlRn__D7lZiUyW-DG2VxhgkXpIaHC6ZLHHrKCLQFO5L2nu7TIXCdc5CeA5Asiqf_B-jbP9caOsBdYdpP4-NKCPkhcU7ZERVPWP21MLCkb7HiWRoCsHaIY?purpose=inline)

**Digital scrapbook**

Layering, stickers, handwritten notes, intentional clutter.

## **5\. My advice: Stop looking exclusively at websites**

Some of the best frontend inspiration comes from things that aren't websites at all.

- Vintage magazines and fashion editorials.
- Album covers and music posters.
- Japanese packaging and stationery.
- Children's illustrated books.
- Old computer interfaces and video games.
- Independent art portfolios.
- Scrapbooks, zines and personal blogs.

These give you a visual vocabulary that you won't get from browsing thousands of SaaS landing pages.

## **6\. Let's narrow down your actual taste**

I'm curious about something because I don't think you necessarily want one consistent aesthetic.

**1\. Which visual directions attract you?**

Choose as many as you like.

Maximalist / editorial

Indie internet / Y2K

Playful / illustrated

Neo-brutalist / raw

Vintage / retro

Dark / experimental

Fantasy / whimsical

**2\. What kind of clutter?**

Beautiful chaos — lots of elements, but everything has a place

Scrapbook chaos — overlapping images, stickers, handwritten notes

Editorial chaos — asymmetry, typography, unusual grids

Internet chaos — retro graphics, GIFs, quirky details

**3\. How do you feel about animations?**

Love them! Unexpected interactions and animations.

A little, but not distracting.

Mostly static, strong visual identity.

Find my design aesthetic

I want to help you build a proper inspiration library of websites that make you think **"HOW DID SOMEONE EVEN COME UP WITH THIS?"** rather than another collection of perfectly aligned rounded rectangles. 😭

## **Content Understanding**

AI / Computer Vision

**Primary responsibility:** Understand what is happening visually in each video segment.

**Responsibilities**

1. Analyze the video and identify scene changes.
2. Extract representative frames from each segment.
3. Calculate visual complexity.
4. Analyze text density using OCR.
5. Detect relevant visual details such as diagrams, graphs and code-like regions where feasible.
6. Produce a normalized segment-level importance profile.
7. Generate structured JSON output that Person 3 can consume.

**Keep the first version manageable.**

Implement these first:

- Scene detection.
- Visual complexity.
- OCR/text density.
- Educational contextual scoring using available visual and optional transcript signals.

Do not attempt to build a sophisticated multimodal AI system in two days.

**Deliverables by November 27**

- Content analyzer module.
- Segment metadata JSON.
- Reusable analysis API.
- Tests using at least three representative video samples.
- Example analyzer outputs and documentation.