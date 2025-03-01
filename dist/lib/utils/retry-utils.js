"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRetryWrapper = createRetryWrapper;
/**
 * Creates a retry wrapper for middleware chains
 * @param options - Configuration for retry behavior
 * @returns Object with middleware application function
 */
function createRetryWrapper(middlewares, options, errorHandler) {
    const { retries = 0, retryDelay = 0, maxRetryDelay = Infinity, jitter = 0, delayFn = (attempt, baseDelay) => baseDelay * Math.pow(2, attempt), } = options;
    const scheduleRetry = (attempt, value) => {
        let delay = delayFn(attempt, retryDelay);
        if (jitter > 0) {
            const jitterFactor = 1 + jitter * (Math.random() * 2 - 1);
            delay *= jitterFactor;
        }
        delay = Math.min(delay, maxRetryDelay);
        return new Promise((resolve) => setTimeout(() => resolve(applyMiddleware(value, attempt + 1)), delay));
    };
    const applyMiddleware = (value, attempt = 0) => {
        let result = value;
        for (const middleware of middlewares) {
            if (result instanceof Promise) {
                result = result.then((value) => {
                    try {
                        return middleware(value);
                    }
                    catch (error) {
                        if (attempt < retries) {
                            return scheduleRetry(attempt, value);
                        }
                        errorHandler(error);
                        return value;
                    }
                }, (error) => {
                    if (attempt < retries) {
                        return scheduleRetry(attempt, value);
                    }
                    errorHandler(error);
                    throw error;
                });
            }
            else {
                try {
                    result = middleware(result);
                }
                catch (error) {
                    if (attempt < retries) {
                        return scheduleRetry(attempt, value);
                    }
                    errorHandler(error);
                    return value;
                }
            }
        }
        return result;
    };
    return { applyMiddleware };
}
