# GitHub Commit Changes Analyzer

A GitHub Action that analyzes and displays recent commit changes with detailed
diffs and file modifications.

## Features

- 📝 **Commit analysis**: Show recent commits with detailed information
- 📊 **Change statistics**: Display additions, deletions, and total changes per
  file
- 🔍 **Diff preview**: Show patch previews for modified files
- 🎯 **Configurable**: Control how many commits to show and which branch to
  analyze
- 📈 **Output data**: Provides commit count and latest commit SHA for downstream
  steps

## Inputs

| Input          | Description                                                  | Required | Default |
| -------------- | ------------------------------------------------------------ | -------- | ------- |
| `commit-limit` | Number of recent commits to show (max 10)                    | No       | `3`     |
| `github-token` | GitHub token for API access (uses `GITHUB_TOKEN` by default) | No       | -       |

## Outputs

| Output             | Description                            |
| ------------------ | -------------------------------------- |
| `commits-analyzed` | Number of commits that were analyzed   |
| `last-commit-sha`  | SHA of the most recent commit analyzed |

## Usage

### Basic Usage

```yaml
name: Analyze Commit Changes
on: [push]
jobs:
  commit-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Analyze Recent Commits
        uses: ./
        with:
          commit-limit: '5'
```

### Custom GitHub Token

```yaml
name: Custom Token Usage
on: [push]
jobs:
  custom-token:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Custom Token
        uses: ./
        with:
          commit-limit: '10'
          github-token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
```

### Using Outputs

```yaml
name: Use Commit Analysis Outputs
on: [push]
jobs:
  analyze-and-notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Analyze Commits
        id: commit-analyzer
        uses: ./
        with:
          commit-limit: '3'

      - name: Use Analysis Results
        run: |
          echo "Analyzed ${{ steps.commit-analyzer.outputs.commits-analyzed }} commits"
          echo "Latest commit: ${{ steps.commit-analyzer.outputs.last-commit-sha }}"
```

## Example Output

The action will output detailed commit information:

```
🔍 Fetching recent commit changes...
📋 Found 3 recent commits:
==================================================

📌 Commit 1:
📝 Commit: abc12345
📄 Message: feat: add new authentication feature
👤 Author: John Doe
📅 Date: 2024-01-15T10:30:00Z
📊 Changes:
  1. src/auth.ts (modified)
     +45 -12 (57 total changes)
     Patch preview:
     + export interface AuthConfig {
     +   apiKey: string;
     +   secret: string;
     + }
     - const auth = require('./auth');
     + import { AuthConfig } from './auth';
     ... (truncated)

  2. tests/auth.test.ts (added)
     +23 -0 (23 total changes)
     Patch preview:
     + describe('Authentication', () => {
     +   it('should validate API key', () => {
     +     expect(validateApiKey('test-key')).toBe(true);
     +   });
     + });
     ... (truncated)
```

## Features in Detail

### Commit Information Displayed

- **Commit SHA**: Short hash of the commit
- **Commit Message**: The commit message/description
- **Author**: Name of the person who made the commit
- **Date**: When the commit was made
- **File Changes**: List of all modified files with statistics

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

- **Missing GitHub token**: Shows warning and exits gracefully
- **API rate limits**: Logs error and continues execution
- **Invalid commit data**: Skips problematic commits and continues with others
- **Network issues**: Provides clear error messages

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
