import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'node:crypto';

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino/file', options: { destination: 1 } },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  }),
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customProps: (req) => {
    const props = {};
    if (req.user?.sub) props.userId = req.user.sub;
    return props;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

export default logger;
