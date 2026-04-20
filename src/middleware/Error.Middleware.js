export const errorMiddleware = (err, req, res, next) => {
    console.log('[Middleware] errorMiddleware triggered:', err.message);
    // Log the error for internal tracking (exclude sensitive info if possible)
    console.error(new Date().toISOString(), err.stack)

    const status = err.status || 500
    const message = status === 500 ? 'Internal server error' : err.message

    res.status(status).json({
        success: false,
        message: message
    })
}

export default errorMiddleware;

