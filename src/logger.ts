import { createLogger, transports, format } from "winston";

const logger = createLogger({
    level: 'debug',
    format: format.combine(
        format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        format.printf(({ level, message, timestamp, ...meta }) => {
            let msg = `${timestamp} ${level}: ${message}`;
            if(Object.keys(meta).length > 0) {
                msg += JSON.stringify(meta);
            }
            return msg;
        })
    ),
    defaultMeta: { service: 'lojoweb-server' },
    transports: [
      new transports.File({ filename: 'logs/error.log', level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' }),
      new transports.Console()
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.printf(({ level, message, timestamp, ...meta }) => {
                let msg = `${timestamp} ${level}: ${message}`;
                if(Object.keys(meta).length > 0) {
                    msg += JSON.stringify(meta);
                }
                return msg;
            })
        ),
    }));
}

module.exports = logger;