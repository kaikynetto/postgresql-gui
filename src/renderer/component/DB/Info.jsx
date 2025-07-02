import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

export default function Info({ table }) {
  const [connectionString, setConnectionString] = useState(null)
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-data')
    const unsub = window.electron.ipcRenderer.on('load-data-response', (data) => {
      if (data && data.connectUrl) setConnectionString(data.connectUrl)
    })
    return () => {
      if (typeof unsub === 'function') unsub()
    }
  }, [])

  useEffect(() => {
    if (!connectionString || !table) return
    const cleanTable = table.replace(/"/g, '')
    const [schema, tableName] = cleanTable.split('.')
    setLoading(true)
    fetch('http://localhost:4000/api/getTableInfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString, schema, table: tableName }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then(data => {
        setInfo(data)
        setError(null)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [connectionString, table])

  if (loading) return <LoadingText>Loading informations...</LoadingText>
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>
  if (!info) return null

  return (
    <div>
      <Title>Informações da tabela: {table}</Title>
      <Informations>Tipo: {info.type}</Informations>
      <Informations>Linhas estimadas: {info.estimatedRowsCount.toLocaleString()}</Informations>
      <Informations>Tamanho total (bytes): {info.totalSizeBytes.toLocaleString()}</Informations>
      <Informations>Tamanho da tabela: {info.sizeDetails.tableSize.toLocaleString()} bytes</Informations>
      <Informations>Tamanho dos índices: {info.sizeDetails.indexesSize.toLocaleString()} bytes</Informations>
    </div>
  )
}

const Title = styled.h1`
    color: white;
    font-size: 28px;
`;

const Informations = styled.h1`
    color: white;
    font-size: 17px;
`;

const LoadingText = styled.p`
  font-style: italic;
  color: #ccc;
`;