# Acrolinx Analyzer

A GitHub Action that analyzes and displays recent commit changes with detailed
diffs and file modifications, and runs Acrolinx style checks on modified files.

## Features

- 📝 **Commit analysis**: Show recent commits with detailed information
- 📊 **Change statistics**: Display additions, deletions, and total changes per
  file
- 🔍 **Diff preview**: Show patch previews for modified files
- 🎯 **Configurable**: Control how many commits to show and which branch to
  analyze
- 📈 **Output data**: Provides commit count and latest commit SHA for downstream
  steps
- ✨ **Acrolinx Integration**: Run style checks on markdown and text files
- 📋 **Style Analysis**: Comprehensive grammar, tone, and style guide checking
- 📊 **Detailed Scores**: Quality, clarity, grammar, and tone scoring

## Inputs

| Input                | Description                                                                      | Required | Default            |
| -------------------- | -------------------------------------------------------------------------------- | -------- | ------------------ |
| `acrolinx-api-token` | Acrolinx API token for style checking                                            | Yes      | -                  |
| `dialect`            | Language dialect for Acrolinx analysis (e.g., american_english, british_english) | No       | `american_english` |
| `tone`               | Tone for Acrolinx analysis (e.g., formal, informal, academic)                    | No       | `formal`           |
| `style-guide`        | Style guide for Acrolinx analysis (e.g., ap, chicago, apa)                       | No       | `ap`               |
| `commit-limit`       | Number of recent commits to show (max 10)                                        | No       | `3`                |
| `github-token`       | GitHub token for API access (uses `GITHUB_TOKEN` by default)                     | No       | -                  |

## Outputs

| Output             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `commits-analyzed` | Number of commits that were analyzed             |
| `last-commit-sha`  | SHA of the most recent commit analyzed           |
| `acrolinx-results` | JSON string containing Acrolinx analysis results |

## Usage

### Basic Usage with Acrolinx

```yaml
name: Analyze Commits and Run Acrolinx
on: [push]
jobs:
  analyze-commits:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Analyze Commits and Run Acrolinx
        uses: ./
        with:
          acrolinx-api-token: ${{ secrets.ACROLINX_API_TOKEN }}
          commit-limit: '5'
```

### Custom Acrolinx Configuration

```yaml
name: Custom Acrolinx Analysis
on: [push]
jobs:
  custom-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Custom Acrolinx Analysis
        uses: ./
        with:
          acrolinx-api-token: ${{ secrets.ACROLINX_API_TOKEN }}
          dialect: 'british_english'
          tone: 'academic'
          style-guide: 'chicago'
          commit-limit: '3'
```

### Local Testing with Environment Variables

For local testing, you can use environment variables instead of GitHub secrets:

```bash
# Set the environment variable
export ACROLINX_API_TOKEN=your-acrolinx-api-token

# Run the action locally
npm run local-action
```

Or create a `.env` file in your project root:

```env
ACROLINX_API_TOKEN=your-acrolinx-api-token
```

Then run:

```bash
npm run local-action
```

### Using Outputs

```yaml
name: Use Analysis Results
on: [push]
jobs:
  analyze-and-notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Analyze Commits and Acrolinx
        id: analyzer
        uses: ./
        with:
          acrolinx-api-token: ${{ secrets.ACROLINX_API_TOKEN }}
          commit-limit: '3'

      - name: Use Analysis Results
        run: |
          echo "Analyzed ${{ steps.analyzer.outputs.commits-analyzed }} commits"
          echo "Latest commit: ${{ steps.analyzer.outputs.last-commit-sha }}"
          echo "Acrolinx results: ${{ steps.analyzer.outputs.acrolinx-results }}"
```

## Example Output

The action will output detailed commit information and Acrolinx analysis
results:

