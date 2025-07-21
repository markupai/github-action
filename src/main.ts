import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  styleCheck,
  Config,
  StyleAnalysisReq,
  StyleAnalysisSuccessResp
} from '@acrolinx/typescript-sdk'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Interface for commit information
 */
interface CommitInfo {
  sha: string
  message: string
  author: string
  date: string
  changes: FileChange[]
}

/**
 * Interface for file changes
 */
interface FileChange {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
}

/**
 * Interface for Acrolinx analysis result
 */
interface AcrolinxAnalysisResult {
  filePath: string
  result: StyleAnalysisSuccessResp
  timestamp: string
}

/**
 * Supported file extensions for Acrolinx analysis
 */
const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.markdown', '.rst', '.adoc']

/**
 * Check if a file is supported for Acrolinx analysis
 */
function isSupportedFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return SUPPORTED_EXTENSIONS.includes(ext)
}

/**
 * Read file content safely
 */
async function readFileContent(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    core.warning(`Failed to read file ${filePath}: ${error}`)
    return null
  }
}

/**
 * Run Acrolinx style check on a file
 */
async function runAcrolinxCheck(
  filePath: string,
  content: string,
  config: Config,
  dialect: string,
  tone: string,
  styleGuide: string
): Promise<AcrolinxAnalysisResult | null> {
  try {
    core.info(`🔍 Running Acrolinx check on: ${filePath}`)

    const request: StyleAnalysisReq = {
      content,
      dialect,
      tone,
      style_guide: styleGuide,
      documentName: path.basename(filePath)
    }

    const result = await styleCheck(request, config)

    return {
      filePath,
      result,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    core.error(`Failed to run Acrolinx check on ${filePath}: ${error}`)
    return null
  }
}

/**
 * Get commit changes from GitHub API
 */
async function getCommitChanges(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  sha: string
): Promise<CommitInfo | null> {
  try {
    const response = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha
    })

    const commit = response.data
    const changes: FileChange[] =
      commit.files?.map(
        (file: {
          filename: string
          status: string
          additions?: number
          deletions?: number
          changes?: number
          patch?: string
        }) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions || 0,
          deletions: file.deletions || 0,
          changes: file.changes || 0,
          patch: file.patch
        })
      ) || []

    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || new Date().toISOString(),
      changes
    }
  } catch (error) {
    core.error(`Failed to get commit changes: ${error}`)
    return null
  }
}

/**
 * Display commit changes in a formatted way
 */
function displayCommitChanges(commitInfo: CommitInfo): void {
  core.info(`📝 Commit: ${commitInfo.sha.substring(0, 8)}`)
  core.info(`📄 Message: ${commitInfo.message}`)
  core.info(`👤 Author: ${commitInfo.author}`)
  core.info(`📅 Date: ${commitInfo.date}`)
  core.info(`📊 Changes:`)

  commitInfo.changes.forEach((change, index) => {
    core.info(`  ${index + 1}. ${change.filename} (${change.status})`)
    core.info(
      `     +${change.additions} -${change.deletions} (${change.changes} total changes)`
    )

    if (change.patch) {
      core.info(`     Patch preview:`)
      const patchLines = change.patch.split('\n').slice(0, 10) // Show first 10 lines
      patchLines.forEach((line) => {
        if (line.startsWith('+')) {
          core.info(`     + ${line.substring(1)}`)
        } else if (line.startsWith('-')) {
          core.info(`     - ${line.substring(1)}`)
        } else {
          core.info(`       ${line}`)
        }
      })
      if (change.patch.split('\n').length > 10) {
        core.info(`     ... (truncated)`)
      }
    }
    core.info('')
  })
}

/**
 * Display Acrolinx analysis results
 */
function displayAcrolinxResults(results: AcrolinxAnalysisResult[]): void {
  if (results.length === 0) {
    core.info('📊 No Acrolinx analysis results to display.')
    return
  }

  core.info('📊 Acrolinx Analysis Results:')
  core.info('='.repeat(50))

  results.forEach((analysis, index) => {
    const { filePath, result } = analysis
    core.info(`\n📄 File: ${filePath}`)
    core.info(`📈 Quality Score: ${result.scores.quality.score}`)
    core.info(`📝 Clarity Score: ${result.scores.clarity.score}`)
    core.info(`🔤 Grammar Issues: ${result.scores.grammar.issues}`)
    core.info(`📋 Style Guide Issues: ${result.scores.style_guide.issues}`)
    core.info(`🎭 Tone Score: ${result.scores.tone.score}`)
    core.info(`📚 Terminology Issues: ${result.scores.terminology.issues}`)

    if (result.issues.length > 0) {
      core.info(`\n⚠️  Issues Found:`)
      result.issues.slice(0, 5).forEach((issue, issueIndex) => {
        core.info(`  ${issueIndex + 1}. ${issue.subcategory}`)
        core.info(`     Original: "${issue.original}"`)
        core.info(`     Category: ${issue.category}`)
        core.info(`     Position: ${issue.char_index}`)
      })
      if (result.issues.length > 5) {
        core.info(`     ... and ${result.issues.length - 5} more issues`)
      }
    } else {
      core.info('✅ No issues found!')
    }

    if (index < results.length - 1) {
      core.info('─'.repeat(50))
    }
  })
}

