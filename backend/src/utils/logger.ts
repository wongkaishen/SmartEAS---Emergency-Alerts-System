import winston from 'winston';

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'smarteas-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add CloudWatch transport in production
if (process.env.NODE_ENV === 'production') {
  // CloudWatch logs are automatically captured by Lambda
  logger.add(
    new winston.transports.Console({
      format: winston.format.json()
    })
  );
}

export { logger };
