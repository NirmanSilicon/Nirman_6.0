# Contributing to NIRMAN 6.0 — HACKNATION 2026

This guide explains how team leaders and team members collaborate using Git and GitHub.

The team leader maintains one fork of the original NIRMAN repository. Team members clone that fork, work on individual branches, and submit pull requests to the team's shared branch. After reviewing and merging the contributions, the team leader submits the team's work to the original repository.

> **Important:** There are two different pull-request stages. Members open PRs to the team leader's fork. The team leader opens the final PR to the original NIRMAN repository.

---

## 1. Team leader workflow

### Step 1: Fork the original repository

1. Open the original repository: <https://github.com/NirmanSilicon/Nirman_6.0>
2. Click **Fork**.
3. Create the fork under your own GitHub account.

Your fork URL should look like:

```text
https://github.com/<team-leader-github-username>/Nirman_6.0
```

### Step 2: Clone your fork

Open a terminal and run:

```bash
git clone https://github.com/<team-leader-github-username>/Nirman_6.0.git
cd Nirman_6.0
```

You can also clone the fork using GitHub Desktop or your preferred IDE.

### Step 3: Add the original repository as `upstream`

Your fork is automatically configured as `origin`. Add the original NIRMAN repository as `upstream`:

```bash
git remote add upstream https://github.com/NirmanSilicon/Nirman_6.0.git
```

Verify the remotes:

```bash
git remote -v
```

You should see something similar to:

```text
origin    https://github.com/<team-leader-github-username>/Nirman_6.0.git (fetch)
origin    https://github.com/<team-leader-github-username>/Nirman_6.0.git (push)
upstream  https://github.com/NirmanSilicon/Nirman_6.0.git (fetch)
upstream  https://github.com/NirmanSilicon/Nirman_6.0.git (push)
```

Remember:

