import OpenAI from 'openai';
const logger = require('./util/logger'); 
require('dotenv').config();
const envvars = require('./envvars');
import express, { Request, Response } from 'express';
import cors from 'cors';
const app = express();
const PORT = process.env.PORT || 5000;
import { LojoChat } from './models/LojoChat';
import { authenticateToken, authenticateUsernamePassword, authenticateGoogleToken, authenticateMicrosoftToken } from './auth/auth';
import { AuthcResponse } from './models/UserAuthenticationResponse';
import { UserDetail } from './models/User';
import { getUserDetails, saveUserDetails } from './user/user';
import { submitRemark, getRemarkResponseStream } from './services/openaiservice';
import { storeUserLogin } from './services/dataservice';
import { storeChat } from './services/dataservice';

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], 
  });

app.use(cors());
app.use(express.json());
app.get('/', (req: Request, res: Response) => {
    logger.debug("entered / route");
    res.send('Hello world, from typescript Node backend!')
});

app.post('/api/auth/signin', (req: Request, res: Response) => {
    logger.debug("entered /api/auth/signin route");
    const authResponse:AuthcResponse = authenticateUsernamePassword(req);
    if (authResponse.user){
        storeUserLogin(authResponse.user.username);
        saveUserDetails(authResponse.user);
        if (authResponse.status === 'success') {
            res.send(authResponse);
        } 
    } 
    res.status(401).send({ message: 'Invalid login' });
});

app.post('/api/chat/store', authenticateToken, async (req: Request, res: Response) => {
    logger.debug("entered /api/chat/store route");
    const chat : LojoChat = req.body as LojoChat;
    const storeResult = await storeChat(chat);          
    res.send(storeResult);                                                                                                                                                                                                                                                                                                                                                                                                                                                                   

});

app.post('/api/auth/google/token/signin', async (req: Request, res: Response) => {
    logger.debug("entered /api/auth/google/token/signin route");
    try {
        const authResponse: AuthcResponse = await authenticateGoogleToken(req);
        if (authResponse && authResponse.user){
            storeUserLogin(authResponse.user.username);
            const saveresult = await saveUserDetails(authResponse.user);
            res.send(authResponse);
            
        } else {
            res.status(401).send({ message: 'Invalid login' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
    }
});

app.post('/api/auth/microsoft/token/signin', async (req: Request, res: Response) => {
    logger.debug("entered /api/auth/microsoft/token/signin route");
    try {
        const authResponse: AuthcResponse = await authenticateMicrosoftToken(req);
        if (authResponse && authResponse.user){

            storeUserLogin(authResponse.user.username);
            const saveresult = await saveUserDetails(authResponse.user);
            res.send(authResponse);
            
        } else {
            res.status(401).send({ message: 'Unable to authorize' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
    }
});

app.post('/api/chat/remark/submit', authenticateToken, async (req: Request, res: Response) => {
    logger.debug("entered /api/chat/send route");
    const chat : LojoChat = req.body as LojoChat;
    const remarkUniqueId = submitRemark(chat);
    res.send(remarkUniqueId);
});

app.get('/api/chat/remark/responsestream/:remarkUniqueId', (req: Request, res: Response) => {
    logger.debug("entered /api/chat/remark/responsestream/:remarkUniqueId route");
    const remarkUniqueId = String(req.params.remarkUniqueId);
    getRemarkResponseStream(remarkUniqueId, res);
    logger.debug("exiting /api/chat/remark/responsestream/:remarkUniqueId route");
});

app.get('/api/health', authenticateToken, (req: Request, res: Response) => {
    logger.debug("entered /api/health route");
    res.send('healthy');
});

app.get('/api/user/details', authenticateToken, (req: Request, res: Response) => {
    logger.debug("entered /api/user/details route");
    getUserDetails(req)
    .then((userDetail: UserDetail) => {
        res.send(userDetail);
    })
    .catch((error) => {
        res.status(500).send({ message: 'Internal server error: '+error });
    });
});

app.listen(PORT, () => {
    logger.info("server running on port ", PORT);
});

