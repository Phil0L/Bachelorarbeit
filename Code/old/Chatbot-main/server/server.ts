import app from './index';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.API_KEY) {
  throw new Error('API_KEY is not defined in .env file');
}

app.listen(1207, () => {
  console.log('Server is running on port 1207');
});