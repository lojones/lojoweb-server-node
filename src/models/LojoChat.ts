export interface LojoChat {
    chatId: string;
    userId: string;
    summary: string;
    firstName: string;
    remarks: LojoChatRemark[];
    timestamp: Date;
  }

export interface LojoChatRemark {
    speaker: string;
    isAiResponse: boolean;
    timestamp: Date;
    remark: string;
}  

export interface LojoChatMetadata {
    chatId: string;
    summary: string;
    timestamp: Date;
}

export interface LojoChatRemarkUniqueId {
    remarkUid: string;
    responseStatusCode: number;
}