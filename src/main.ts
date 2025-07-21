import * as core from '@actions/core'
import * as github from '@actions/github'

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
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const commitLimit: number = parseInt(
      core.getInput('commit-limit') || '3',
      10
    )

    const token = core.getInput('github-token') || process.env.GITHUB_TOKEN
    if (!token) {
      core.warning(
        'GitHub token not provided. Cannot fetch commit information.'
      )
      return
    }

    const octokit = github.getOctokit(token)
    const context = github.context

    core.info('🔍 Fetching recent commit changes...')

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
    } else {
      core.info('No commits found or failed to fetch commit information.')
    }

    // Set outputs for other workflow steps to use
    core.setOutput('commits-analyzed', commits.length.toString())
    core.setOutput('last-commit-sha', commits[0]?.sha || '')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
