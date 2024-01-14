import { UserDetail } from "./User";

export interface AuthcResponse {
    token: string;
    status: string;
    message: string;
    user?: UserDetail;
  }
