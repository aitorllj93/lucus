import pino, { type Logger } from "pino";

let logger: Logger;

export const createLogger = (level: string) => {
	logger = pino({
		level
	});
}

export const getLogger = () => {
	return logger;
}