import { sendMessage } from './kango.client.js'
import { TOOL_DEFINITIONS, executeTool } from './tools/index.js'
import { getNicheSettingsForAccount } from '../auth/account.service.js'
import { ExternalServiceError } from '../../shared/errors/index.js'

/**
 * POST /ai/chat
 * Flow:
 *   1) Send user message + tools to Kango
 *   2) If Kango returns toolCalls, execute each (with accountId injected)
 *   3) Send tool results back to Kango for final reply
 *   4) Return final reply to client
 *
 * If dryRun flag is present in a tool call's arguments, the tool
 * returns a preview object without persisting anything.
 * The frontend should then confirm before calling again without dryRun.
 */
export async function chat(req, res, next) {
  try {
    const { message, conversationHistory = [] } = req.body
    const accountId = req.user.accountId

    const nicheSettings = await getNicheSettingsForAccount(accountId).catch(() => null)

    // First turn: send message + available tools
    const firstResponse = await sendMessage({
      message,
      history: conversationHistory,
      tools: TOOL_DEFINITIONS,
      nicheSettings,
    })

    if (!firstResponse.toolCalls?.length) {
      return res.json({ reply: firstResponse.reply, toolCalls: [] })
    }

    // Execute tool calls
    const toolResults = await Promise.all(
      firstResponse.toolCalls.map(async ({ name, arguments: args }) => {
        try {
          const result = await executeTool(name, args, accountId)
          return { name, result }
        } catch (err) {
          return { name, error: err.message }
        }
      })
    )

    // Second turn: send tool results to get final answer
    const finalResponse = await sendMessage({
      message,
      history: conversationHistory,
      tools: TOOL_DEFINITIONS,
      toolResults,
      nicheSettings,
    })

    res.json({
      reply: finalResponse.reply,
      toolCalls: firstResponse.toolCalls,
      toolResults,
    })
  } catch (err) {
    if (err.message?.includes('Kango API error')) {
      return next(new ExternalServiceError(err.message))
    }
    next(err)
  }
}
