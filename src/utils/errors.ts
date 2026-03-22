import { status as STATUS } from "http-status";

export abstract class APIError extends Error {
  readonly statusName: string = STATUS["500_NAME"];
  readonly statusCode: number = STATUS.INTERNAL_SERVER_ERROR;
  
  get apiMessage() {
    return `${this.statusName}: ${this.message}`;
  }
}

export class ForbiddenError extends APIError {

  readonly statusName = STATUS["403_NAME"];
  readonly statusCode = STATUS.FORBIDDEN;

  constructor(message?: string) {
    super(message ?? STATUS['403_MESSAGE']);
  }
} 


export class NotFoundError extends APIError {

  readonly statusName = STATUS["404_NAME"];
  readonly statusCode = STATUS.NOT_FOUND;

  constructor(message?: string) {
    super(message ?? STATUS["404_MESSAGE"]);
  }
} 


export class BadRequestError extends APIError {

  readonly statusName = STATUS["400_NAME"];
  readonly statusCode = STATUS.BAD_REQUEST;

  constructor(message?: string) {
    super(message ?? STATUS['400_MESSAGE']);
  }
}

export class InternalServerError extends APIError {}


export const isAPIError = (error: Error): error is APIError => {
  return 'statusCode' in error;
}