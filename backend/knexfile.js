require('dotenv').config();
module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/propertydb',
    migrations: { directory: './migrations' }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './migrations' }
  }
};
