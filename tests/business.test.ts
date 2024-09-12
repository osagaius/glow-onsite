import request from 'supertest';
import app from '../index';
import { Pool } from 'pg';

// Configure database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

beforeAll(async () => {
    await pool.query('TRUNCATE TABLE businesses RESTART IDENTITY');
});

afterAll(async () => {
    await pool.end();
});

describe('Business Workflow API', () => {

    // Utility function to generate a unique FEIN for each test
    function generateFein() {
        return Math.floor(100000000 + Math.random() * 900000000).toString(); // Random 9-digit FEIN
    }

    it('should create a new business successfully', async () => {
        const fein = generateFein();
        const response = await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Test Business',
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.business).toHaveProperty('name', 'Test Business');
        expect(response.body.business).toHaveProperty('status', 'New');
    });

    it('should return an error when creating a business without a name', async () => {
        const fein = generateFein();
        const response = await request(app)
            .post('/api/business')
            .send({
                fein: fein,
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('error', 'Missing required parameter: name');
    });

    it('should progress the business to Market Approved when valid industry is provided', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Test Business for Industry Progression',
            });

        const response = await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                industry: 'restaurants',
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.business).toHaveProperty('status', 'Market Approved');
        expect(response.body).toHaveProperty('message', 'Provide contact details to proceed');
    });

    it('should return an error when progressing without required industry', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Test Business for Missing Industry',
            });

        const response = await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({}); // No industry provided

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('error', 'Industry is required to progress');
    });

    it('should return Market Declined when industry is not in target market', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Non-target Business',
            });

        const progressResponse = await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                industry: 'wholesale',
            });

        expect(progressResponse.statusCode).toBe(200);
        expect(progressResponse.body.business).toHaveProperty('status', 'Market Declined');
    });

    it('should return an error when progressing without contact details from Market Approved', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Test Business for Contact Validation',
            });

        await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                industry: 'restaurants',
            });

        const response = await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({}); // No contact details provided

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('error', 'Valid contact is required to progress');
    });

    it('should progress the business to Sales Approved when contact details are provided', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Business for Sales Approval',
            });

        await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                industry: 'stores',
            });

        const response = await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                contact: {
                    name: 'Jane Doe',
                    phone: '555-1234',
                },
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.business).toHaveProperty('status', 'Sales Approved');
        expect(response.body).toHaveProperty('message', 'Business is now part of the sales process');
    });

    it('should progress the business to Won when the deal is won', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Business for Won Stage',
            });

        await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                industry: 'restaurants',
            });

        await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                contact: {
                    name: 'John Doe',
                    phone: '555-5678',
                },
            });

        const response = await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                status: 'Won',
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.business).toHaveProperty('status', 'Won');
        expect(response.body).toHaveProperty('message', 'Business deal is won');
    });

    it('should progress the business to Lost when the deal is lost', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Business for Lost Stage',
            });

        await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                industry: 'stores',
            });

        await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                contact: {
                    name: 'John Smith',
                    phone: '555-8765',
                },
            });

        const response = await request(app)
            .post(`/api/business/${fein}/progress`)
            .send({
                status: 'Lost',
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.business).toHaveProperty('status', 'Lost');
        expect(response.body).toHaveProperty('message', 'Business deal is lost');
    });

    it('should return the current status of the business', async () => {
        const fein = generateFein();
        await request(app)
            .post('/api/business')
            .send({
                fein: fein,
                name: 'Business for Status Check',
            });

        const response = await request(app)
            .get(`/api/business/${fein}/status`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.business).toHaveProperty('status', 'New'); // Default status for new business
    });
});
