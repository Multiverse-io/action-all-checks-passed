import {ActionContext} from './action-context'
// import {console.log} from '@actions/core'

export async function allStatusPassedCheck(
  actionContext: ActionContext
): Promise<void> {
  try {
    const eventPayloadHeadSha = actionContext.context.sha

    console.log(`Getting all checks for ref ${eventPayloadHeadSha}`)

    const checks = await actionContext.octokit.checks.listForRef({
      ...actionContext.context.repo,
      ref: eventPayloadHeadSha
    })

    console.log(`Got back ${checks.data.total_count} checks`)

    const runs = checks.data.check_runs

    if (checks.data.check_runs.length > 0) {
      const currentAllChecksRun = runs.filter(
        value => value.name === 'All checks pass'
      )

      const successfulRuns = runs.filter(
        value =>
          value.conclusion === 'success' && value.name !== 'All checks pass'
      )

      const statusMessage = runs
        .map(
          value =>
            `The check for ${value.name} was ${value.status}: ${value.conclusion}`
        )
        .join('\n')
      console.log(`${successfulRuns.length} runs are successful`)

      const hasSuccessCheckInSuite = currentAllChecksRun.length !== 0

      const totalCheckRuns = hasSuccessCheckInSuite
        ? checks.data.total_count - 1
        : checks.data.total_count

      const conclusion =
        successfulRuns.length === totalCheckRuns ? 'success' : 'failure'

      console.log(`conclusion was ${conclusion}`)

      if (hasSuccessCheckInSuite) {
        console.log('updating existing check')
        actionContext.octokit.checks.update({
          ...actionContext.context.repo,
          //eslint-disable-next-line @typescript-eslint/camelcase
          check_run_id: currentAllChecksRun[0].id,
          status: 'completed',
          conclusion,
          output: {
            title: 'Detail',
            summary: statusMessage
          }
        })
      } else {
        console.log('Adding new check')
        actionContext.octokit.checks.create({
          ...actionContext.context.repo,
          //eslint-disable-next-line @typescript-eslint/camelcase
          head_sha: eventPayloadHeadSha,
          name: 'All checks pass',
          status: 'completed',
          conclusion,
          output: {
            title: 'Detail',
            summary: statusMessage
          }
        })
      }
    }
  } catch (error) {
    actionContext.setFailed(error.message)
  }
}
