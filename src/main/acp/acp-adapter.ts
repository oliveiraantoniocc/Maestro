/**
 * ACP to ParsedEvent Adapter
 *
 * Converts ACP session updates to Maestro's internal ParsedEvent format,
 * enabling seamless integration with existing UI components.
 */

import type { ParsedEvent } from '../parsers/agent-output-parser';
import type {
  SessionUpdate,
  SessionId,
  ContentBlock,
  ToolCall,
  ToolCallUpdate,
  ToolCallStatus,
} from './types';

/**
 * Extract text from a ContentBlock
 */
function extractText(block: ContentBlock): string {
  if ('text' in block) {
    return block.text.text;
  }
  if ('image' in block) {
    return '[image]';
  }
  if ('resource_link' in block) {
    return `[resource: ${block.resource_link.name}]`;
  }
  if ('resource' in block) {
    const res = block.resource.resource;
    if ('text' in res) {
      return res.text;
    }
    return '[binary resource]';
  }
  return '';
}

/**
 * Map ACP ToolCallStatus to Maestro status
 */
function mapToolStatus(status?: ToolCallStatus): string {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'in_progress':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'error';
    default:
      return 'pending';
  }
}

/**
 * Convert an ACP SessionUpdate to a Maestro ParsedEvent
 */
export function acpUpdateToParseEvent(
  sessionId: SessionId,
  update: SessionUpdate
): ParsedEvent | null {
  // Agent message chunk (streaming text)
  if ('agent_message_chunk' in update) {
    const text = extractText(update.agent_message_chunk.content);
    return {
      type: 'text',
      text,
      isPartial: true,
      sessionId,
    };
  }

  // Agent thought chunk (thinking/reasoning)
  if ('agent_thought_chunk' in update) {
    const text = extractText(update.agent_thought_chunk.content);
    return {
      type: 'thinking',
      text,
      isPartial: true,
      sessionId,
    };
  }

  // User message chunk (echo of user input)
  if ('user_message_chunk' in update) {
    // Usually not displayed, but can be used for confirmation
    return null;
  }

  // Tool call started
  if ('tool_call' in update) {
    const tc = update.tool_call;
    return {
      type: 'tool_use',
      toolName: tc.title,
      toolInput: tc.rawInput,
      toolId: tc.toolCallId,
      status: mapToolStatus(tc.status),
      sessionId,
    };
  }

  // Tool call update
  if ('tool_call_update' in update) {
    const tc = update.tool_call_update;
    return {
      type: 'tool_use',
      toolName: tc.title || '',
      toolInput: tc.rawInput,
      toolOutput: tc.rawOutput,
      toolId: tc.toolCallId,
      status: mapToolStatus(tc.status),
      sessionId,
    };
  }

  // Plan update
  if ('plan' in update) {
    const entries = update.plan.entries.map((e) => ({
      content: e.content,
      status: e.status,
      priority: e.priority,
    }));
    return {
      type: 'plan',
      entries,
      sessionId,
    };
  }

  // Available commands update
  if ('available_commands_update' in update) {
    // Map to slash commands for UI
    return {
      type: 'init',
      slashCommands: update.available_commands_update.availableCommands.map((c) => c.name),
      sessionId,
    };
  }

  // Mode update
  if ('current_mode_update' in update) {
    // Could emit a mode change event
    return null;
  }

  return null;
}

/**
 * Create a session_id event from ACP session creation
 */
export function createSessionIdEvent(sessionId: SessionId): ParsedEvent {
  return {
    type: 'session_id',
    sessionId,
  };
}

/**
 * Create a result event from ACP prompt response
 */
export function createResultEvent(
  sessionId: SessionId,
  text: string,
  stopReason: string
): ParsedEvent {
  return {
    type: 'result',
    text,
    sessionId,
    stopReason,
  };
}

/**
 * Create an error event
 */
export function createErrorEvent(sessionId: SessionId, message: string): ParsedEvent {
  return {
    type: 'error',
    error: {
      type: 'unknown',
      message,
      recoverable: false,
    },
    sessionId,
  };
}
