/**
 * Global Error Handler Middleware
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('[GlobalErrorHandler]', err.stack || err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Prisma Unique Constraint Error (P2002)
  if (err.code === 'P2002') {
    statusCode = 400;
    message = `Duplicate field value entered: ${err.meta.target.join(', ')}`;
  }

  // Multer File Upload Error
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = `File upload error: ${err.message}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
