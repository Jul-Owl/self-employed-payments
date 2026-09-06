export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  publicSlug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}
