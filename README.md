# Acrolinx Analyzer

[![Build and Test](https://github.com/acrolinx/nextgen-analyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/acrolinx/nextgen-analyzer/actions/workflows/ci.yml)
[![Coverage](https://github.com/acrolinx/nextgen-analyzer/blob/main/badges/coverage.svg)](https://github.com/acrolinx/nextgen-analyzer)

A GitHub Action that analyzes commit changes and runs Acrolinx style checks on
modified files. Automatically adapts to different GitHub events and provides
detailed quality analysis with commit status updates and PR comments.

## Features

- 🔍 **Smart File Discovery**: Automatically detects files to analyze based on
  GitHub event type
- 📝 **Event-Based Analysis**: Optimized behavior for push, pull request,
  manual, and scheduled events
- ✨ **Acrolinx Integration**: Comprehensive grammar, tone, and style guide
  checking
- 📊 **Quality Scoring**: Detailed quality, clarity, grammar, and tone metrics
- 🏷️ **Visual Feedback**: Commit status updates
- 🔄 **Batch Processing**: Efficient analysis of multiple files
- 📋 **Rich Outputs**: JSON results and detailed reporting

## Supported File Types

- **Markdown**: `.md`, `.markdown`
- **Text**: `.txt`
- **ReStructuredText**: `.rst`
- **AsciiDoc**: `.adoc`

## Usage

### Basic Usage

```yaml
name: Analyze with Acrolinx
on: [push, pull_request]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Acrolinx Analysis
        uses: acrolinx/nextgen-analyzer@v1
        with:
          acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration

```yaml
name: Custom Acrolinx Analysis
on: [push]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Custom Analysis
        uses: acrolinx/nextgen-analyzer@v1
        with:
          acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          dialect: 'british_english'
          tone: 'academic'
          style-guide: 'chicago'
          add_commit_status: 'true'
```

## Required Tokens

The action requires two tokens to function properly. You can provide them either
as action inputs or environment variables:

### Acrolinx Token

- **Required**: Yes
- **Input name**: `acrolinx_token`
- **Environment variable**: `ACROLINX_TOKEN`
- **Purpose**: Authenticates with Acrolinx API for style checking

### GitHub Token

- **Required**: Yes
- **Input name**: `github_token`
- **Environment variable**: `GITHUB_TOKEN`
- **Purpose**: Authenticates with GitHub API for repository access

### Providing Tokens

**Option 1: As Action Inputs (Recommended)**

```yaml
- name: Run Acrolinx Analysis
  uses: acrolinx/nextgen-analyzer@v1
  with:
    acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
```

**Option 2: As Environment Variables**

```yaml
- name: Run Acrolinx Analysis
  uses: acrolinx/nextgen-analyzer@v1
  env:
    ACROLINX_TOKEN: ${{ secrets.ACROLINX_TOKEN }}
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Option 3: Mixed (Input takes precedence)**

```yaml
- name: Run Acrolinx Analysis
  uses: acrolinx/nextgen-analyzer@v1
  with:
    acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input               | Description                                                                                           | Required | Default            |
| ------------------- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------ |
| `acrolinx_token`    | Acrolinx API token for style checking. Can also be provided via `ACROLINX_TOKEN` environment variable | Yes      | -                  |
| `github_token`      | GitHub token for API access. Can also be provided via `GITHUB_TOKEN` environment variable             | Yes      | -                  |
| `dialect`           | Language dialect for analysis (e.g., `american_english`, `british_english`)                           | No       | `american_english` |
| `tone`              | Tone for analysis (e.g., `formal`, `informal`, `academic`)                                            | No       | `formal`           |
| `style-guide`       | Style guide for analysis (e.g., `ap`, `chicago`, `apa`)                                               | No       | `ap`               |
| `add_commit_status` | Whether to add commit status updates                                                                  | No       | `true`             |

## Outputs

| Output             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `event-type`       | Type of GitHub event that triggered the action   |
| `files-analyzed`   | Number of files analyzed                         |
| `acrolinx-results` | JSON string containing Acrolinx analysis results |

## Event Types and Behavior

The action automatically adapts its behavior based on the GitHub event type:

### Push Events (`on: [push]`)

- **Scope**: Analyzes only files modified in the push
- **Features**: Commit status updates with quality score
- **Use Case**: Quick analysis of direct commits

### Pull Request Events (`on: [pull_request]`)

- **Scope**: Analyzes files changed in the PR
- **Features**: Detailed PR comments with analysis results
- **Use Case**: Pre-merge quality checks

### Manual Workflows (`on: [workflow_dispatch]`)

- **Scope**: Analyzes all supported files in repository
- **Features**: Comprehensive repository-wide analysis
- **Use Case**: Manual quality checks and monitoring

### Scheduled Workflows (`on: [schedule]`)

- **Scope**: Analyzes all supported files in repository
- **Features**: Periodic quality monitoring
- **Use Case**: Automated quality checks

## Examples

### Basic Push Analysis

```yaml
name: Push Analysis
on: [push]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Analyze Changes
        uses: acrolinx/nextgen-analyzer@v1
        with:
          acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Pull Request Quality Gate

```yaml
name: PR Quality Check
on: [pull_request]
jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Quality Analysis
        id: analysis
        uses: acrolinx/nextgen-analyzer@v1
        with:
          acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          dialect: 'american_english'
          tone: 'formal'
          style-guide: 'ap'

      - name: Check Quality Score
        run: |
          results='${{ steps.analysis.outputs.acrolinx-results }}'
          # Add your quality threshold logic here
```

### Scheduled Repository Analysis

```yaml
name: Daily Quality Check
on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Full Repository Analysis
        uses: acrolinx/nextgen-analyzer@v1
        with:
          acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Using Outputs

```yaml
name: Analysis with Outputs
on: [push]
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Analysis
        id: acrolinx
        uses: acrolinx/nextgen-analyzer@v1
        with:
          acrolinx_token: ${{ secrets.ACROLINX_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

      - name: Display Results
        run: |
          echo "Event: ${{ steps.acrolinx.outputs.event-type }}"
          echo "Files: ${{ steps.acrolinx.outputs.files-analyzed }}"
          echo "Results: ${{ steps.acrolinx.outputs.acrolinx-results }}"

```

## Analysis Configuration

### Available Dialects

- `american_english` - American English
- `british_english` - British English
- And more supported by Acrolinx

### Available Tones

- `formal` - Formal writing style
- `informal` - Informal writing style
- `academic` - Academic writing style
- And more supported by Acrolinx

### Available Style Guides

- `ap` - Associated Press Style Guide
- `chicago` - Chicago Manual of Style
- `apa` - American Psychological Association
- And more supported by Acrolinx

## Quality Scoring

The action provides comprehensive quality metrics:

- **Quality Score**: Overall content quality assessment (0-100)
- **Clarity Score**: Readability and comprehension metrics
- **Grammar Score**: Grammar and syntax quality
- **Style Guide Score**: Style guide compliance
- **Tone Score**: Tone appropriateness for specified tone
- **Terminology Score**: Terminology consistency

### Quality Thresholds

- 🟢 **80+**: Excellent quality
- 🟡 **60-79**: Good quality with room for improvement
- 🔴 **0-59**: Needs significant improvement

## Visual Feedback

### Commit Status Updates (Push Events)

For push events, the action automatically updates commit status with:

- Quality score indicator
- Number of files analyzed
- Direct link to workflow run



### Pull Request Comments

For pull request events, the action creates detailed comments with:

- Quality score summary
- Detailed metrics table
- Configuration used
- Specific issues found

## Example Output

```

🔍 Running Acrolinx analysis on modified files... 📄 File: README.md 📈 Quality
Score: 85.2 📝 Clarity Score: 78.5 🔤 Grammar Issues: 2 📋 Style Guide Issues: 1
🎭 Tone Score: 82.3 📚 Terminology Issues: 0

⚠️ Issues Found:

1. passive_voice Original: "This document describes" Category: style_guide
   Position: 45
2. complex_sentence Original: "This document describes the new feature that was
   implemented" Category: sentence_structure Position: 67

````

## Error Handling

The action gracefully handles various scenarios:

- **Missing Acrolinx token**: Fails with clear error message
- **Missing GitHub token**: Shows warning and continues
- **API rate limits**: Logs error and continues execution
- **Invalid commit data**: Skips problematic commits
- **File read errors**: Logs warning and skips files
- **Network issues**: Provides clear error messages

## Security

- **API Token**: Store Acrolinx API token as GitHub secret
- **Token Validation**: Action validates required tokens
- **Secure Handling**: Tokens handled securely and not logged

## Local Development

### Prerequisites

- Node.js 20+
- Acrolinx API token

### Setup

```bash
# Clone the repository
git clone https://github.com/acrolinx/nextgen-analyzer.git
cd nextgen-analyzer

# Install dependencies
npm install

# Set up environment variables
export ACROLINX_TOKEN=your-acrolinx-token
export GITHUB_TOKEN=your-github-token

# Run locally
npm run local-action
````

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run ci-test

# Check formatting
npm run format:check

# Lint code
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Support

- 📖 [Documentation](https://github.com/acrolinx/nextgen-analyzer#readme)
- 🐛 [Issues](https://github.com/acrolinx/nextgen-analyzer/issues)
- 💬 [Discussions](https://github.com/acrolinx/nextgen-analyzer/discussions)

## Related

- [Acrolinx Platform](https://www.acrolinx.com/) - Content quality platform
- [Acrolinx TypeScript SDK](https://github.com/acrolinx/typescript-sdk) -
  Official SDK
- [GitHub Actions Documentation](https://docs.github.com/en/actions) - Learn
  more about GitHub Actions
