export interface ApiFieldError {
  field: string
  message: string
}

/** Shape of every error response from the backend */
export interface ApiErrorBody {
  error: string
  /** Only present on 400 validation errors */
  details?: ApiFieldError[]
}
