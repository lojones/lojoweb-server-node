import { UserDetail } from '../models/User';
const logger = require('../util/logger'); 
require('dotenv').config();
const envvars = require('../envvars');
const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));

export const getUserDetails = (username: string) : UserDetail => {
    const user = localAccountsJson[username];
    const userDetail: UserDetail = {
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname
    };
    return userDetail;
}