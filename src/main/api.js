import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

export function startApiServer() {
  const app = express();
  const port = 4000;

  app.use(cors());
  app.use(express.json());

  app.post('/api/connect', async (req, res) => {
    const { connectionString } = req.body;

    if (!connectionString) {
      return res.status(400).json({ error: 'connectionString is required' });
    }

    const pool = new Pool({ connectionString });

    try {
      const result = await pool.query('SELECT NOW()');
      res.json({ message: 'Connection successful!', serverTime: result.rows[0].now });
    } catch (error) {
      res.status(500).json({ error: 'Failed to connect to the bank', details: (error as Error).message });
    } finally {
      await pool.end();
    }
  });

  app.post('/api/getTablesAndSchemas', async (req, res) => {
    const { connectionString } = req.body;

    if (!connectionString) {
      return res.status(400).json({ error: 'connectionString is required in body' });
    }

    const pool = new Pool({ connectionString });

    try {
      const query = `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
      `;

      const result = await pool.query(query);

      const grouped = result.rows.reduce((acc, { table_schema, table_name }) => {
        if (!acc[table_schema]) {
          acc[table_schema] = [];
        }
        acc[table_schema].push(table_name);
        return acc;
      }, {} as Record<string, string[]>);

      res.json(grouped);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get tables and schemas', details: (error as Error).message });
    } finally {
      await pool.end();
    }
  });

  app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
  });
}
