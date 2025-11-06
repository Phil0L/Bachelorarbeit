import request from 'supertest';
import app from './index'; // Import the app object from index
import { Server } from 'http';

let server: Server;

beforeAll(() => {
  server = app.listen(1207);
});

afterAll(done => {
  server.close(done);
});

describe('Test the /create endpoint', () => {
    test('Should return a basic bpmn response', async () => {
        let testContent = "I'm hungry and want to eat. I got to the kitchen and check the fridge. There is fish and meat. I chose one and eat. Then I leave.";
        const response = await request(app).post('/create').send({inputString: testContent});
        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('response');
      }, 30000); // 30 seconds timeout

    test('It should return 400 if no inputString is provided', async () => {
        const response = await request(app).post('/create').send({});
        expect(response.statusCode).toBe(400);
    });

    test('It should return 400 if inputString is too long', async () => {
        let longString = 'a'.repeat(3001);
        const response = await request(app).post('/create').send({inputString: longString});
        expect(response.statusCode).toBe(400);
    });
});