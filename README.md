# Finch Demo Dashboard

A Node.js and Express application integrating Finch's Unified API to fetch employer data across HRIS & payroll providers.

Built by Johan Yamssi for the Developer Success Engineer Technical challenge

---

## Technology Stack

* **Backend**: Node.js, Express.js
* **SDK**: Official `@tryfinch/finch-api` (v10.4.0)
* **Frontend**: HTML5, Vanilla JavaScript, Bootstrap 5

---

## Features

* **OAuth 2.0 & Re-authentication**: Integration with Finch Connect. Automatically handles existing connections via `finch.connect.sessions.reauthenticate`.
* **Server-Side Token Security**: Access tokens are kept strictly in server-side memory (`currentAccessToken`) and injected into SDK calls, preventing token exposure to the client browser.
* **Company & Directory Insights**: Retrieves company metadata and interactive employee directory lists.
* **Webhook Receiver**: Includes `/webhook` POST route acknowledging incoming webhook events with HTTP 200 OK.

---

## Quickstart Guide

### 1. Requirements
**Node.js (v16+)** and **npm** installed on your system

### 2. Installation

Clone the repository and install dependencies

```bash
cd finch_demo
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and copy `.env.example`:

```bash
cp .env.example .env
```

Add your Finch API keys to `.env`:

```env
FINCH_CLIENT_ID=your_client_id_here
FINCH_CLIENT_SECRET=your_client_secret_here
PORT=3000
```

### 4. Start the Application
Run the start script:

```bash
npm start
```

Open your browser and navigate to **`http://localhost:3000`**.