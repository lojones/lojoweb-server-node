// import jwt from 'jsonwebtoken';
// import jwksClient from 'jwks-rsa';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient, { JwksClient, SigningKey } from 'jwks-rsa';
const logger = require('../util/logger'); 
const envvars = require('../envvars');
const microsoft_auth_tenant = envvars.getMandatoryEnvVar('MICROSOFT_OAUTH_TENANT_ID');
const microsoft_auth_clientid = envvars.getMandatoryEnvVar('MICROSOFT_OAUTH_CLIENT_ID');


const jwksclient = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${microsoft_auth_tenant}/discovery/v2.0/keys`,
});

export const jwtDecodeMicrosoftToken = (token: string): jwt.Jwt | null => {
  return jwt.decode(token, { complete: true });
}

const verifyMicrosoftToken = async (token: string, key: string): Promise<boolean> => {
  try {
    const verifiedToken = jwt.verify(token, key);
    if (!verifiedToken) {
        throw new Error('Token verification failed'); 
    } else {
      return true;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
};

export const verifyMicrosoftIdToken = async (token: string): Promise<boolean> => {
  try {
    const idToken = jwtDecodeMicrosoftToken(token);
    
    if (!idToken) {
        throw new Error('Token verification failed: could not jwt decode idtoken'); 
    } 

    const key = idToken.header.kid;
    
    if (!key) {
        throw new Error('Token verification failed: could not get key from idtoken header'); 
    }

    return verifyMicrosoftToken(token, key);
    
  } catch (error) {
    
    logger.error('Token verification error:', error);
    return false;
  }

}

export const verifyMicrosoftAccessToken = async (accessToken: string): Promise<boolean> => {
  try {
    const header:JwtHeader= getHeaderFromAccessToken(accessToken);
    const key = await getPublicSigningKeyFromHeader(header);
    return verifyMicrosoftToken(accessToken, key);
  } catch (error) {
    logger.error("access token verification error:", error);
    return false;
  }
}



async function getPublicSigningKeyFromHeader(header: JwtHeader): Promise<string> {
  try {
    const key = await jwksclient.getSigningKey(header.kid as string);
    const signingKey = key.getPublicKey();
    return signingKey;
  } catch (error) {
    console.error('Error in getting signing key:', error);
    throw new Error('Failed to get signing key');
  }
}

function base64DecodeToJson(accessToken: string, delimiter:string, part:number) {
  try {
    const base64Part = accessToken.split(delimiter)[part]; // Split the token and get the header
    const base64Decoded = Buffer.from(base64Part, 'base64').toString('ascii'); // Decode from Base64
    return JSON.parse(base64Decoded); // Parse the JSON string
  } catch (error) {
    console.error('Error extracting json from base64encoded string:', error);
    throw new Error('Error extracting json from base64encoded string ');
  }
}

function getHeaderFromAccessToken(accessToken: string): JwtHeader {
  return base64DecodeToJson(accessToken, '.', 0);
  
}

export function getPayloadFromAccessToken(accessToken: string): any {
  return base64DecodeToJson(accessToken, '.', 1);
}

