import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { LojoChat, LojoChatRemarkUniqueId } from '../models/LojoChat';
const logger = require('../util/logger'); 
import { Request, Response } from 'express';

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], 
});

// const openaiChats

export const getResponseAsStream = async (message: string) : Promise<string> => {
    const stream = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ 
                    role: 'user',
                    content: message
                    }],
        stream: true,
        });
    for await (const chunk of stream) {
        const data = chunk.choices[0]?.delta?.content || '';
        return data;
    }
    return '';
}

const generateRemarkUniqueId = (chat:LojoChat) : LojoChatRemarkUniqueId => {
    const remarkUuid = uuidv4();
    const chatId = chat.chatId;
    const userId = chat.userId;
    const remarkUid = `${userId}-${chatId}-${remarkUuid}`;
    const remarkUniqueId : LojoChatRemarkUniqueId = {
        remarkUid: remarkUid
    }
    return remarkUniqueId;
}

const openaiChatsMap = new Map<string, LojoChat>();

export const submitRemark = (chat : LojoChat) : LojoChatRemarkUniqueId=> {
    logger.debug("entered submitChat");
    const remarkUniqueId = generateRemarkUniqueId(chat);
    openaiChatsMap.set(remarkUniqueId.remarkUid, chat);
    return remarkUniqueId
    
}

export const getRemarkResponseStream = async (remarkUniqueId : string, res : Response)  => {
    logger.debug("entered getRemarkResponseStream");
    const chat = openaiChatsMap.get(remarkUniqueId);
    if (chat){
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });
        const latestRemark = chat.remarks[chat.remarks.length - 1];
        const latestRemarkText =latestRemark.remark;
        const stream = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ 
                        role: 'user',
                        content: latestRemarkText
                        }],
            stream: true,
        });
        for await (const chunk of stream) {
            const data = chunk.choices[0]?.delta?.content || '';
            const jsonData = { chunk: data }
            const eventsourceFormattedData = `data: ${JSON.stringify(jsonData)}\n\n`;

            process.stdout.write(data);
            res.write(eventsourceFormattedData);
        }
        const jsonData = { chunk: 'done '+remarkUniqueId }
        const eventsourceFormattedData = `data: ${JSON.stringify(jsonData)}\n\n`;
        process.stdout.write("\ndone\n\n");
        openaiChatsMap.delete(remarkUniqueId);
        res.write(eventsourceFormattedData);
        res.end();
    }
    
}