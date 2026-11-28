# NIRMAN 6.0 — HACKNATION 2026

Welcome to the **NIRMAN 6.0 HACKNATION** project repository.

This repository follows a **team-based Git collaboration workflow**. Each participating team has a dedicated branch in the original NIRMAN repository and one designated **team leader**, who maintains the team's fork of the original repository.

Team members collaborate through the team leader's fork using their own individual working branches. Their contributions are reviewed and merged into the team's shared branch before the team leader submits the final work to the original repository.

The workflow consists of two stages:

1. **Team collaboration:** Members push their work to individual branches in the team leader's fork and raise pull requests targeting the team's shared branch. The team leader reviews and merges these contributions.
2. **Final team submission:** The team leader raises a pull request from the team's shared branch in their fork to the corresponding team branch in the original NIRMAN repository.

---

## Getting Started

- **Team leaders:** Start with the [Team Leader Workflow](CONTRIBUTING.md#1-team-leader-workflow).
- **Team members:** Follow the [Team Member Workflow](CONTRIBUTING.md#2-team-member-workflow).
- **Everyone:** Read the [Collaboration and Safety Rules](CONTRIBUTING.md#3-collaboration-and-safety-rules).

Refer to `CONTRIBUTING.md` for the complete Git setup instructions, commands, branching strategy, pull request process, and conflict-resolution guidelines.

---

## Repository

**Original repository:**

[NirmanSilicon/Nirman_6.0](https://github.com/NirmanSilicon/Nirman_6.0)

The original repository is a shared monorepo containing the work of all participating teams.

Each team has an assigned branch in the original repository. The team leader must use the exact branch assigned by the organizers.

Example branch names:

```text
team_alpha
team_beta
team_zeta
```

**Important:** Do not independently create a replacement team branch or modify another team's branch. If your assigned branch is missing, contact the organizers.

## Roles and Responsibilities

### 1. Team Leader

The team leader is responsible for managing the team's fork and coordinating contributions.

Responsibilities:

- Fork the original NIRMAN repository to their GitHub account.
- Clone their fork to their local machine.
- Add the original repository as the `upstream` remote.
- Fetch the original repository's branches.
- Set up the team's assigned branch in their fork.
- Push and maintain the team's shared branch in their fork.
- Invite all team members as collaborators to the fork.
- Creating issues, sharing responsibilities among team members is entirely the responsibility of team   leader
- Review and merge team members' pull requests into the shared team branch.
- Coordinate contributions and resolve conflicts when necessary.
- Ensure the team's final submission follows the repository guidelines.
- Raise the final pull request from the team's shared branch to the corresponding team branch in the original NIRMAN repository.

### 2. Team Members

Each team member contributes through an individual working branch in the team leader's fork.

Responsibilities:

- Accept the team leader's collaborator invitation.
- Directly clone the team leader's fork to their local machine.
- Create an individual working branch.
- Keep their branch updated with the team's shared branch.
- Implement assigned tasks and commit their changes.
- Push their individual branch to the team leader's fork.
- Raise a pull request targeting the team's shared branch.
- Address review feedback and coordinate with the team leader.
- Avoid modifying or overwriting another member's work.

---

## Workflow at a Glance

```text
ORIGINAL NIRMAN REPOSITORY
          |
          | Team leader forks
          v
TEAM LEADER'S GITHUB FORK
          |
          | Team leader sets up the assigned
          | team branch and invites collaborators
          v
TEAM MEMBERS CLONE THE LEADER'S FORK
          |
          | Each member creates an individual branch
          v
INDIVIDUAL MEMBER BRANCHES
          |
          | Members commit and push their changes
          | and raise pull requests
          v
TEAM LEADER'S TEAM BRANCH
          |
          | Team leader reviews and merges
          | member contributions
          v
FINAL TEAM PULL REQUEST
          |
          | Team leader raises a PR to the
          | corresponding original team branch
          v
ORIGINAL NIRMAN REPOSITORY
```

---

## Important Instructions

### Repository Setup

- The team leader must fork the original repository.
- Team members must clone the **team leader's fork**, not create separate forks for this workflow.
- The team leader must add the original NIRMAN repository as the `upstream` remote.
- The team leader must fetch the latest branches from `upstream` and set up the assigned team branch.
- Team members must accept their collaborator invitations before attempting to push branches to the team leader's fork.
- Every team must use the branch assigned by the organizers.

### Branching and Contribution Rules

- Every member must work on an individual branch.
- Do not commit directly to the team's shared branch.
- Members must push their individual branches to the team leader's fork.
- Member pull requests must target the team's shared branch in the team leader's fork.
- Only the team leader should merge member pull requests into the shared team branch, unless the team explicitly agrees otherwise.
- New commits pushed to a member's branch automatically update that member's existing pull request.
- Keep your working branch synchronized with the team's shared branch to minimize merge conflicts.
- Do not overwrite another member's work or modify another team's work.

### Final Submission Rules

- Only the team leader is responsible for raising the final team pull request.
- The final pull request must originate from the team's shared branch in the team leader's fork.
- The destination must be the corresponding team branch in the original NIRMAN repository.
- **Do not target `main` with team pull requests.**
- The original repository's `main` branch is protected and reserved for organizer-managed integration.
- Before creating a pull request, always verify both the source repository and branch and the destination repository and branch.
- Squash unnecessary commits before final submission if appropriate.
- An open pull request or a push does not automatically count as a final submission. Follow the organizers' final submission announcement.

---

## Pull Request Destinations

There are two types of pull requests in this workflow.

| Pull request | Head (Source) | Base (Target) |
|---|---|---|
| Member contribution | Member's individual branch in the team leader's fork | Team's shared branch in the team leader's fork |
| Final team submission | Team's shared branch in the team leader's fork | Matching team branch in the original NIRMAN repository |

### Example

Suppose the assigned team branch is `team_alpha`.

**Member contribution:**

```text
Head repository: team-leader/Nirman_6.0
Head branch:     member-subhra

Base repository: team-leader/Nirman_6.0
Base branch:     team_alpha
```

**Final team submission:**

```text
Head repository: team-leader/Nirman_6.0
Head branch:     team_alpha

Base repository: NirmanSilicon/Nirman_6.0
Base branch:     team_alpha
```

**Important:** The final PR must target `team_alpha` in the original repository, not `main`.

---

## Repository Structure

The original repository is a shared monorepo.

```text
.
├── README.md
├── CONTRIBUTING.md
├── docs/
│   └── submission-guidelines.md
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md
└── teams/
|   └── README.md
```

The exact project structure may evolve during the event. Follow the existing repository organization and the instructions provided by the organizers.

---

## Git Safety and Collaboration Rules

All participants must follow these rules:

- Never commit API keys, passwords, access tokens, private data, or credentials directly into the repository.
- Use environment variables for sensitive configuration.
- Never push real `.env` files. Provide an `.env.example` file when configuration documentation is required.
- Do not push entire machine-learning datasets or other unnecessarily large files to GitHub. Use appropriate external storage instead.
- Do not overwrite another team's work.
- If you accidentally modify another team's files, restore or unstage those changes before raising a pull request.
- Communicate with your team before making changes that affect shared components.
- Use meaningful commit messages and descriptive pull request titles (refer to `.github/PULL_REQUEST_TEMPLATE.md`).
- Include relevant testing information in pull request descriptions.
- Resolve merge conflicts carefully rather than blindly accepting one side of the changes.

GitHub branch protection and automated checks may be used to enforce review and contribution rules. These mechanisms do not provide folder-level GitHub permissions.

---

## Pull Request and Review Guidelines

Every pull request must:

- Have a meaningful title and description.
- Explain the changes introduced.
- Mention relevant testing performed.
- Identify blockers, limitations, or pending work, if any.
- Follow the repository's pull request template.

Team leaders are responsible for reviewing member contributions and managing merges into their team's shared branch.

Organizers will review final team pull requests and manage integration into the original repository's team branches.

---

## Progress and Communication

- Use GitHub issues to describe tasks, track progress, and report blockers.
- Use pull requests to discuss and review proposed changes.
- Coordinate with your team leader before making changes to shared components.
- For implementation questions, use your team's issue or pull request.
- For hackathon-wide questions and documentation corrections, contact the organizers through the official communication channel.

---

## Event Details

| Detail | Information |
|---|---|
| Event | HACKNATION, 2026 |
| date | 28-11-2026 to 29-11-2026 |
| Submission deadline and timeline | check `docs/submission-timeline.md` |
| Official communication channel | Through whatsapp group (contact organizers if not added) |

Follow official announcements for submission deadlines and any changes to the workflow.

---

## Need Help?

Contact the event organizers if:

- Your assigned team branch is missing. check `teams/README.md`
- Your collaborator invitation is not working.
- You cannot push changes to the team leader's fork.
- You encounter unexpected repository access or permission issues.
- You are unsure about the correct pull request destination.
- You encounter a merge conflict that cannot be resolved within your team.

**Do not independently change the repository structure, create replacement branches, or modify the contribution workflow to work around access issues. Contact the organizers first.**

Happy building, and good luck with HACKNATION 2026!
