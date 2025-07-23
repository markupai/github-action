/**
 * GitHub service for handling API operations
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { CommitInfo, FileChange } from '../types/index.js'
import { withRetry, logError } from '../utils/error-utils.js'
import { getQualityStatus, getBadgeColor } from '../utils/score-utils.js'
import { isValidSHA, isValidQualityScore } from '../utils/type-guards.js'

/**
 * Create GitHub Octokit instance
 */
export function createGitHubClient(
  token: string
): ReturnType<typeof github.getOctokit> {
  return github.getOctokit(token)
}

/**
 * Get commit changes from GitHub API with retry logic
 */
export async function getCommitChanges(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  sha: string
): Promise<CommitInfo | null> {
  try {
    return await withRetry(
      async () => {
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
      },
      undefined,
      `Get commit changes for ${owner}/${repo}@${sha}`
    )
  } catch (error) {
    logError(error, `Failed to get commit changes for ${owner}/${repo}@${sha}`)
    return null
  }
}

/**
 * Get files changed in a pull request
 */
export async function getPullRequestFiles(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string[]> {
  try {
    return await withRetry(
      async () => {
        core.info(`🔍 Fetching files for PR #${prNumber} in ${owner}/${repo}`)

        const response = await octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: prNumber
        })

        core.info(`✅ Found ${response.data.length} files in PR`)
        return response.data.map((file) => file.filename)
      },
      undefined,
      `Get PR files for #${prNumber} in ${owner}/${repo}`
    )
  } catch (error) {
    logError(
      error,
      `Failed to get PR files for #${prNumber} in ${owner}/${repo}`
    )
    return []
  }
}

/**
 * Get all files in repository tree
 */
export async function getRepositoryFiles(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  ref: string = 'main'
): Promise<string[]> {
  try {
    return await withRetry(
      async () => {
        const response = await octokit.rest.git.getTree({
          owner,
          repo,
          tree_sha: ref,
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
      },
      undefined,
      `Get repository files for ${owner}/${repo}@${ref}`
    )
  } catch (error) {
    logError(
      error,
      `Failed to get repository files for ${owner}/${repo}@${ref}`
    )
    return []
  }
}

/**
 * Get repository information
 */
export async function getRepositoryInfo(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string
): Promise<{
  name: string
  fullName: string
  description: string | null
  language: string | null
} | null> {
  try {
    const response = await octokit.rest.repos.get({
      owner,
      repo
    })

    return {
      name: response.data.name,
      fullName: response.data.full_name,
      description: response.data.description,
      language: response.data.language
    }
  } catch (error) {
    core.error(`Failed to get repository info: ${error}`)
    return null
  }
}

/**
 * Update commit status with Acrolinx quality score
 */
export async function updateCommitStatus(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  sha: string,
  qualityScore: number,
  filesAnalyzed: number
): Promise<void> {
  try {
    // Validate inputs
    if (!owner || !repo || !sha) {
      core.error('Invalid parameters for commit status update')
      return
    }

    // Validate SHA format using type guard
    if (!isValidSHA(sha)) {
      core.error(`Invalid SHA format: ${sha}`)
      return
    }

    // Validate quality score using type guard
    if (!isValidQualityScore(qualityScore)) {
      core.error('Quality score must be between 0 and 100')
      return
    }

    const status = getQualityStatus(qualityScore)
    // const emoji = getQualityEmoji(qualityScore)

    // Create a shorter description that fits within GitHub's 140 character limit
    const description = `Quality: ${qualityScore} | Files: ${filesAnalyzed}`

    // Build target URL safely
    const serverUrl = github.context.serverUrl || 'https://github.com'
    const targetUrl = `${serverUrl}/${owner}/${repo}/actions/runs/${github.context.runId}`

    core.info(`🔍 Creating commit status for ${owner}/${repo}@${sha}`)
    core.info(`📊 Status: ${status}, Description: "${description}"`)
    core.info(`🔗 Target URL: ${targetUrl}`)
    core.info(`📝 Context: Acrolinx`)

    // Try with minimal parameters first
    const statusData = {
      owner,
      repo,
      sha,
      state: status,
      description,
      context: 'Acrolinx'
    }

    core.info(`📋 Status data: ${JSON.stringify(statusData, null, 2)}`)

    await octokit.rest.repos.createCommitStatus(statusData)

    core.info(`✅ Updated commit status: ${status} - ${description}`)
  } catch (error) {
    core.error(`Failed to update commit status: ${error}`)
    // Log more details about the error
    if (error && typeof error === 'object' && 'message' in error) {
      core.error(`Error message: ${error.message}`)
    }
  }
}

/**
 * Create or update Acrolinx badge in README
 */
export async function createAcrolinxBadge(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  qualityScore: number,
  branch: string = 'main'
): Promise<void> {
  try {
    // Get current README content
    const readmeResponse = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'README.md',
      ref: branch
    })

    if (
      !Array.isArray(readmeResponse.data) &&
      readmeResponse.data.type === 'file'
    ) {
      const currentContent = Buffer.from(
        readmeResponse.data.content,
        'base64'
      ).toString('utf-8')
      const updatedContent = updateReadmeWithBadge(currentContent, qualityScore)

      if (updatedContent !== currentContent) {
        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: 'README.md',
          message: `docs: update Acrolinx quality badge (${qualityScore})`,
          content: Buffer.from(updatedContent).toString('base64'),
          sha: readmeResponse.data.sha,
          branch
        })

        core.info(`✅ Updated README with Acrolinx badge: ${qualityScore}`)
      } else {
        core.info(
          `ℹ️  README already has current Acrolinx badge: ${qualityScore}`
        )
      }
    }
  } catch (error) {
    core.error(`Failed to update README with Acrolinx badge: ${error}`)
  }
}

/**
 * Update README content with Acrolinx badge
 */
function updateReadmeWithBadge(content: string, qualityScore: number): string {
  const badgeUrl = `https://img.shields.io/badge/Acrolinx%20Quality-${qualityScore}-${getBadgeColor(qualityScore)}?style=flat-square`
  const badgeMarkdown = `![Acrolinx Quality](${badgeUrl})`

  // Check if badge already exists
  const badgePattern =
    /!\[Acrolinx Quality\]\(https:\/\/img\.shields\.io\/badge\/Acrolinx%20Quality-\d+-\w+\?style=flat-square\)/

  if (badgePattern.test(content)) {
    // Replace existing badge
    return content.replace(badgePattern, badgeMarkdown)
  } else {
    // Add badge after the first heading
    const headingMatch = content.match(/^(#+\s+.+)$/m)
    if (headingMatch) {
      const headingIndex =
        content.indexOf(headingMatch[1]) + headingMatch[1].length
      return (
        content.slice(0, headingIndex) +
        '\n\n' +
        badgeMarkdown +
        '\n\n' +
        content.slice(headingIndex)
      )
    } else {
      // Add at the beginning if no heading found
      return badgeMarkdown + '\n\n' + content
    }
  }
}
