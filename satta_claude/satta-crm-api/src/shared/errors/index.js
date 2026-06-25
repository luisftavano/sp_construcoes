export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 422, 'VALIDATION_ERROR')
    this.details = details
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Active subscription required') {
    super(message, 402, 'PAYMENT_REQUIRED')
  }
}

export class ExternalServiceError extends AppError {
  constructor(message = 'External service error') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class ScheduleConflictError extends AppError {
  constructor(message = 'Time slot already taken for this resource') {
    super(message, 409, 'SCHEDULE_CONFLICT')
  }
}

export class InvalidDocumentError extends AppError {
  constructor(message = 'Invalid CPF or CNPJ') {
    super(message, 422, 'INVALID_DOCUMENT')
  }
}

export class AmbiguousInventoryMatchError extends AppError {
  constructor(message = 'Ambiguous inventory match', candidates = []) {
    super(message, 422, 'AMBIGUOUS_INVENTORY_MATCH')
    this.candidates = candidates
  }
}

export class InsufficientStockError extends AppError {
  constructor(message = 'Insufficient stock', insufficientItems = []) {
    super(message, 409, 'INSUFFICIENT_STOCK')
    this.insufficientItems = insufficientItems
  }
}
