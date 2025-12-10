/**
 * Wizard Services
 *
 * Business logic and utilities for the onboarding wizard.
 */

export { wizardPrompts, parseStructuredOutput } from './wizardPrompts';
export {
  conversationManager,
  createUserMessage,
  createAssistantMessage,
  shouldAutoProceed,
  convertWizardMessagesToLogEntries,
  createProjectDiscoveryLogs,
  PROJECT_DISCOVERY_TAB_NAME,
} from './conversationManager';

// phaseGenerator will be exported when implemented
// export { phaseGenerator } from './phaseGenerator';
