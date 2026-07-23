/**
 * Logger Utility
 */

const formatMessage = (level, message, meta = '') => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
};

exports.info = (message, meta) => {
  console.log(formatMessage('info', message, meta));
};

exports.warn = (message, meta) => {
  console.warn(formatMessage('warn', message, meta));
};

exports.error = (message, error, meta) => {
  const errMsg = error instanceof Error ? error.stack : error;
  console.error(formatMessage('error', message, { ...meta, error: errMsg }));
};
