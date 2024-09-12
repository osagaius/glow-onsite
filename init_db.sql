CREATE TABLE businesses (
    id serial PRIMARY KEY,
    fein TEXT NOT NULL,
    name TEXT NOT NULL,
    industry TEXT,
    contact JSONB,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
