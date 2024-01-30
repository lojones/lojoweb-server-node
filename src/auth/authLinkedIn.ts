import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient, { JwksClient, SigningKey } from 'jwks-rsa';
import fetch from 'node-fetch';
const logger = require('../util/logger'); 
const envvars = require('../envvars');
const microsoft_auth_tenant = envvars.getMandatoryEnvVar('MICROSOFT_OAUTH_TENANT_ID');


const jwksclient = jwksClient({
  jwksUri: `https://www.linkedin.com/oauth/openid/jwks`,
});

export const getLinkedInIdToken = async (code: string) => {
    const url = envvars.getMandatoryEnvVar('LINKEDIN_ACCESSTOKEN_URL');
    const redirect_uri = envvars.getMandatoryEnvVar('LINKEDIN_REDIRECT_URI');
    const client_id = envvars.getMandatoryEnvVar('LINKEDIN_CLIENT_ID');
    const client_secret = envvars.getMandatoryEnvVar('LINKEDIN_CLIENT_SECRET');

    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
        client_id: client_id,
        client_secret: client_secret
    });
    
    const response = await fetch(`${url}?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
    }

    const responseJson = await response.json();
    const idToken = responseJson.id_token;

    
    return idToken;
}

export const jwtDecodeToken = (token: string): jwt.Jwt | null => {
  return jwt.decode(token, { complete: true });
}

const verifyToken = (token: string, key: string): jwt.JwtPayload => {
  try {
    const verifiedToken = jwt.verify(token, key, { algorithms: ['RS256'] });
    if (!verifiedToken || typeof verifiedToken === 'string') {
        throw new Error('Token verification failed'); 
    } else {
      return verifiedToken;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Token verification failed with error: '+error); 
  }
};

export const verifyIdToken = async (token: string): Promise<jwt.JwtPayload> => {
  try {
    const idToken = jwtDecodeToken(token);
    
    if (!idToken) {
        throw new Error('Token verification failed: could not jwt decode idtoken'); 
    } 

    const header = idToken.header;
    
    if (!header) {
        throw new Error('Token verification failed: could not get idtoken header'); 
    }

    const publicKey = await getPublicSigningKeyFromHeader(header, jwksclient);

    console.log("idToken publicKey: \n", publicKey);

    const verified = verifyToken(token, publicKey);

    if (!verified) {
        throw new Error('Token verification failed: could not verify idtoken with public key'); 
    } else {
        return verified;
    }
    
  } catch (error) {
    
    logger.error('Token verification error:', error);
    throw new Error('Token verification failed: '+error); 
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

