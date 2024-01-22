import fetch from 'node-fetch';
const logger = require('../util/logger'); 

export const getMicrosoftUserDetails = async (accessToken: string) =>{
  const url = 'https://graph.microsoft.com/v1.0/me';
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }

  const userDetails = await response.json();
  return userDetails;
}