/**
 * Get recent commits from the repository
 */
async function getRecentCommits(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  branch: string = 'main',
  limit: number = 5
): Promise<CommitInfo[]> {
  try {
    const response = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: limit
    })

    const commits: CommitInfo[] = []

    for (const commit of response.data) {
      const commitInfo = await getCommitChanges(
        octokit,
        owner,
        repo,
        commit.sha
      )
      if (commitInfo) {
        commits.push(commitInfo)
      }
    }

    return commits
  } catch (error) {
    core.error(`Failed to get recent commits: ${error}`)
    return []
  }
}

/**
 * Run Acrolinx analysis on modified files
 */
async function runAcrolinxAnalysis(
  commits: CommitInfo[],
  acrolinxConfig: Config,
  dialect: string,
  tone: string,
  styleGuide: string
): Promise<AcrolinxAnalysisResult[]> {
  const results: AcrolinxAnalysisResult[] = []
  const processedFiles = new Set<string>()

  for (const commit of commits) {
    for (const change of commit.changes) {
      // Only process supported files that haven't been processed yet
      if (
        isSupportedFile(change.filename) &&
        !processedFiles.has(change.filename)
      ) {
        processedFiles.add(change.filename)

        // Try to read the file content
        const content = await readFileContent(change.filename)
        if (content) {
          const result = await runAcrolinxCheck(
            change.filename,
            content,
            acrolinxConfig,
            dialect,
            tone,
            styleGuide
          )
          if (result) {
            results.push(result)
          }
        }
      }
    }
  }

  return results
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const acrolinxApiToken = core.getInput('acrolinx_token', {
      required: true
    })
    const dialect = core.getInput('dialect') || 'american_english'
    const tone = core.getInput('tone') || 'formal'
    const styleGuide = core.getInput('style-guide') || 'ap'
    const commitLimit = parseInt(core.getInput('commit-limit') || '3', 10)

    // Validate Acrolinx API token
    if (!acrolinxApiToken) {
      core.setFailed('Acrolinx API token is required')
      return
    }

    // Configure Acrolinx
    const acrolinxConfig: Config = {
      apiKey: acrolinxApiToken
    }

    // Get GitHub token and context
    const githubToken = core.getInput('github_token', { required: true })
    if (!githubToken) {
      core.warning(
        'GitHub token not provided. Cannot fetch commit information.'
      )
      return
    }

    const octokit = github.getOctokit(githubToken)
    const context = github.context

    core.info('🔍 Fetching recent commit changes...')

    // Get recent commits
    const commits = await getRecentCommits(
      octokit,
      context.repo.owner,
      context.repo.repo,
      context.ref.replace('refs/heads/', ''),
      commitLimit
    )

    if (commits.length > 0) {
      core.info(`📋 Found ${commits.length} recent commits:`)
      core.info('='.repeat(50))

      commits.forEach((commit, index) => {
        core.info(`\n📌 Commit ${index + 1}:`)
        displayCommitChanges(commit)
        if (index < commits.length - 1) {
          core.info('─'.repeat(50))
        }
      })

      // Run Acrolinx analysis on modified files
      core.info('\n🔍 Running Acrolinx analysis on modified files...')
      const acrolinxResults = await runAcrolinxAnalysis(
        commits,
        acrolinxConfig,
        dialect,
        tone,
        styleGuide
      )

      // Display Acrolinx results
      displayAcrolinxResults(acrolinxResults)

      // Set outputs
      core.setOutput('commits-analyzed', commits.length.toString())
      core.setOutput('last-commit-sha', commits[0]?.sha || '')
      core.setOutput('acrolinx-results', JSON.stringify(acrolinxResults))

      // Print JSON results to console as requested
      core.info('\n📊 Acrolinx Analysis Results (JSON):')
      core.info('='.repeat(50))
      core.info(JSON.stringify(acrolinxResults, null, 2))
    } else {
      core.info('No commits found or failed to fetch commit information.')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