```
🔍 Fetching recent commit changes...
📋 Found 3 recent commits:
==================================================

📌 Commit 1:
📝 Commit: abc12345
📄 Message: feat: add new documentation
👤 Author: John Doe
📅 Date: 2024-01-15T10:30:00Z
📊 Changes:
  1. README.md (modified)
     +45 -12 (57 total changes)
     Patch preview:
     + # New Feature Documentation
     + This document describes the new feature.
     - # Old Documentation
     + ## Overview
     ... (truncated)

🔍 Running Acrolinx analysis on modified files...
🔍 Running Acrolinx check on: README.md

📊 Acrolinx Analysis Results:
==================================================

📄 File: README.md
📈 Quality Score: 85.2
📝 Clarity Score: 78.5
🔤 Grammar Issues: 2
📋 Style Guide Issues: 1
🎭 Tone Score: 82.3
📚 Terminology Issues: 0

⚠️  Issues Found:
  1. passive_voice
     Original: "This document describes"
     Category: style_guide
     Position: 45
  2. complex_sentence
     Original: "This document describes the new feature that was implemented"
     Category: sentence_structure
     Position: 67

📊 Acrolinx Analysis Results (JSON):
==================================================
[
  {
    "filePath": "README.md",
    "result": {
      "workflow_id": "abc123",
      "status": "completed",
      "scores": {
        "quality": { "score": 85.2 },
        "clarity": { "score": 78.5 },
        "grammar": { "score": 90.1, "issues": 2 },
        "style_guide": { "score": 88.3, "issues": 1 },
        "tone": { "score": 82.3 },
        "terminology": { "score": 95.0, "issues": 0 }
      },
      "issues": [...]
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

## Features in Detail

### Commit Information Displayed

- **Commit SHA**: Short hash of the commit
- **Commit Message**: The commit message/description
- **Author**: Name of the person who made the commit
- **Date**: When the commit was made
- **File Changes**: List of all modified files with statistics

### Acrolinx Analysis Features

#### Supported File Types

- **Markdown**: `.md`, `.markdown`
- **Text**: `.txt`
- **ReStructuredText**: `.rst`
- **AsciiDoc**: `.adoc`

#### Analysis Categories

- **Quality Score**: Overall content quality assessment
- **Clarity Score**: Readability and comprehension metrics
- **Grammar Issues**: Grammar and syntax problems
- **Style Guide Issues**: Style guide compliance violations
- **Tone Score**: Tone appropriateness for the specified tone
- **Terminology Issues**: Terminology consistency problems

#### Available Dialects

- `american_english`
- `british_english`
- And more supported by Acrolinx

#### Available Tones

- `formal`
- `informal`
- `academic`
- And more supported by Acrolinx

#### Available Style Guides

- `ap` (Associated Press)
- `chicago` (Chicago Manual of Style)
- `apa` (American Psychological Association)
- And more supported by Acrolinx

### File Change Statistics

For each file, the action shows:

- **Filename**: Path to the modified file
- **Status**: Type of change (added, modified, deleted, renamed)
- **Additions**: Number of lines added
- **Deletions**: Number of lines removed
- **Total Changes**: Sum of additions and deletions

### Patch Preview

The action provides a preview of the actual code changes:

- **Green lines** (`+`) show added code
- **Red lines** (`-`) show removed code
- **Context lines** show surrounding code for context
- **Truncated display** for large changes (shows first 10 lines)

## Error Handling

The action gracefully handles various error scenarios:

- **Missing Acrolinx token**: Fails the workflow with clear error message
- **Missing GitHub token**: Shows warning and exits gracefully
- **API rate limits**: Logs error and continues execution
- **Invalid commit data**: Skips problematic commits and continues with others
- **File read errors**: Logs warning and skips problematic files
- **Network issues**: Provides clear error messages

## Security

- **API Token**: The Acrolinx API token should be stored as a GitHub secret
- **Token Validation**: The action validates the presence of required tokens
- **Secure Handling**: Tokens are handled securely and not logged

## Development

### Building

```bash
npm install
npm run package
```

### Testing

```bash
npm test
```

### Local Testing

```bash
npm run local-action
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
