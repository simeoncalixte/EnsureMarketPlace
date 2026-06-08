# SubmissionUI

Standalone React frontend for exercising submission payloads against the Ensured Marketplace API.

## Run

1. `npm install`
2. `npm run dev`

`npm run dev` starts both the Vite frontend on port `30025` and the local RabbitMQ relay on port `30026`.

If you want to start only one side:

1. `npm run frontend` for the UI only.
2. `npm run relay` for the RabbitMQ relay only.

## Defaults

- API origin: `http://localhost:3001`
- Dev server: `http://localhost:30025`
- RabbitMQ relay: `http://localhost:30026`
- RabbitMQ queue: `ingest_submissions`

Use a Bearer token with a valid `userId` claim to reach the underwriting endpoints.

Custom payloads are published to RabbitMQ through the relay, while board snapshots, board config updates, and status changes still call the API directly.