- `origin` = your personal fork (the team leader's fork).
- `upstream` = the original NIRMAN repository.

### Step 4: Fetch the original repository's branches

```bash
git fetch upstream
```

This fetches the latest branch information from the original repository.

### Step 5: Set up your team's shared branch

Use the exact team branch assigned by the organizers.

```bash
git switch -c <team-branch> upstream/<team-branch>
```

For example:

```bash
git switch -c team_alpha upstream/team_alpha
```

This creates a local team branch based on the assigned branch from the original repository.

If you already have the local branch, switch to it instead:

```bash
git switch <team-branch>
```

### Step 6: Push the team branch to your fork

If your fork does not yet contain the team branch, push it:

```bash
git push -u origin <team-branch>
```

For example:

```bash
git push -u origin team_alpha
```

Your fork now contains the team's shared branch. This is the branch your team members will use as the base for their work.

### Step 7: Add team members as collaborators

Team members need write access to your fork so they can push their individual branches.

1. Open your fork on GitHub.
2. Go to **Settings**.
3. Open **Collaborators** (or the repository's access-management section).
4. Select **Add people**.
5. Search for each team member using their GitHub username and send the invitation.
6. Ask every member to accept the invitation.

Members must accept the invitation before they can push to your fork. They should check their GitHub notifications or the email associated with their GitHub account for pending invitations.

### Step 8: Review and merge team members' pull requests

When a member opens a pull request:

1. Open the pull request in your fork.
2. Check that its base is your team's shared branch.
3. Review the code and test the changes where appropriate.
4. Leave comments or request changes if needed.
5. Once approved, merge the pull request into the shared team branch.

Do not merge a member's PR if it targets the wrong repository or branch.

### Step 9: Raise the final pull request to the original repository

After the team's work is ready for submission:

1. Open your fork on GitHub.
2. Select **Contribute** / **Open pull request**, or open the Pull requests tab and create a new PR.
3. Set the pull request direction as follows:

```text
Head repository: <team-leader-github-username>/Nirman_6.0
Head branch:     <team-branch>

Base repository: NirmanSilicon/Nirman_6.0
Base branch:     <team-branch>
```

For example:

```text
Head repository: team-leader/Nirman_6.0
Head branch:     team_alpha

Base repository: NirmanSilicon/Nirman_6.0
Base branch:     team_alpha
```

**The base branch must be your team's assigned branch in the original repository, not `main`.**

4. Add a clear title and description.
5. Summarize the team's work and relevant testing.
6. Submit the pull request and wait for organizer review.

The organizers are responsible for reviewing and merging the final team PR into the original repository.

---

## 2. Team member workflow

### Step 1: Clone the team leader's fork

Ask your team leader for the fork URL. It should look like:

```text
https://github.com/<team-leader-github-username>/Nirman_6.0
```

You can clone it using GitHub Desktop or run:

```bash
git clone https://github.com/<team-leader-github-username>/Nirman_6.0.git
cd Nirman_6.0
```

Make sure you clone the **team leader's fork**, not the original NIRMAN repository.

### Step 2: Create your individual branch

First, fetch the latest branches from the team leader's fork:

```bash
git fetch origin
```

Create your own branch from the team's shared branch:

```bash
git switch -c <your-branch-name> origin/<team-branch>
```

For example:

```bash
git switch -c akhil-homepage origin/team_alpha
```

You can choose a branch name that identifies your work. Prefer short, descriptive names.

Alternatively, if you have already created your branch locally, switch to it:

```bash
git switch <your-branch-name>
```

**Do not work directly on the shared team branch.** Each member should make changes on their own branch.

### Step 3: Pull the latest changes from the team branch

Before starting work, make sure you are on your own branch:

```bash
git branch
```

The asterisk (`*`) indicates the currently active branch.

Then pull the latest changes from the team's shared branch:

```bash
git pull origin <team-branch>
```

For example:

```bash
git pull origin team_alpha
```

If Git reports merge conflicts:

1. Open the files with conflicts.
2. Resolve the conflicting sections carefully.
3. Review the resolved files.
4. Stage and commit the resolution if Git requires it.

Repeat this synchronization whenever you need the latest work from the team branch. Do not switch to or commit directly on the shared branch.

### Step 4: Make your changes

Work on your assigned task while remaining on your individual branch.

Before committing, check your current branch and changed files:

```bash
git branch
git status
```

Make sure you have not unintentionally modified another team's work or unrelated files.

### Step 5: Commit and push your changes

Stage your changes:

```bash
git add .
```

Review what will be committed:

```bash
git status
git diff --cached
```

Commit with a meaningful message:

```bash
git commit -m "feat: add homepage section"
```

Push your individual branch to the team leader's fork:

```bash
git push -u origin <your-branch-name>
```

For example:

```bash
git push -u origin akhil-homepage
```

Remember: `origin` is the team leader's fork in this workflow. You must have accepted the collaborator invitation to push to it.

### Step 6: Create a pull request to the team's shared branch

After pushing your branch:

1. Open the team leader's fork on GitHub.
2. Go to **Pull requests** and select **New pull request**.
3. Select the correct source and target:

```text
Base repository: <team-leader-github-username>/Nirman_6.0
Base branch:     <team-branch>

Head repository: <team-leader-github-username>/Nirman_6.0
Compare branch:  <your-branch-name>
```

For example:

```text
Base repository: team-leader/Nirman_6.0
Base branch:     team_alpha

Head repository: team-leader/Nirman_6.0
Compare branch:  akhil-homepage
```

4. Add a meaningful title and description.
5. Explain what you changed and how you tested it.
6. Create the pull request.

**Your PR must target the team's shared branch in the team leader's fork. Do not target the original repository or `main` for a member contribution.**

### Step 7: Respond to review feedback

The team leader will review your pull request.

If changes are requested:

1. Return to your individual branch.
2. Make the requested changes.
3. Commit and push them to the same branch.

```bash
git add .
git commit -m "fix: address review feedback"
git push origin <your-branch-name>
```

The existing pull request will update automatically. You do not need to create another PR for the same branch.

### Step 8: Continue syncing with the team branch

While your work is in progress, other members may merge changes into the shared team branch.

To get those changes, switch to your own branch and pull from the shared branch:

```bash
git switch <your-branch-name>
git pull origin <team-branch>
```

Resolve any conflicts before continuing.

Once your PR is merged, coordinate with your team leader before starting another task or reusing your branch.

---

## 3. Collaboration and safety rules

### Branch and pull-request rules

- The team leader uses the assigned team branch as the shared branch.
- Each team member works on an individual branch.
- Members must not commit directly to the shared team branch.
- Member PRs target the shared team branch in the team leader's fork.
- The team leader reviews and merges member PRs.
- The team leader's final PR targets the same assigned team branch in the original NIRMAN repository.
- Never target `main` unless an organizer explicitly instructs you to.

### Commit message suggestions

Use clear commit messages that explain the change.

| Prefix | Purpose | Example |
|---|---|---|
| `feat:` | New functionality | `feat: add user login` |
| `fix:` | Bug fix | `fix: resolve navbar issue` |
| `docs:` | Documentation | `docs: update setup guide` |
| `refactor:` | Code restructuring | `refactor: simplify API handler` |
| `test:` | Tests | `test: add login tests` |
| `chore:` | Maintenance | `chore: update dependencies` |

### Before opening a pull request

Run the checks relevant to your project:

```bash
git status
git diff
git diff --check
```

Also:

- Run relevant tests, formatters, and linters.
- Review the files included in your changes.
- Remove temporary files and debugging code.
- Include setup or testing notes in the PR description.
- Mention known limitations or blockers.

### Protect credentials and data

- Never commit API keys, passwords, access tokens, private keys, or other credentials.
- Keep real `.env` files out of Git. Commit a `.env.example` only when it contains placeholder values.
- Do not upload private or sensitive participant information.
- Do not push entire datasets for machine-learning projects. Use suitable external storage and document how to obtain the data.
- Credit third-party code, assets, and datasets.
- If a credential is accidentally exposed, inform an organizer immediately and revoke or rotate it.

### Avoid overwriting other people's work

Before pushing, inspect your branch and staged changes. If you accidentally modify another member's or team's files, do not include those changes in your PR. Restore or unstage them carefully and coordinate with the affected contributor or team leader.

GitHub collaborator access applies to the repository, not to individual folders. Be careful when changing files outside your team's intended work.

---

## 4. Quick command reference

### Team leader

```bash
# Clone your fork
git clone https://github.com/<team-leader-github-username>/Nirman_6.0.git
cd Nirman_6.0

# Add original repository
git remote add upstream https://github.com/NirmanSilicon/Nirman_6.0.git

# Fetch original branches
git fetch upstream

# Create local team branch from original team branch
git switch -c <team-branch> upstream/<team-branch>

# Push shared team branch to your fork
git push -u origin <team-branch>
```

### Team member

```bash
# Clone the team leader's fork
git clone https://github.com/<team-leader-github-username>/Nirman_6.0.git
cd Nirman_6.0

# Fetch the shared team branch
git fetch origin

# Create your own branch from the shared team branch
git switch -c <your-branch-name> origin/<team-branch>

# Pull the latest team changes while on your own branch
git pull origin <team-branch>

# Stage, commit, and push your work
git add .
git commit -m "feat: describe your change"
git push -u origin <your-branch-name>
```

---

## 5. Troubleshooting

**I cannot push to the team leader's fork.**

- Confirm that the team leader invited your GitHub account as a collaborator.
- Accept the invitation.
- Verify that `origin` points to the team leader's fork:

```bash
git remote -v
```

**I cannot find my team's branch.**

- Confirm the exact branch name with your team leader or an organizer.
- The team leader should fetch the original repository's branches:

```bash
git fetch upstream
git branch -r
```

**I have merge conflicts while pulling the team branch.**

- Confirm that you are on your own individual branch.
- Resolve the conflicts in the affected files.
- Stage the resolved files and complete the merge as instructed by Git.
- Ask your team leader for help if you are unsure which changes to keep.

**I opened a PR to the wrong branch.**

- Check the base repository and base branch on GitHub.
- Change the PR's base branch if GitHub allows it, or close the incorrect PR and create a new one with the correct destination.
- Ask your team leader if you are unsure.

---

Thank you for contributing to NIRMAN 6.0. Keep your branches organized, communicate with your team, and review your changes before opening a pull request.
