import { UserSummary } from "./User";

export interface AuthcResponse {
    token: string;
    status: string;
    message: string;
    user?: UserSummary;
  }
