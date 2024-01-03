import { UserData } from "./UserData";

export interface AuthcResponse {
    token: string;
    status: string;
    message: string;
    user?: UserData;
  }
