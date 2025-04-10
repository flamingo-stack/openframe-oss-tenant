export class OAuthError extends Error {
  constructor(
    public error: string,
    public error_description: string,
    public error_uri?: string,
    public status?: number
  ) {
    super(error_description);
    this.name = 'OAuthError';
  }
} 