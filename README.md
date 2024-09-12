
## Setup

1. Get a Postgres database
2. Create a `.env` file in the project root, set the connection string of the aforementioned Postgres database as `DATABASE_URL`. You can use `.env.template` as a template.
3. Initialize the schema in the database by using `init_db.sql` in the project root. You can run it with `psql` or paste it into another tool of your choice.
4. Install npm dependencies: `npm install`
5. Start server: `npm start`

## Code base

A preconfigured Express server may be found in (index.ts)(index.ts). The `POST /api/user/register` endpoint has been implemented for you. It creates a user with the given username and password.

## Testing the API with curl and jq

You can test the `POST /api/business` endpoint using `curl` and format the response with `jq`.

### Step 1: Register a New Business

```bash
curl -X POST http://localhost:3000/api/business \
  -H "Content-Type: application/json" \
  -d '{
        "fein": "123456789",
        "name": "Test Business"
      }' | jq
```

This will create a new business, which starts with the workflow status `New`.

### Step 2: Progress the Business to Market Approved

From the "New" stage, the industry is required to progress the business. Only `restaurants` and `stores` are supported.

```bash
curl -X POST http://localhost:3000/api/business/123456789/progress \
  -H "Content-Type: application/json" \
  -d '{
        "industry": "restaurants"
      }' | jq
```

If the industry is valid (`restaurants` or `stores`), the business will move to the `Market Approved` stage.

### Step 3: Progress the Business to Sales Approved

From the "Market Approved" stage, a valid contact is needed to progress the business to "Sales Approved". Use the following command to provide the contact details:

```bash
curl -X POST http://localhost:3000/api/business/123456789/progress \
  -H "Content-Type: application/json" \
  -d '{
        "contact": {
          "name": "Jane Doe",
          "phone": "555-1234"
        }
      }' | jq
```

This will progress the business to the `Sales Approved` stage.

### Step 4: Progress the Business to Won

From the "Sales Approved" stage, the business can be marked as "Won". Use the following command to progress the business to "Won":

```bash
curl -X POST http://localhost:3000/api/business/123456789/progress \
  -H "Content-Type: application/json" \
  -d '{
        "status": "Won"
      }' | jq
```

### Step 5: Progress the Business to Lost

Alternatively, you can mark the business as "Lost":

```bash
curl -X POST http://localhost:3000/api/business/123456789/progress \
  -H "Content-Type: application/json" \
  -d '{
        "status": "Lost"
      }' | jq
```

### Check the Current Status of the Business

At any time, you can check the current status of the business by using this command:

```bash
curl -X GET http://localhost:3000/api/business/123456789/status | jq
```

This will return the current workflow stage of the business.
