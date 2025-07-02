import React, { useEffect, useState } from 'react'
import { FaChevronDown, FaChevronRight, FaDatabase, FaTable } from 'react-icons/fa'
import styled from 'styled-components'

export default function DB() {
  const [schemas, setSchemas] = useState({})
  const [connectionString, setConnectionString] = useState(null)
  const [openSchemas, setOpenSchemas] = useState({})

  const [selectedTable, setSelectedTable] = useState("");

  const [activeTab, setActiveTab] = useState('structure')

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-data')

    const unsub = window.electron.ipcRenderer.on('load-data-response', (data) => {
      if (data && data.connectUrl) {
        setConnectionString(data.connectUrl)
      }
    })

    return () => {
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!connectionString) return

    async function fetchSchemas() {
      try {
        const response = await fetch('http://localhost:4000/api/getTablesAndSchemas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString }),
        })

        if (!response.ok) throw new Error('Erro ao buscar schemas')

        const data = await response.json()
        setSchemas(data)

        const allClosed = Object.keys(data).reduce((acc, key) => {
          acc[key] = false
          return acc
        }, {})
        setOpenSchemas(allClosed)
      } catch (error) {
        console.error(error)
      }
    }

    fetchSchemas()
  }, [connectionString])

  useEffect(() => {
    console.log(selectedTable)
  }, [selectedTable])

  function toggleSchema(schema) {
    setOpenSchemas((prev) => ({
      ...prev,
      [schema]: !prev[schema],
    }))
  }
  
  function toggleTable(schema, table) {
    const fullTableName = `${schema}."${table}"`
    setSelectedTable(fullTableName)
    setSelectedTable('structure')
  }

  return (
    <>
      <Sidebar>
        {Object.entries(schemas).length === 0 && <p style={{ color: '#ccc', padding: 10 }}>Carregando...</p>}
        {Object.entries(schemas).map(([schema, tables]) => (
          <SchemaBlock key={schema}>
            <SchemaTitleDiv onClick={() => toggleSchema(schema)}>
              <FaDatabase />
              <SchemaTitleText>
                {schema}
              </SchemaTitleText>
              {openSchemas[schema] ? <FaChevronDown /> : <FaChevronRight />}
            </SchemaTitleDiv>
            {openSchemas[schema] && (
              <TableList>
                {tables.map((table) => (
                  <TableItem onClick={() => toggleTable(schema, table)} key={table}>
                    <FaTable />
                    <TableText>{table}</TableText>
                  </TableItem>
                ))}
              </TableList>
            )}
          </SchemaBlock>
        ))}
      </Sidebar>

       <Content>
        <Tabs>
          <Tab $active={activeTab === 'structure'} onClick={() => setActiveTab('structure')}>
            Structure
          </Tab>
          <Tab $active={activeTab === 'content'} onClick={() => setActiveTab('content')}>
            Content
          </Tab>
          <Tab $active={activeTab === 'info'} onClick={() => setActiveTab('info')}>
            Info
          </Tab>
          <Tab $active={activeTab === 'query'} onClick={() => setActiveTab('query')}>
            Query
          </Tab>
        </Tabs>

        <MainContentArea>
          {activeTab === 'structure' && (
            <>
              <p>STRUCTURE</p>
            </>
          )}
          {activeTab === 'content' && (
            <>
              <p>CONTENT</p>
            </>
          )}
          {activeTab === 'info' && (
            <>
              <p>INFO</p>
            </>
          )}
          {activeTab === 'query' && (
            <>
              <p>QUERY</p>
            </>
          )}
        </MainContentArea>
      </Content>
    </>
  )
}

const Sidebar = styled.div`
  position: fixed;
  left: 0;
  top: 0;
  width: 250px;
  height: 100vh;
  background-color: #222;
  color: white;
  overflow-y: auto;
`

const SchemaBlock = styled.div`
`

const SchemaTitleDiv = styled.div`
  width: 92%;
  display: flex;
  align-items: center;
  cursor: pointer;
  background: rgb(21, 21, 21);
  user-select: none;
  padding: 10px;

  &:hover {
    opacity: 0.8;
  }
`

const SchemaTitleText = styled.div`
  font-weight: bold;
  font-size: 1.1em;
  margin-left: 8px;
  margin-right: 8px;
`

const TableList = styled.ul`
  list-style: none;
  padding-left: 10px;
  margin: 0;
`

const TableItem = styled.div`
  margin-top: 14px;
  font-size: 14px;
  cursor: pointer;
  align-items: center;
  display: flex;
  &:hover {
    text-decoration: underline;
  }
`
const TableText = styled.li`
  font-size: 14px;
  cursor: pointer;
  align-items: center;
  display: flex;
  margin-left: 7px;
  &:hover {
    text-decoration: underline;
  }
`

const Content = styled.div`
  margin-left: 250px;  /* abre espaço para o sidebar */
  width: calc(100% - 250px); /* ocupa o restante da tela */
  height: 100vh;
  // background: red;
  display: flex;
  flex-direction: column;
`

const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid black;
  height: 30px;
`

const Tab = styled.div`
  padding: 5px 12px;
  font-size: 13px;
  background-color: ${props => (props.$active ? 'rgb(21, 21, 21);' : '#222')};
  border-right: 1px solid black;
  display: flex;
  align-items: center;
  color: ${props => (props.$active ? 'white;' : 'white')};
  justify-content: center;
  cursor: pointer; 
  font-weight: ${props => (props.$active ? 'bold' : 'normal')};

  &:hover {
  }
`

const MainContentArea = styled.div`
  padding: 10px;
  // background: white;
  color: black;
  flex-grow: 1;
`

