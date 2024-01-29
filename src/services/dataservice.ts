import { MongoClient,Db,Collection } from 'mongodb';
import { UserDetail } from "../models/User";
import { LojoChat } from "../models/LojoChat";
import { get } from 'http';
import e from 'express';
import { Logger } from 'winston';
const moment = require('moment-timezone');
require('dotenv').config();
const envvars = require('../envvars');
const logger = require('../util/logger');
const uri = envvars.getMandatoryEnvVar('MONGODB_URI');
const databasename = envvars.getMandatoryEnvVar('MONGODB_DATABASE_NAME');
const username = envvars.getMandatoryEnvVar('MONGODB_USERNAME');
const password = envvars.getMandatoryEnvVar('MONGODB_PASSWORD');
const UserProfilesCollection = envvars.getMandatoryEnvVar('MONGODB_COLLECTION_NAME_USERS');
const signinLogCollectionName = envvars.getMandatoryEnvVar('MONGODB_COLLECTION_NAME_SIGNINLOG');
const ChatsCollectionName = envvars.getMandatoryEnvVar('MONGODB_COLLECTION_NAME_CHATS');

const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));
const credentialeduri = uri.replace('<username>', username).replace('<password>', password);
const client = new MongoClient(credentialeduri);

const getDb = async ():Promise<Db>=> {
    await client.connect();
    const db:Db = client.db(databasename);
    return db;
}

export const storeChat = async (chat:LojoChat):Promise<boolean> => {
    try {
        const coll = client.db(databasename).collection(ChatsCollectionName);
        const filter = { chatId: chat.chatId, userId: chat.userId };
        const options = { upsert: true };

        await coll.replaceOne(filter, chat, options);
        return true;
    } catch (error) {
        console.error('Error storing chat:', error);
        return false;
    }
};

// store user details into databasename.collectionname in mongodb
export const storeUserDetails = async (userDetail:UserDetail):Promise<boolean> => {
    try { 
        const coll = client.db(databasename).collection(UserProfilesCollection);
        const exists = await coll.countDocuments({id:userDetail.id});
        
        if (exists == 0) {
            const insertResult = await coll.insertOne(userDetail);
            if (insertResult) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }

    } catch (error) {
        console.log("error storing this user detail in db: " + error);
        return false;
    }
    
}

export const storeUserLogin = async(username:string) => {
    try {
        const timestamp = moment().tz("America/New_York").format('YYYY-MM-DD HH:mm:ss');
        const coll = client.db(databasename).collection(signinLogCollectionName);
        const insertObj={username:username, timestamp:timestamp};
        coll.insertOne(insertObj);        
    } catch (error) {
        logger.error("error storing user login: " + error);
    }
}

// retrieve user details from databasename.containername in cosmosdb
export const retrieveUserDetails = async (username:string):Promise<UserDetail[]> => {

    const user = localAccountsJson[username];
    if (user) {
        const userDetail: UserDetail = {
            username: user.username,
            firstname: user.firstname,
            lastname: user.lastname,
            id: user.username,
            email: 'none@none.com',
            profilepicurl: ''
        };
        return [userDetail];
    } else {
        const result = await client.db(databasename).collection(UserProfilesCollection).findOne({id:username});
        const userDetail: UserDetail = JSON.parse(JSON.stringify(result));
        return [userDetail];

    }
    
}