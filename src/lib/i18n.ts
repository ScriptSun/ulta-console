// Internationalization constants for user-facing text

// Router phase messages that appear during AI processing
const planningMessages = [
  "Planning",
  "Reviewing system capabilities", 
  "Assessing requirements",
  "Initializing analysis"
];

const getRandomPlanningMessage = () => planningMessages[Math.floor(Math.random() * planningMessages.length)];

export const RouterPhases = {
  CHECKING: "CHECKING", // Used as key, display text handled separately
  THINKING: "Thinking", 
  ANALYZING: "Evaluating system requirements",
  SELECTING: "Configuring execution plan",
  REQUESTING_DATA: "Finalizing execution details"
} as const;

export const getRouterPhaseText = (phase: string): string => {
  switch (phase) {
    case RouterPhases.CHECKING:
      return getRandomPlanningMessage();
    case RouterPhases.THINKING:
      return RouterPhases.THINKING;
    case RouterPhases.ANALYZING:
      return RouterPhases.ANALYZING;
    case RouterPhases.SELECTING:
      return RouterPhases.SELECTING;
    case RouterPhases.REQUESTING_DATA:
      return RouterPhases.REQUESTING_DATA;
    default:
      return phase;
  }
};

export type RouterPhase = typeof RouterPhases[keyof typeof RouterPhases];

export const i18n = {
  phases: {
    planning: "Planning changes",
    analyzing: "Analyzing server", 
    ready: "Ready to apply changes",
    working: "Working on server",
    done: "Changes applied",
    failed: "Could not complete changes"
  },
  
  routerPhases: RouterPhases,
  
  draft: {
    cardTitle: {
      fallback: "Proposed changes"
    },
    command: {
      title: "Command"
    },
    batch: {
      title: "Batch script"
    },
    buttons: {
      confirm: "Confirm & Execute",
      cancel: "Cancel"
    }
  },
  
  errors: {
    cannot_answer: "Could not answer, please retry.",
    could_not_prepare: "Could not prepare changes",
    checks_stalled: "Checks stalled", 
    server_unresponsive: "Server stopped responding"
  }
};

// Text sanitizer to remove internal terms from user-facing text
const INTERNAL_TERMS = [
  'batch_key',
  'installer', 
  'tool_name',
  'batch_engine',
  'exec_runner',
  'preflight_runner'
];

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let sanitized = text;
  
  // Remove internal terms (case-insensitive)
  INTERNAL_TERMS.forEach(term => {
    const regex = new RegExp(term, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // Clean up extra whitespace and punctuation
  sanitized = sanitized
    .replace(/\s+/g, ' ')           // Multiple spaces to single space
    .replace(/\s*[,.:;]\s*/g, ' ')  // Remove punctuation around removed terms
    .trim();
    
  return sanitized;
}

export function sanitizeObject(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const sanitized = { ...obj };
  
  // Recursively sanitize string values
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    }
  });
  
  return sanitized;
}