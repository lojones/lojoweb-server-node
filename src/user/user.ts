import { UserDetail } from '../models/User';
import { getUsernameFromToken } from '../auth/auth';
import { Request } from 'express';
const logger = require('../util/logger'); 
require('dotenv').config();
const envvars = require('../envvars');
const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));

export const getUserDetails = (request: Request) : UserDetail => {
    const usernameSubject =getUsernameFromToken(request);
    const user = localAccountsJson[usernameSubject];
    const userDetail: UserDetail = {
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname
    };
    return userDetail;
}