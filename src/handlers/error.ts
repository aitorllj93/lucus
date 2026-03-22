import type { NextFunction, Request, Response } from "express";

import { APIError, InternalServerError, isAPIError } from "../utils/errors";
import { getLogger } from "../utils/logger";

const respondWithError = (
	error: APIError,
	req: Request,
	res: Response
): void => {
	// Only return errors in json format if explicitly requested
	if (req.accepts().includes(('application/json'))) {
		res.status(error.statusCode).json({ error: error.apiMessage });
	} else {
		res.status(error.statusCode).send(error.apiMessage);
	}

}

export const handleError = (
	err: Error,
	req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	const logger = getLogger();

	if (isAPIError(err)) {
		return respondWithError(err, req, res);
	}

	logger.error({ err }, "Request error");

	const apiError = new InternalServerError();

	return respondWithError(apiError, req, res);
};
