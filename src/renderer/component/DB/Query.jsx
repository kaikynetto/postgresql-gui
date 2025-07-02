import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import Button from '../Button'

export default function Query({ table }) {
  const [connectionString, setConnectionString] = useState(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null) // Vai guardar { rows: [], fields: [] }
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (data) => {
      if (data && data.connectUrl) setConnectionString(data.connectUrl)
    }
    window.electron.ipcRenderer.sendMessage('load-data')
    window.electron.ipcRenderer.on('load-data-response', handler)
    return () => {
      window.electron.ipcRenderer.removeListener('load-data-response', handler)
    }
  }, [])

  const handleRunQuery = async () => {
    if (!query.trim() || !connectionString) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('http://localhost:4000/api/runQuery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, connectionString }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <StyledInput placeholder="Tabela (opcional)" value={table || ''} readOnly />
      <StyledTextarea
        placeholder="Type your query here"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <Button onClick={handleRunQuery} disabled={loading || !connectionString}>
        {loading ? 'Executing...' : 'Execute Query'}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}

      {result && result.rows && result.rows.length > 0 ? (
        <TableWrapper>
          <StyledTable>
            <thead>
              <tr>
                {result.fields.map(field => (
                  <th key={field}>{field}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i}>
                  {result.fields.map(field => (
                    <td key={field}>{row[field] !== null ? row[field].toString() : '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </StyledTable>
        </TableWrapper>
      ) : result && result.rows && result.rows.length === 0 ? (
        <NoDataText>No data founded.</NoDataText>
      ) : null}
    </div>
  )
}

const StyledInput = styled.input`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  background: #292929;
  color: white;
  border-radius: 3px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 10px;
`

const StyledTextarea = styled.textarea`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  background: #292929;
  color: white;
  border-radius: 3px;
  width: 100%;
  box-sizing: border-box;
  height: 120px;
  resize: vertical;
  margin-bottom: 10px;
`

const TableWrapper = styled.div`
  max-height: 400px;
  overflow: auto;
  margin-top: 15px;
  border: 1px solid #444;
  border-radius: 4px;
`

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: white;

  th, td {
    border: 1px solid #555;
    padding: 8px;
    text-align: left;
  }

  th {
    background-color: #333;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  tr:nth-child(even) {
    background-color: #222;
  }
`

const ErrorText = styled.div`
  color: red;
  margin-top: 10px;
`

const NoDataText = styled.div`
  margin-top: 15px;
  color: #aaa;
`
