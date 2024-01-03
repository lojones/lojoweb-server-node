import express, { Request, Response } from 'express';
import { AuthcResponse } from '../models/UserAuthenticationResponse';
import { UserData } from '../models/UserData';

const jwt = require('jsonwebtoken');
const logger = require('../logger'); 
const envvars = require('../envvars');
const jwt_secret = envvars.getMandatoryEnvVar('JWT_SECRET');


export const authenticateToken = (req: Request, res: Response, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    logger.debug("token: ", token);
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, jwt_secret, (err:any, user:any) => {
        if (err) return res.sendStatus(403);
        next();
    });
}

export const getJwtPayload = (subject: string, expiryMinutes: number): Record<string, unknown> => {
    const now = new Date()
    const expiry = new Date(now.getTime() + expiryMinutes * 60000)
    return {
        sub: subject,
        iat: now.getTime() / 1000,
        exp: expiry.getTime() / 1000,
    }
}

const getSafeValue = (value: string | undefined) => {
    return value ? value : '';
}

const getAuthcResponseObject = (
    {
        status,message,token,username,firstname,lastname
    } : {
        status: string,
        message: string, 
        token?: string, 
        username?: string,
        firstname?: string,
        lastname?: string
    } ) => {

    const user: UserData = { 
        username: getSafeValue(username), 
        firstname: getSafeValue(firstname), 
        lastname: getSafeValue(lastname) 
    };
    const response : AuthcResponse = {
        token: getSafeValue(token),
        status: status,
        message: message,
        user: user
    };
    return response;
}

export const authenticateUsernamePassword  = (req: Request) : AuthcResponse => {
    const { username, password } = req.body;
    logger.debug("username, password: ", username, password);
    const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));
    const user = localAccountsJson[username];
    logger.debug("user: ", user);
    if (user && user.password === password) {
        logger.debug("user and password match");
        const payload = getJwtPayload(username, 60);
        const token = jwt.sign(payload, jwt_secret);
        const resp: AuthcResponse = getAuthcResponseObject({
            status: 'success',
            message: 'success',
            token: token,
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname});
        return resp;
    } else {
        logger.debug("user and password do not match");
        const resp: AuthcResponse = getAuthcResponseObject({
            status: 'error',
            message: 'Invalid sign in',
            username: username});
        return resp;
    }
}