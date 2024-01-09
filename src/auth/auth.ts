import express, { Request, Response } from 'express';
import { AuthcResponse } from '../models/UserAuthenticationResponse';
import { UserSummary } from '../models/User';
import { getSafeValue } from '../util/util';
import { OAuth2Client } from 'google-auth-library';

const jwt = require('jsonwebtoken');
const logger = require('../util/logger'); 
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

export const getUsernameFromToken = (req: Request) : string => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const decodedToken = jwt.decode(token);
    const username = decodedToken.sub;
    return username;
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

    const user: UserSummary = { 
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

export const getSignedJwtToken = (username: string) : string => {
    const payload = getJwtPayload(username, 60);
    const token = jwt.sign(payload, jwt_secret);
    return token;
}

export const authenticateUsernamePassword  = (req: Request) : AuthcResponse => {
    const { username, password } = req.body;
    logger.debug("username, password: ", username, password);
    const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));
    const user = localAccountsJson[username];
    logger.debug("user: " + getSafeValue(user));
    if (user && user.password === password) {
        logger.debug("user and password match");
        const token = getSignedJwtToken(username);
        const resp: AuthcResponse = getAuthcResponseObject({
            status: 'success',
            message: 'success',
            token: token,
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname});
        return resp;
    } else {
        logger.debug("user and password do not match or user unknown: user " + getSafeValue(username) + ", provided pw: " + getSafeValue(password));
        if (user) {
            logger.debug("user known, but pw does not match: expected " + getSafeValue(user.password) + " vs. " + getSafeValue(password));
        }
        const resp: AuthcResponse = getAuthcResponseObject({
            status: 'error',
            message: 'Invalid sign in',
            username: username});
        return resp;
    }
}

export const authenticateGoogleToken = async (req: Request): Promise<AuthcResponse> => {
    const { token } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (payload) {
        const userid = payload['email'];
        if (userid) {
            const signedJwtToken = getSignedJwtToken(userid);
            const resp: AuthcResponse = getAuthcResponseObject({
                status: 'success',
                message: 'success',
                token: signedJwtToken,
                username: userid,
                firstname: payload['given_name'],
                lastname: payload['family_name'],
            });
            return resp;
        } else {
            logger.debug("userid not found in payload");
            // raise an error
            throw new Error("userid not found in payload");
        }
    }
    
    // Add a return statement here to fix the issue
    throw new Error("Payload is empty");
};
