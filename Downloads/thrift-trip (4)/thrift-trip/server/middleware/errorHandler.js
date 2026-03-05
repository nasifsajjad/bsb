function errorHandler(err, req, res, next) {
  console.error('API Error:', err.message || err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred. Please try again.';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
