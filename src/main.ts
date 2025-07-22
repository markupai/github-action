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
 * Interface for event information
 */
interface EventInfo {
  eventType: string
  description: string
  filesCount: number
  additionalInfo?: Record<string, unknown>
}

/**
 * Interface for file discovery strategy
 */
interface FileDiscoveryStrategy {
  getFilesToAnalyze(): Promise<string[]>
  getEventInfo(): EventInfo
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
 * Run Acrolinx analysis on a list of files
 */
async function runAcrolinxAnalysis(
  files: string[],
  acrolinxConfig: Config,
  dialect: string,
  tone: string,
  styleGuide: string
): Promise<AcrolinxAnalysisResult[]> {
  const results: AcrolinxAnalysisResult[] = []

  for (const filePath of files) {
    // Only process supported files
    if (isSupportedFile(filePath)) {
      // Try to read the file content
      const content = await readFileContent(filePath)
      if (content) {
        const result = await runAcrolinxCheck(
          filePath,
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

  return results
}

/**
 * Push Event Strategy - Analyze files modified in the push
 */
class PushEventStrategy implements FileDiscoveryStrategy {
  constructor(
    private octokit: ReturnType<typeof github.getOctokit>,
    private owner: string,
    private repo: string,
    private sha: string
  ) {}

  async getFilesToAnalyze(): Promise<string[]> {
    const commit = await getCommitChanges(
      this.octokit,
      this.owner,
      this.repo,
      this.sha
    )
    if (!commit) {
      return []
    }
    return commit.changes.map((change) => change.filename)
  }

  getEventInfo(): EventInfo {
    return {
      eventType: 'push',
      description: 'Files modified in push event',
      filesCount: 0, // Will be updated after file discovery
      additionalInfo: {
        commitSha: this.sha
      }
    }
  }
}

/**
 * Pull Request Event Strategy - Analyze files changed in the PR
 */
class PullRequestEventStrategy implements FileDiscoveryStrategy {
  constructor(
    private octokit: ReturnType<typeof github.getOctokit>,
    private owner: string,
    private repo: string,
    private prNumber: number
  ) {}

  async getFilesToAnalyze(): Promise<string[]> {
    try {
      const response = await this.octokit.rest.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: this.prNumber
      })

      return response.data.map((file) => file.filename)
    } catch (error) {
      core.error(`Failed to get PR files: ${error}`)
      return []
    }
  }

  getEventInfo(): EventInfo {
    return {
      eventType: 'pull_request',
      description: 'Files changed in pull request',
      filesCount: 0, // Will be updated after file discovery
      additionalInfo: {
        prNumber: this.prNumber
      }
    }
  }
}

/**
 * Manual Workflow Strategy - Analyze all files in repository
 */
class ManualWorkflowStrategy implements FileDiscoveryStrategy {
  constructor(
    private octokit: ReturnType<typeof github.getOctokit>,
    private owner: string,
    private repo: string,
    private ref: string = 'main'
  ) {}

  async getFilesToAnalyze(): Promise<string[]> {
    try {
      const response = await this.octokit.rest.git.getTree({
        owner: this.owner,
        repo: this.repo,
        tree_sha: this.ref,
        recursive: 'true'
      })

      const files: string[] = []
      if (response.data.tree) {
        for (const item of response.data.tree) {
          if (item.type === 'blob' && item.path) {
            files.push(item.path)
          }
        }
      }

      return files
    } catch (error) {
      core.error(`Failed to get repository files: ${error}`)
      return []
    }
  }

  getEventInfo(): EventInfo {
    return {
      eventType: 'workflow_dispatch',
      description: 'All files in repository (manual trigger)',
      filesCount: 0, // Will be updated after file discovery
      additionalInfo: {
        ref: this.ref
      }
    }
  }
}

/**
 * Factory function to create appropriate strategy based on event type
 */
export function createFileDiscoveryStrategy(
  octokit: ReturnType<typeof github.getOctokit>,
  context: typeof github.context
): FileDiscoveryStrategy {
  const { eventName } = context

  switch (eventName) {
    case 'push':
      return new PushEventStrategy(
        octokit,
        context.repo.owner,
        context.repo.repo,
        context.sha
      )

    case 'pull_request':
      return new PullRequestEventStrategy(
        octokit,
        context.repo.owner,
        context.repo.repo,
        context.issue.number
      )

    case 'workflow_dispatch':
      return new ManualWorkflowStrategy(
        octokit,
        context.repo.owner,
        context.repo.repo
      )

    default:
      // For other events, default to push strategy
      core.warning(`Unsupported event type: ${eventName}. Using push strategy.`)
      return new PushEventStrategy(
        octokit,
        context.repo.owner,
        context.repo.repo,
        context.sha
      )
  }
}

/**
 * Display event information
 */
function displayEventInfo(eventInfo: EventInfo): void {
  core.info(`📋 Event Type: ${eventInfo.eventType}`)
  core.info(`📄 Description: ${eventInfo.description}`)
  core.info(`📊 Files to analyze: ${eventInfo.filesCount}`)

  if (eventInfo.additionalInfo) {
    core.info(`📌 Additional Info:`)
    Object.entries(eventInfo.additionalInfo).forEach(([key, value]) => {
      core.info(`   ${key}: ${value}`)
    })
  }
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const acrolinxApiToken =
      core.getInput('acrolinx_token') || process.env.ACROLNX_TOKEN
    const dialect = core.getInput('dialect') || 'american_english'
    const tone = core.getInput('tone') || 'formal'
    const styleGuide = core.getInput('style-guide') || 'ap'

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
    const githubToken =
      core.getInput('github_token') || process.env.GITHUB_TOKEN
    if (!githubToken) {
      core.warning(
        'GitHub token not provided. Cannot fetch commit information.'
      )
      return
    }

    const octokit = github.getOctokit(githubToken)
    const context = github.context

    core.info('🔍 Initializing file discovery strategy...')

    // Create appropriate strategy based on event type
    const strategy = createFileDiscoveryStrategy(octokit, context)
    const eventInfo = strategy.getEventInfo()

    core.info(`📋 Event Analysis:`)
    core.info('='.repeat(50))
    displayEventInfo(eventInfo)

    // Get files to analyze
    core.info('\n🔍 Discovering files to analyze...')
    const filesToAnalyze = await strategy.getFilesToAnalyze()

    // Update event info with actual file count
    eventInfo.filesCount = filesToAnalyze.length
    core.info(`📊 Found ${filesToAnalyze.length} files to analyze`)

    if (filesToAnalyze.length > 0) {
      // Display files being analyzed
      core.info('\n📄 Files to analyze:')
      filesToAnalyze.slice(0, 10).forEach((file, index) => {
        core.info(`  ${index + 1}. ${file}`)
      })
      if (filesToAnalyze.length > 10) {
        core.info(`  ... and ${filesToAnalyze.length - 10} more files`)
      }

      // Run Acrolinx analysis on discovered files
      core.info('\n🔍 Running Acrolinx analysis...')
      const acrolinxResults = await runAcrolinxAnalysis(
        filesToAnalyze,
        acrolinxConfig,
        dialect,
        tone,
        styleGuide
      )

      // Display Acrolinx results
      displayAcrolinxResults(acrolinxResults)

      // Set outputs
      core.setOutput('event-type', eventInfo.eventType)
      core.setOutput('files-analyzed', filesToAnalyze.length.toString())
      core.setOutput('acrolinx-results', JSON.stringify(acrolinxResults))

      // Print JSON results to console as requested
      core.info('\n📊 Acrolinx Analysis Results (JSON):')
      core.info('='.repeat(50))
      core.info(JSON.stringify(acrolinxResults, null, 2))
    } else {
      core.info('No files found to analyze.')
      core.setOutput('event-type', eventInfo.eventType)
      core.setOutput('files-analyzed', '0')
      core.setOutput('acrolinx-results', JSON.stringify([]))
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
