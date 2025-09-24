# Contributing to OpenFrame

Thank you for your interest in contributing to the OpenFrame project! We encourage both small and large contributions and appreciate your help in improving our platform.

## Table of Contents
1. Getting Started  
2. Development Environment  
3. Code Standards and Practices  
4. Pull Requests  
5. Issue Tracking  
6. Communication  
7. Contributor License Agreement (CLA)  
8. Code of Conduct  

--------------------------------------------------------------------------------
## 1. Getting Started

- Ensure you have the prerequisites installed:
  - Java 21, Maven 3.9+, Docker & Docker Compose, Git 2.42+
  - (Optional) Node.js + npm (for the front-end build)

- Fork the repository in GitHub, then clone your fork locally:  ```bash
  git clone https://github.com/YOUR-USERNAME/openframe.git
  cd openframe  ```

--------------------------------------------------------------------------------
## 2. Development Environment

Below are brief steps for a standard dev environment:

1. Run Maven to build the backend libraries and services:   ```bash
   mvn clean install   ```
2. For the front-end (if you plan to make UI changes):   ```bash
   cd services/openframe-frontend
   npm install
   npm run serve   ```
3. Optionally launch the entire stack using Docker Compose:   ```bash
   ./scripts/build-and-run.sh   ```

Refer to [docs/deployment.md](docs/deployment.md) for more specific setup details.

--------------------------------------------------------------------------------
## 3. Code Standards and Practices

- Code style:
  - Use standard Java conventions, or the project’s .editorconfig / style plugin.
  - For JavaScript/TypeScript front-end, follow Prettier/ESLint settings if available.

- Testing:
  - Write unit and integration tests where possible.
  - Keep test coverage above the project threshold.
  - For Java, we use JUnit or Testcontainers. For front-end, consider Jest or Cypress.

- Commits:
  - Use descriptive commit messages (e.g. “Fix login bug with JWT tokens”).
  - Group related changes into a single commit; separate unrelated changes.

--------------------------------------------------------------------------------
## 4. Pull Requests

- Ensure all commits are rebased or squashed appropriately.
- Include a clear description with:
  - What problem you are addressing / what feature you are implementing
  - How you tested it
  - Any potential impacts on existing features
- Reference the related issue if applicable (e.g., “Fixes #123”).
- Make sure your PR passes all checks (CI, code style, test coverage).

--------------------------------------------------------------------------------
## 5. Issue Tracking

- Issues are tracked on the GitHub Issues page.
- If you find a bug, please create a new issue with:
  - Steps to reproduce
  - Expected vs. actual results
  - Environment details (OS, Java version, etc.)
- For enhancements, provide a clear vision of what you’re proposing.

--------------------------------------------------------------------------------
## 6. Communication

- Join our official Slack/Discord for real-time discussions (links TBD).
- Use the GitHub Discussion board for longer-form conversations.
- Follow openframe.org blog or our social accounts for updates.

--------------------------------------------------------------------------------
## 7. Contributor License Agreement (CLA)

By contributing to OpenFrame, you confirm that any code, documentation, or other output you submit is your own and that you have the right to share it under the license of this project. If a formal CLA is in place, please sign it before submitting a PR.

--------------------------------------------------------------------------------
## 8. Code of Conduct

This project follows a standard Code of Conduct; please respect each other. Be kind, patient, and inclusive. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for more details.

--------------------------------------------------------------------------------
Thank you again for your contribution! Your input and ideas help improve OpenFrame for everyone. If you have any questions, feel free to reach out via GitHub issues or our community channels.
