# RepoReality 🔍
### Verify the claims, not just the README.

RepoReality is an AI-assisted GitHub repository auditing tool that helps developers investigate whether the features described in a repository's README are supported by evidence in its source code.

Instead of simply summarizing a repository, RepoReality connects documented claims to relevant code snippets and uses Gemma AI to help analyse the available evidence.

> **Important:** Finding implementation evidence does not prove that a feature works correctly at runtime. RepoReality is an exploratory static-analysis tool, not a replacement for testing, code review, or a professional security audit.

## ✨ Key Features

- **GitHub Repository Inspection:** Analyse public GitHub repositories using their URL.
- **README Claim Extraction:** Identify concrete, verifiable feature claims from project documentation.
- **Source Code Evidence:** Find relevant files and code snippets related to each claim.
- **Gemma-Powered Analysis:** Use Gemma AI to assess how well the available code evidence supports a claim, when API access is configured.
- **Evidence-Linked Findings:** Display findings with relevant file paths, code snippets, and explanations.
- **Transparent Results:** Distinguish between supporting evidence, partial evidence, insufficient evidence, and checks that require runtime verification.

*Feature availability depends on the current implementation and API configuration.*

## 🧠 How It Works

1. **Enter a repository URL** — Provide a public GitHub repository link.
2. **Inspect the repository** — Retrieve repository metadata, README content, and selected source files.
3. **Extract claims** — Identify concrete feature claims described in the README.
4. **Collect evidence** — Search relevant source files for code that may support each claim.
5. **Analyse with Gemma** — Compare claims against selected evidence when Gemma API access is available.
6. **Review the report** — Examine findings, evidence, limitations, and suggested verification steps.

## 📊 Finding Categories

| Status | Meaning |
|---|---|
| `IMPLEMENTATION_EVIDENCE_FOUND` | Relevant implementation evidence was found. Runtime correctness is not guaranteed. |
| `PARTIAL_EVIDENCE` | The available evidence supports only part of the claim. |
| `NOT_VERIFIED` | Sufficient supporting evidence was not found in the inspected files. This does not prove the feature is absent. |
| `NEEDS_RUNTIME_CHECK` | Static inspection alone cannot establish whether the feature works as expected. |

## 🛠️ Technology Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **AI:** Gemma through Google's hosted API
- **Repository Data:** GitHub REST API
- **Validation:** Zod
- **Testing:** Vitest and API tests, where implemented

## 🚀 Getting Started

### Prerequisites

- Node.js and npm
- A Google AI API key with access to the configured Gemma model, for AI-powered analysis
- A GitHub token is optional for public repository access, subject to GitHub API rate limits

### Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd RepoReality
npm install
```

If the project uses separate client and server dependencies, follow the installation instructions in their respective package directories.

### Environment Variables

Create a local `.env` file based on `.env.example` and configure the variables supported by your implementation.

```env
PORT=5001
CLIENT_ORIGIN=http://localhost:5173
GITHUB_API_BASE_URL=https://api.github.com
GITHUB_TOKEN=
GEMINI_API_KEY=
GEMMA_MODEL=
```

- `PORT`: Backend server port.
- `CLIENT_ORIGIN`: Frontend origin allowed by the backend.
- `GITHUB_API_BASE_URL`: GitHub API base URL.
- `GITHUB_TOKEN`: Optional token for GitHub API access.
- `GEMINI_API_KEY`: API key used by the Google GenAI SDK.
- `GEMMA_MODEL`: Supported Gemma model identifier configured for the application.

Keep API keys in the backend environment. Never commit your `.env` file or expose API keys through frontend variables.

### Run Locally

Use the development scripts defined in the project's `package.json`. For example, if the root scripts support concurrent development:

```bash
npm run dev
```

Otherwise, start the backend and frontend using their respective package scripts.

Check the actual available scripts before running these commands.

## 🔐 Security and Privacy

- RepoReality is intended to inspect public GitHub repositories.
- The inspected repository's code is treated as untrusted input.
- The application should never execute code from an audited repository.
- Repository size and API requests should be bounded.
- Potential secrets should be redacted where practical.
- When Gemma analysis is enabled, selected repository content may be sent to Google's hosted API for processing.

Do not submit private or sensitive source code unless you have appropriate authorization and understand the applicable API data-handling terms.

## ⚠️ Limitations

- Finding code does not establish that a feature works correctly.
- Relevant implementation evidence may be missed by simple file matching.
- A feature may exist in a file that was not inspected.
- AI-generated findings may be incomplete or incorrect.
- Security signals are preliminary indicators, not definitive vulnerability findings.
- Runtime behaviour, integration correctness, and test execution require separate verification.

## 🎯 Project Goal

RepoReality aims to make repository reviews more transparent by connecting software claims to inspectable code evidence and making uncertainty visible.

**The goal is not to declare a repository trustworthy or untrustworthy. It is to help developers ask better questions and verify claims with evidence.**

## 📄 License

The project license has not yet been specified. Add the appropriate license file and update this section once the project owner's licensing decision has been made.

## 🤝 Contributing

Contributions, bug reports, and suggestions are welcome once the project's contribution guidelines and development setup are available. Please open an issue to discuss a substantial change before submitting a pull request.
