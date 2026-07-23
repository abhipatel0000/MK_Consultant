/**
 * Standard API Response Utility
 */

exports.success = (res, data = null, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

exports.error = (res, message = 'Internal Server Error', status = 500, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  // Hide stack traces in production (handled at app level, but clean here too)
  if (status === 500 && process.env.NODE_ENV === 'production') {
    response.message = 'An unexpected error occurred. Please try again later.';
  }

  return res.status(status).json(response);
};
