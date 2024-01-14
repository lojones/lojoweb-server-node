import { UserDetail } from "../models/User";

const CosmosClient = require('@azure/cosmos').CosmosClient
require('dotenv').config();
const envvars = require('../envvars');
const endpoint = envvars.getMandatoryEnvVar('COSMOSDB_ENDPOINT');
const key = envvars.getMandatoryEnvVar('COSMOSDB_KEY');
const databasename = envvars.getMandatoryEnvVar('COSMOSDB_DATABASE_NAME');
const containername = envvars.getMandatoryEnvVar('COSMOSDB_CONTAINER_NAME');
const localAccountsJson = JSON.parse(envvars.getMandatoryEnvVar('LOCAL_ACCOUNTS'));

const options = {
    endpoint: endpoint,
    key: key,
    userAgentSuffix: 'CosmosDBJavascriptQuickstart'
  };

const client = new CosmosClient(options);

// store user details into databasename.containername in cosmosdb
export const storeUserDetails = async (userDetail:UserDetail) => {
    const database = client.database(databasename);
    const container = database.container(containername);
    const { resource: createdItem } = await container.items.upsert(userDetail);
    return createdItem;
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
        const userDetailArray: UserDetail[] = [userDetail];
        return userDetailArray;
    } else {
        const database = client.database(databasename);
        const container = database.container(containername);
        const querySpec = {
            query: "SELECT * from root r where r.username = @username",
            parameters: [
                {
                    name: "@username",
                    value: username
                }
            ]
        };
        const { resources: results } = await container.items
            .query(querySpec)
            .fetchAll();
        const userDetails:UserDetail[] = [];
        for (var queryResult of results) {
            let resultString = JSON.stringify(queryResult);
            const userDetail:UserDetail = JSON.parse(resultString);
            userDetails.push(userDetail);
        }
        return userDetails;
    }
    
}