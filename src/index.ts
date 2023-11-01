console.log('Hello world, from typescript!')

import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.get('/', (req: Request, res: Response) => {
    res.send('Hello world, from typescript Node backend!')
});

app.listen(PORT, () => {
    console.log("server running on port ", PORT);
});

