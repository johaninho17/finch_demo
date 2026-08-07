import Finch from '@tryfinch/finch-api/index.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path'
import { fileURLToPath } from 'url';
dotenv.config();

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(_dirname, 'public')));

// inizialize finch client
const finch = new Finch({
    clientID: process.env['FINCH_CLIENT_ID'],
    clientSecret: process.env['FINCH_CLIENT_SECRET'],
});

// finch customer
const customer = {
    id: 'finch_test',
    name: 'Finch Tester',
};

// access token - server side
let currentAccessToken = null;

// Connect session url
app.get('/api/finch/connect-url', async (req, res) => {
    try {
        const session = await finch.connect.sessions.new({
            products: ["company", "directory", "individual", "employment"],
            customer_id: customer.id, // customer ID
            customer_name: customer.name, // customer name
            minutes_to_expire: 43200, // defaults to 30 days
            redirect_uri: `http://localhost:${process.env.port || 3000}/api/finch/callback`,
            sandbox: 'finch'
        });
        res.json({ connect_url: session.connect_url })

    } catch (error) {

        // re-authenticate if connection exists
        const existingConnectionId = error.error?.context?.connection_id;
        if (error.status === 400 && existingConnectionId) {
            try {
                const reauthSession = await finch.connect.sessions.reauthenticate(
                    {
                        connection_id: existingConnectionId,
                        redirect_uri: `http://localhost:${process.env.PORT || 3000}/api/finch/callback`
                    },
                    {
                        clientID: process.env.FINCH_CLIENT_ID,
                        clientSecret: process.env.FINCH_CLIENT_SECRET,
                    }
                );
                return res.json({ connect_url: reauthSession.connect_url });
            } catch (reauthErr) {
                return res.status(500).json({ error: true, message: reauthErr.message });
            }
        }

        console.error('Connect URL Generation Error:', error);
        res.status(500).json({ error: true, message: error.message });
    }
});

// server side callback
app.get('/api/finch/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Missing auth code' });
    }

    try {
        // exchange auth code for access token with finch sdk
        const tokenResponse = await finch.accessTokens.create({
            client_id: finch.clientID,
            client_secret: finch.clientSecret,
            code: code,
            redirect_uri: `http://localhost:${process.env.port || 3000}/api/finch/callback`,
        });

        currentAccessToken = tokenResponse.access_token;
        console.log('Access token acquired', currentAccessToken);
        res.redirect('/');
    }
    catch (error) {
        console.error('Error exchanging token:', error);
        res.status(500).send(`Error exchanging token for an 
            authorization code:${error.message}`);
    }
});

// ensure token exists before executing calls
function requireToken(req, res, next) {
    if (!currentAccessToken) {
        return res.status(401).json({
            error: true,
            message: 'No access token available. Connect to Finch Connect provider.'
        });
    }
    finch.accessToken = currentAccessToken;
    next();
}

// employer company data
app.get('/api/company', requireToken, async (req, res) => {
    try {
        const company = await finch.hris.company.retrieve();
        res.json(company);
    } catch (error) {
        handleFinchError(res, error, 'Company');
    }
});

// employer directory data
app.get('/api/directory', requireToken, async (req, res) => {
    try {
        const directory = await finch.hris.directory.list();
        res.json(directory);
    } catch (error) {
        handleFinchError(res, error, 'Directory');
    }
});

// employer individual data
app.post('/api/individual', requireToken, async (req, res) => {
    const { individual_id } = req.body;
    if (!individual_id) {
        return res.status(400).json({ error: true, message: 'individual_id is required' });
    }

    try {
        const response = await finch.hris.individuals.retrieveMany(
            { requests: [{ individual_id }] }
        );

        res.json(response);
    } catch (error) {
        handleFinchError(res, error, 'Individual');
    }
});

// employer employment data
app.post('/api/employment', requireToken, async (req, res) => {
    const { individual_id } = req.body;
    if (!individual_id) {
        return res.status(400).json({ error: true, message: 'individual_id is required' });
    }

    try {
        const response = await finch.hris.employments.retrieveMany(
            { requests: [{ individual_id }] }
        );

        res.json(response);
    } catch (error) {
        handleFinchError(res, error, 'Employment');
    }
})

// webhook receiver route
app.post('/webhook', (req, res) => {
    const signature = req.headers['finch-signature'];
    const payload = req.body;
    console.log('🔔 Received Webhook Event:', payload.event_type);
    console.log('Header Signature:', signature);
    console.log('Payload Data:', payload);

    // acknowledge receipt
    res.status(200).send('Webhook Received');
});

// error handler for unsupported endpoints
function handleFinchError(res, error, msg) {
    console.error('Finch API error:', error);
    const status = error.status || 500;
    const isUnimplemented = status === 501
        || (error.message && error.message.includes('not implemented'));

    res.status(status).json({
        error: true,
        isUnimplemented,
        message: isUnimplemented ? `This provider has not implemented the ${msg} endpoint` :
            (error.message || `Failed to load ${msg} data`)
    });
}


const PORT = process.env.port || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));