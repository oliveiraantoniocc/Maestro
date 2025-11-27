import type { Session } from '../types';

/**
 * Template Variable System for Custom AI Commands
 *
 * Available variables (case-insensitive):
 *
 * Session Variables:
 *   {{SESSION_ID}}        - Maestro session ID (unique identifier)
 *   {{SESSION_NAME}}      - Current session name
 *   {{CLAUDE_SESSION_ID}} - Claude Code session ID (for conversation continuity)
 *   {{TOOL_TYPE}}         - Agent type (claude-code, aider, etc.)
 *
 * Project Variables:
 *   {{PROJECT_PATH}}      - Full path to project directory
 *   {{PROJECT_NAME}}      - Project folder name (last segment of path)
 *   {{CWD}}               - Current working directory (alias for PROJECT_PATH)
 *
 * Date/Time Variables:
 *   {{DATE}}              - Current date (YYYY-MM-DD)
 *   {{TIME}}              - Current time (HH:MM:SS)
 *   {{DATETIME}}          - Full datetime (YYYY-MM-DD HH:MM:SS)
 *   {{TIMESTAMP}}         - Unix timestamp in milliseconds
 *   {{DATE_SHORT}}        - Short date (MM/DD/YY)
 *   {{TIME_SHORT}}        - Short time (HH:MM)
 *   {{YEAR}}              - Current year (YYYY)
 *   {{MONTH}}             - Current month (01-12)
 *   {{DAY}}               - Current day (01-31)
 *   {{WEEKDAY}}           - Day of week (Monday, Tuesday, etc.)
 *
 * Git Variables (if available):
 *   {{GIT_BRANCH}}        - Current git branch name (requires git repo)
 *   {{IS_GIT_REPO}}       - "true" or "false"
 *
 * Context Variables:
 *   {{CONTEXT_USAGE}}     - Current context window usage percentage
 *   {{INPUT_MODE}}        - Current input mode (ai or terminal)
 */

export interface TemplateContext {
  session: Session;
  gitBranch?: string;
}

// List of all available template variables for documentation
export const TEMPLATE_VARIABLES = [
  { variable: '{{SESSION_ID}}', description: 'Maestro session ID (unique identifier)' },
  { variable: '{{SESSION_NAME}}', description: 'Current session name' },
  { variable: '{{CLAUDE_SESSION_ID}}', description: 'Claude Code session ID (for conversation continuity)' },
  { variable: '{{TOOL_TYPE}}', description: 'Agent type (claude-code, aider, etc.)' },
  { variable: '{{PROJECT_PATH}}', description: 'Full path to project directory' },
  { variable: '{{PROJECT_NAME}}', description: 'Project folder name' },
  { variable: '{{CWD}}', description: 'Current working directory' },
  { variable: '{{DATE}}', description: 'Current date (YYYY-MM-DD)' },
  { variable: '{{TIME}}', description: 'Current time (HH:MM:SS)' },
  { variable: '{{DATETIME}}', description: 'Full datetime' },
  { variable: '{{TIMESTAMP}}', description: 'Unix timestamp (ms)' },
  { variable: '{{DATE_SHORT}}', description: 'Short date (MM/DD/YY)' },
  { variable: '{{TIME_SHORT}}', description: 'Short time (HH:MM)' },
  { variable: '{{YEAR}}', description: 'Current year' },
  { variable: '{{MONTH}}', description: 'Current month (01-12)' },
  { variable: '{{DAY}}', description: 'Current day (01-31)' },
  { variable: '{{WEEKDAY}}', description: 'Day of week' },
  { variable: '{{GIT_BRANCH}}', description: 'Current git branch (if git repo)' },
  { variable: '{{IS_GIT_REPO}}', description: '"true" or "false"' },
  { variable: '{{CONTEXT_USAGE}}', description: 'Context window usage %' },
  { variable: '{{INPUT_MODE}}', description: 'Current input mode (ai/terminal)' },
];

/**
 * Substitute template variables in a string with actual values
 */
export function substituteTemplateVariables(
  template: string,
  context: TemplateContext
): string {
  const { session, gitBranch } = context;
  const now = new Date();

  // Build replacements map
  const replacements: Record<string, string> = {
    // Session variables
    'SESSION_ID': session.id,
    'SESSION_NAME': session.name,
    'CLAUDE_SESSION_ID': session.claudeSessionId || '',
    'TOOL_TYPE': session.toolType,

    // Project variables
    'PROJECT_PATH': session.fullPath || session.cwd,
    'PROJECT_NAME': (session.fullPath || session.cwd).split('/').pop() || '',
    'CWD': session.cwd,

    // Date/Time variables
    'DATE': now.toISOString().split('T')[0],
    'TIME': now.toTimeString().split(' ')[0],
    'DATETIME': `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`,
    'TIMESTAMP': String(now.getTime()),
    'DATE_SHORT': `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`,
    'TIME_SHORT': `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    'YEAR': String(now.getFullYear()),
    'MONTH': String(now.getMonth() + 1).padStart(2, '0'),
    'DAY': String(now.getDate()).padStart(2, '0'),
    'WEEKDAY': now.toLocaleDateString('en-US', { weekday: 'long' }),

    // Git variables
    'GIT_BRANCH': gitBranch || '',
    'IS_GIT_REPO': String(session.isGitRepo),

    // Context variables
    'CONTEXT_USAGE': String(session.contextUsage || 0),
    'INPUT_MODE': session.inputMode,
  };

  // Perform case-insensitive replacement
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    // Match {{KEY}} with case insensitivity
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value);
  }

  return result;
}
