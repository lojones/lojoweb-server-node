import { UserDetail } from '../models/User';
import { getUsernameFromToken } from '../auth/auth';
import { Request } from 'express';
import { retrieveUserDetails, storeUserDetails } from '../services/dataservice';
import { AuthcResponse } from '../models/UserAuthenticationResponse';
const logger = require('../util/logger'); 
require('dotenv').config();
const envvars = require('../envvars');
const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));



export const getUserDetails = (request: Request): Promise<UserDetail> => {
    try {
        const username = getUsernameFromToken(request);
        return retrieveUserDetails(username)
            .then((userDetails: UserDetail[]) => {
                logger.debug("userDetails: " + JSON.stringify(userDetails));
                return userDetails[0];
            })
            .catch((error) => {
                throw new Error(error);
            });
    } catch (error) {
        throw new Error("error retrieving user details");
    }
}

export const saveUserDetails = (userDetail: UserDetail | undefined) => {
    if (userDetail) {
        storeUserDetails(userDetail);
    }
    
}