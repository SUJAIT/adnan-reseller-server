export type UserRole = "owner" | "shop";

export interface JwtPayload {
  id: string;
  role: UserRole;
  name: string;
}

export type PhoneStatus = "available" | "sold" | "issue" | "loss";
