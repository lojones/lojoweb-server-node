import OpenAI from 'openai';
import { ChatCompletionMessage } from 'openai/resources/chat';
import { PROMPT_CONFIG, OPENAI_CONFIG } from '../config/config.app';   


import { v4 as uuidv4 } from 'uuid';
import { LojoChat, LojoChatRemarkUniqueId } from '../models/LojoChat';
const logger = require('../util/logger'); 
import { Request, Response } from 'express';

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], 
});

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

const generateLlmPrompt = (chat : LojoChat) : ChatCompletionMessage[] => {
    
    const prompts : ChatCompletionMessage[] = [];

    const additionalSystemPrompt = `${process.env['SYSTEM_PROMPT']}`;
    const systemPromptText = `${PROMPT_CONFIG.system_prompt}  ${additionalSystemPrompt}`;

    const systemPrompt : ChatCompletionMessage = {
        role: 'system',
        content: systemPromptText
    }

    prompts.push(systemPrompt);

    const remarks = chat.remarks;
    remarks.forEach(remark => {
        const message = remark.remark;
        const role = remark.isAiResponse ? 'assistant' : 'user';
        const messagePart : ChatCompletionMessage = {
            role: role,
            content: message
        }
        prompts.push(messagePart);
    });

    return prompts;
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
        const prompts = generateLlmPrompt(chat);
        const stream = await openai.chat.completions.create({
            model: OPENAI_CONFIG.model,
            messages: prompts,
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