// Centralized error handler — keeps controllers free of repetitive try/catch
// boilerplate when combined with the asyncHandler wrapper below.

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Something went wrong on the server.",
  });
}

module.exports = { asyncHandler, notFoundHandler, errorHandler };
