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

  app.post('/api/getTableStructure', async (req, res) => {
  const { connectionString, schema, table } = req.body;

  if (!connectionString) {
    return res.status(400).json({ error: 'connectionString is required in body' });
  }
  if (!schema) {
    return res.status(400).json({ error: 'schema is required in body' });
  }
  if (!table) {
    return res.status(400).json({ error: 'table is required in body' });
  }

  const pool = new Pool({ connectionString });

  try {
    const query = `
      SELECT
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        c.character_maximum_length,
        CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN true ELSE false END AS primary_key
      FROM
        information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu
          ON c.table_name = kcu.table_name
          AND c.column_name = kcu.column_name
          AND c.table_schema = kcu.table_schema
        LEFT JOIN information_schema.table_constraints tc
          ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
          AND tc.constraint_type = 'PRIMARY KEY'
      WHERE
        c.table_schema = $1
        AND c.table_name = $2
      ORDER BY
        c.ordinal_position;
    `;

    const result = await pool.query(query, [schema, table]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get table structure', details: (error as Error).message });
  } finally {
    await pool.end();
  }
  });

  app.post('/api/addColumn', async (req, res) => {
    const { connectionString, schema, table, name, type, defaultValue, maxLength, allowNull } = req.body;

    if (!connectionString || !schema || !table || !name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = new Pool({ connectionString });

    try {
      let columnType = type;
      if (type.toLowerCase() === 'varchar' && maxLength) {
        columnType = `VARCHAR(${parseInt(maxLength, 10)})`;
      }

      let nullClause = allowNull ? 'NULL' : 'NOT NULL';

      let defaultClause = '';
      if (defaultValue !== undefined && defaultValue !== '') {
        if (['text', 'varchar', 'char'].includes(type.toLowerCase())) {
          defaultClause = `DEFAULT '${defaultValue}'`;
        } else {
          defaultClause = `DEFAULT ${defaultValue}`;
        }
      }

      const query = `
        ALTER TABLE "${schema}"."${table}"
        ADD COLUMN "${name}" ${columnType} ${nullClause} ${defaultClause};
      `;

      await pool.query(query);

      res.json({ message: 'Column added successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  });

  app.post('/api/deleteColumn', async (req, res) => {
    const { connectionString, schema, table, column } = req.body;

    if (!connectionString || !schema || !table || !column) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = new Pool({ connectionString });

    try {
      const query = `
        ALTER TABLE "${schema}"."${table}"
        DROP COLUMN "${column}"
      `;

      await pool.query(query);

      res.json({ message: `Column ${column} deleted from table ${schema}.${table}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  });

  app.post('/api/editColumn', async (req, res) => {
    const { connectionString, schema, table, oldName, newName, type, defaultValue, maxLength, allowNull } = req.body;

    if (!connectionString || !schema || !table || !oldName || !newName || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = new Pool({ connectionString });

    try {
      await pool.query('BEGIN');

      if (oldName !== newName) {
        await pool.query(`
          ALTER TABLE "${schema}"."${table}" 
          RENAME COLUMN "${oldName}" TO "${newName}";
        `);
      }

      let columnType;
      if (type.toLowerCase() === 'varchar' && maxLength) {
        columnType = `VARCHAR(${parseInt(maxLength, 10)})`;
      } else {
        columnType = type.toUpperCase();
      }

      if (type.toLowerCase() === 'boolean') {
        await pool.query(`
          ALTER TABLE "${schema}"."${table}"
          ALTER COLUMN "${newName}" TYPE boolean USING
          CASE WHEN "${newName}"::text = 'true' THEN true ELSE false END;
        `);
      } else {
        await pool.query(`
          ALTER TABLE "${schema}"."${table}"
          ALTER COLUMN "${newName}" TYPE ${columnType};
        `);
      }

      if (allowNull) {
        await pool.query(`
          ALTER TABLE "${schema}"."${table}"
          ALTER COLUMN "${newName}" DROP NOT NULL;
        `);
      } else {
        await pool.query(`
          ALTER TABLE "${schema}"."${table}"
          ALTER COLUMN "${newName}" SET NOT NULL;
        `);
      }

      if (defaultValue !== undefined && defaultValue !== '') {
        let defVal = defaultValue;
        if (['text', 'varchar', 'char'].includes(type.toLowerCase())) {
          defVal = `'${defaultValue}'`;
        }
        await pool.query(`
          ALTER TABLE "${schema}"."${table}"
          ALTER COLUMN "${newName}" SET DEFAULT ${defVal};
        `);
      } else {
        await pool.query(`
          ALTER TABLE "${schema}"."${table}"
          ALTER COLUMN "${newName}" DROP DEFAULT;
        `);
      }

      await pool.query('COMMIT');

      res.json({ message: 'Column edited successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      res.status(500).json({ error: error.message });
    } finally {
      await pool.end();
    }
  });




  app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}`);
  });
}
