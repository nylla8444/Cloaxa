/**
 * Logs a message to the console with a consistent prefix.
 * @param {string} message - The message to log.
 * @param {'log' | 'warn' | 'error'} level - The log level.
 */
function log(message, level = 'log') {
  console[level](`[Cloaxa] ${message}`);
}

/**
 * A simple error class for the extension.
 */
class CloaxaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CloaxaError';
  }
}
