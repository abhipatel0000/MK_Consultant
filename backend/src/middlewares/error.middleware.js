const logger = require('../utils/logger');
const response = require('../utils/response');

module.exports = (err, req, res, next) => {
  logger.error(`API Error on ${req.method} ${req.url}`, err, {
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params
  });

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  return response.error(res, message, statusCode);
};
