import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient, { JwksClient, SigningKey } from 'jwks-rsa';
const logger = require('../util/logger'); 
const envvars = require('../envvars');
const microsoft_auth_tenant = envvars.getMandatoryEnvVar('MICROSOFT_OAUTH_TENANT_ID');


const jwksclient = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${microsoft_auth_tenant}/discovery/v2.0/keys`,
});


export const jwtDecodeMicrosoftToken = (token: string): jwt.Jwt | null => {
  return jwt.decode(token, { complete: true });
}

const verifyMicrosoftToken = async (token: string, key: string): Promise<boolean> => {
  try {
    const verifiedToken = jwt.verify(token, key, { algorithms: ['RS256'] });
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

    const header = idToken.header;
    
    if (!header) {
        throw new Error('Token verification failed: could not get idtoken header'); 
    }

    const publicKey = await getPublicSigningKeyFromHeader(header, jwksclient);

    console.log("idToken publicKey: \n", publicKey);

    return verifyMicrosoftToken(token, publicKey);
    
  } catch (error) {
    
    logger.error('Token verification error:', error);
    return false;
  }

}


async function getPublicSigningKeyFromHeader(header: JwtHeader, client:JwksClient ): Promise<string> {
  try {
    const key = await client.getSigningKey(header.kid as string);
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

export function getPayloadFromAccessToken(accessToken: string): any {
  return base64DecodeToJson(accessToken, '.', 1);
}

