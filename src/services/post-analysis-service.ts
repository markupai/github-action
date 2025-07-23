/**
 * Post-analysis service for handling actions after Acrolinx analysis
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { AcrolinxAnalysisResult, EventInfo } from '../types/index.js'
import { EVENT_TYPES } from '../constants/index.js'
import { getAnalysisSummary } from './acrolinx-service.js'
import {
  createOrUpdatePRComment,
  isPullRequestEvent,
  getPRNumber
} from './pr-comment-service.js'
import {
  createGitHubClient,
  updateCommitStatus,
  createAcrolinxBadge
} from './github-service.js'
import { getAnalysisOptions } from '../config/action-config.js'
import { displaySectionHeader } from '../utils/display-utils.js'

/**
 * Handle post-analysis actions based on event type
 */
export async function handlePostAnalysisActions(
  eventInfo: EventInfo,
  results: AcrolinxAnalysisResult[],
  config: { githubToken: string; addCommitStatus: boolean },
  analysisOptions: ReturnType<typeof getAnalysisOptions>
): Promise<void> {
  if (results.length === 0) {
    core.info('No results to process for post-analysis actions.')
    return
  }

  const summary = getAnalysisSummary(results)
  const octokit = createGitHubClient(config.githubToken)
  const { owner, repo } = github.context.repo

  // Handle different event types
  switch (eventInfo.eventType) {
    case EVENT_TYPES.PUSH:
      // Update commit status for push events (if enabled)
      if (config.addCommitStatus) {
        displaySectionHeader('📊 Updating Commit Status')
        await updateCommitStatus(
          octokit,
          owner,
          repo,
          github.context.sha,
          summary.averageQualityScore,
          results.length
        )
      } else {
        core.info('📊 Commit status update disabled by configuration')
      }
      break

    case EVENT_TYPES.WORKFLOW_DISPATCH:
    case EVENT_TYPES.SCHEDULE:
      // Create/update Acrolinx badge for manual/scheduled workflows
      displaySectionHeader('🏷️  Updating Acrolinx Badge')
      await createAcrolinxBadge(
        octokit,
        owner,
        repo,
        summary.averageQualityScore,
        github.context.ref.replace('refs/heads/', '')
      )
      break

    case EVENT_TYPES.PULL_REQUEST:
      // Handle PR comments for pull request events
      if (isPullRequestEvent()) {
        const prNumber = getPRNumber()
        if (prNumber) {
          displaySectionHeader('💬 Creating PR Comment')
          await createOrUpdatePRComment(octokit, {
            owner,
            repo,
            prNumber,
            results,
            config: analysisOptions
          })
        }
      }
      break

    default:
      core.info(
        `No specific post-analysis actions for event type: ${eventInfo.eventType}`
      )
  }
}
