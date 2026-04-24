import { injectable } from "inversify";
import winston, { createLogger, format, transports } from "winston";
import path from "path";

@injectable()
export class Logger {
    private internalLogger: winston.Logger;
    private context: string = "GLOBAL";
    constructor() {
        const logFormat = format.printf(({ level, message, timestamp, context, ...metadata }) => {
        let msg = `${timestamp} [${level}][${context}] ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
        });

        this.internalLogger = createLogger({
        level: process.env.LOG_LEVEL || 'info', 
        format: format.combine(
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'context'] }),
            logFormat
        ),
        transports: [
            new transports.File({ 
            filename: path.join(process.env.LOGS_DIR || __dirname, './error.log'), 
            level: 'error' 
            }),
            new transports.File({ 
            filename: path.join(process.env.LOGS_DIR || __dirname, './out.log') 
            }),
        ],
        });

        // Always add console transport in Docker/Production, 
        // but use colorization only in non-production
        this.internalLogger.add(new transports.Console({
            format: format.combine(
            process.env.NODE_ENV !== 'production' ? format.colorize() : format.uncolorize(),
            logFormat
            ),
        }));
    }

    setContext(context: string) {
        this.context = context;
    }

    info(message: any, ...metadata: any) {
        this.internalLogger.info(message, { context: this.context, ...metadata });
    }

    error(message: any, ...metadata: any) {
        this.internalLogger.error(message, { context: this.context, ...metadata });
    }

    warn(message: any, ...metadata: any) {
        this.internalLogger.warn(message, { context: this.context, ...metadata });
    }

    debug(message: any, ...metadata: any) {
        this.internalLogger.debug(message, { context: this.context, ...metadata }); 
    }
}