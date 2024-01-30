import express, { Request, Response } from 'express';
import { AuthcResponse } from '../models/UserAuthenticationResponse';
import { UserDetail, UserSummary } from '../models/User';
import { getSafeValue } from '../util/util';
import { OAuth2Client } from 'google-auth-library';
import { verifyMicrosoftIdToken, jwtDecodeMicrosoftToken } from './authMicrosoft';
import { getMicrosoftUserDetails } from '../services/userdetailservice';
import jwt from 'jsonwebtoken';
import { verifyIdToken, getLinkedInIdToken } from './authLinkedIn';
import { storeUserLogin,storeUserDetails } from '../services/dataservice';


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
    if (token) {
        const decodedToken = jwt.decode(token);
        if (decodedToken && decodedToken.sub) {
            if (typeof decodedToken.sub === 'string') {
                const username:string = decodedToken.sub;
                return username;
            }
        }
    }
    return "";
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
        status,message,token,username,firstname,lastname,email,profilepicurl
    } : {
        status: string,
        message: string, 
        token?: string, 
        username?: string,
        firstname?: string,
        lastname?: string,
        email?: string,
        profilepicurl?: string
    } ) => {
    const user: UserDetail = { 
        id: getSafeValue(username),
        username: getSafeValue(username), 
        firstname: getSafeValue(firstname), 
        lastname: getSafeValue(lastname),
        email: getSafeValue(email),
        profilepicurl: getSafeValue(profilepicurl)
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
    const payload = getJwtPayload(username, 60 * 24 * 14);
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

const getFirstLastName = (name: string) : {firstname: string, lastname: string} => {
    const names = name.split(' ');
    const firstname = names[0];
    const lastname = names[names.length - 1];
    return {firstname: firstname, lastname: lastname};
}

export const authenticateMicrosoftToken = async (req: Request): Promise<AuthcResponse> => {
    const { idToken, accessToken } = req.body;

    const verifiedIdToken : boolean = await verifyMicrosoftIdToken(idToken);

    if (!verifiedIdToken) {
        logger.debug("authentication token verification failed");
        throw new Error("authentication token verification failed");
    }

    
    
    try {
        const decodedIdToken = jwtDecodeMicrosoftToken(idToken);
        if (!decodedIdToken || !decodedIdToken.payload) {
            throw new Error("error decoding idtoken");
        }
        const payload = decodedIdToken.payload as jwt.JwtPayload;
        const userid = payload['preferred_username'];
        const {firstname,lastname}=getFirstLastName(payload['name']);
        
        if (!userid) {  
            throw new Error("userid not found in payload");
        }
        //get a random number between 1 and 7 and substitute that number in this string: genericprofilepic<randomnumber>.png
        const randomnumber = Math.floor(Math.random() * 7) + 1;
        const profilepicurl = 'genericprofilepic' + randomnumber + '.png';
        const signedJwtToken = getSignedJwtToken(userid);
        const resp: AuthcResponse = getAuthcResponseObject({
            status: 'success',
            message: 'success',
            token: signedJwtToken,
            username: userid,
            firstname: firstname,
            lastname: lastname,
            profilepicurl: profilepicurl,
            email: userid
        });
        return resp;
        
    } catch (error) {
        throw new Error("error retrieving user details");
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
                profilepicurl: payload['picture'],
                email: payload['email']
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

export const authenticateLinkedInToken = async (authcode: string): Promise<AuthcResponse> => {
    try {
        const idToken = await getLinkedInIdToken(authcode);
        const verifiedIdToken = await verifyIdToken(idToken ); 
       
        if (!verifiedIdToken) {
            logger.debug("authentication token verification failed");
            throw new Error("authentication token verification failed");
        } else {
            logger.debug("authentication token verification succeeded");
            
            const {firstname,lastname}=getFirstLastName(verifiedIdToken['name']);
            const profilepicurl = verifiedIdToken['picture'];
            const email = verifiedIdToken['email'];
            const issuer = verifiedIdToken['iss'];
            const userId = `${email}_${issuer}`
            const signedJwtToken = getSignedJwtToken(userId);
            const resp: AuthcResponse = getAuthcResponseObject({
                status: 'success',
                message: 'success',
                token: signedJwtToken,
                username: userId,
                firstname: firstname,
                lastname: lastname,
                profilepicurl: profilepicurl,
                email: email
            });
            
            return resp;
        }
    } catch (error) {
        logger.debug("authentication token verification failed with error: " + error);
            throw new Error("authentication token verification failed with error: " + error);
    }
}
    
export const handleSuccessfulTokenAuthentication = (authResponse: AuthcResponse) => {
    try {
        if (authResponse && authResponse.user){
            storeUserLogin(authResponse.user.username);
            storeUserDetails(authResponse.user);
        }
    } catch (error) {
        logger.error("error storing user login and details: " + error);
    }

};