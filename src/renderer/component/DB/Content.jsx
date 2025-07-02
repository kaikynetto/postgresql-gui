import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

export default function ContentTable({ table }) {
  const [connectionString, setConnectionString] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cellValue: '', rowIndex: null, columnKey: null });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [editModal, setEditModal] = useState({ visible: false, rowIndex: null, columnKey: null, newValue: '' });

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-data');
    const unsub = window.electron.ipcRenderer.on('load-data-response', (data) => {
      if (data && data.connectUrl) setConnectionString(data.connectUrl);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  useEffect(() => {
    if (!connectionString || !table) return;
    const cleanTable = table.replace(/"/g, '');
    const [schema, tableName] = cleanTable.split('.');
    setLoading(true);
    fetch('http://localhost:4000/api/getTableValues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString, schema, table: tableName }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setRows(data);
        setError(null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [connectionString, table]);

  const handleRightClick = (e, value, rowIndex, columnKey) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      cellValue: value,
      rowIndex,
      columnKey,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contextMenu.cellValue);
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleOpenEditModal = () => {
    setEditModal({
      visible: true,
      rowIndex: contextMenu.rowIndex,
      columnKey: contextMenu.columnKey,
      newValue: contextMenu.cellValue ?? '',
    });
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleCancelEdit = () => {
    setEditModal({ visible: false, rowIndex: null, columnKey: null, newValue: '' });
  };

  const handleChangeEditValue = (e) => {
    setEditModal({ ...editModal, newValue: e.target.value });
  };

  const handleSaveEdit = async () => {
    const { rowIndex, columnKey, newValue } = editModal;
    const row = rows[rowIndex];
    if (!row) return;
    const cleanTable = table.replace(/"/g, '');
    const [schema, tableName] = cleanTable.split('.');
    try {
      const res = await fetch('http://localhost:4000/api/editRow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          schema,
          table: tableName,
          primaryKey: 'id',
          primaryKeyValue: row.id,
          updates: { [columnKey]: newValue },
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert('Error: ' + (errorData.error || 'Unknown error'));
      } else {
        const updatedRows = [...rows];
        updatedRows[rowIndex][columnKey] = newValue;
        setRows(updatedRows);
        setEditModal({ visible: false, rowIndex: null, columnKey: null, newValue: '' });
      }
    } catch (error) {
      alert('Fetch error: ' + error.message);
      setEditModal({ visible: false, rowIndex: null, columnKey: null, newValue: '' });
    }
  };

  const handleDeleteRow = async () => {
    const row = rows[contextMenu.rowIndex];
    if (!row) return;
    const cleanTable = table.replace(/"/g, '');
    const [schema, tableName] = cleanTable.split('.');
    try {
      const res = await fetch('http://localhost:4000/api/deleteRow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          schema,
          table: tableName,
          primaryKey: 'id',
          primaryKeyValue: row.id,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert('Error: ' + (errorData.error || 'Unknown error'));
      } else {
        setRows(rows.filter((_, idx) => idx !== contextMenu.rowIndex));
        setContextMenu({ ...contextMenu, visible: false });
      }
    } catch (error) {
      alert('Fetch error: ' + error.message);
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') { direction = null; key = null; }
    setSortConfig({ key, direction });
  };

  let sortedRows = [...rows];
  if (sortConfig.key && sortConfig.direction) {
    sortedRows.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA === null) return 1;
      if (valB === null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
  }

  useEffect(() => {
    const handleClickOutside = () => { if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false }); };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  if (loading) return <LoadingText>Loading data...</LoadingText>;
  if (error) return <ErrorText>{error}</ErrorText>;
  if (!rows.length) return <NoDataText>No data found.</NoDataText>;

  const columns = Object.keys(rows[0]);

  return (
    <>
      <TableWrapper>
        <TableScroll>
          <Table>
            <Thead>
              <Tr>
                {columns.map(col => (
                  <Th key={col} onClick={() => handleSort(col)}>
                    {col} {sortConfig.key === col ? (sortConfig.direction === 'asc' ? '▲' : sortConfig.direction === 'desc' ? '▼' : '') : ''}
                  </Th>
                ))}
              </Tr>
            </Thead>
            <tbody>
              {sortedRows.map((row, idx) => (
                <Tr key={idx}>
                  {columns.map(col => (
                    <Td key={col} onContextMenu={(e) => handleRightClick(e, row[col], idx, col)}>
                      {row[col] === null ? '-' : String(row[col])}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
        {contextMenu.visible && (
          <ContextMenu style={{ top: contextMenu.y, left: contextMenu.x }}>
            <MenuItem onClick={handleCopy}>Copy Value</MenuItem>
            <MenuItem onClick={handleOpenEditModal}>Edit Value</MenuItem>
            <MenuItem onClick={handleDeleteRow}>Delete Row</MenuItem>
          </ContextMenu>
        )}
      </TableWrapper>

      {editModal.visible && (
        <ModalOverlay onClick={handleCancelEdit}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalTitle>Edit {editModal.columnKey}</ModalTitle>
            <ModalInput type="text" value={editModal.newValue} onChange={handleChangeEditValue} autoFocus />
            <ModalButtons>
              <ModalButton onClick={handleSaveEdit}>Save</ModalButton>
              <ModalButton onClick={handleCancelEdit}>Cancel</ModalButton>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}

const TableWrapper = styled.div`
  margin-top: 20px;
  max-width: 100%;
  max-height: 90vh;
  padding: 10px;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
`;

const TableScroll = styled.div`
  overflow-x: auto;
  overflow-y: auto;
  max-height: 85vh;
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }
  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #777;
  }
`;

const Table = styled.table`
  width: max-content;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
  color: white;
  margin-bottom: 10px;
  white-space: nowrap;
`;

const Thead = styled.thead``;

const Th = styled.th`
  padding: 10px;
  text-align: left;
  border: 1px solid rgb(24, 24, 24);
  cursor: pointer;
  user-select: none;
  &:hover {
    background-color: #444;
  }
`;

const Td = styled.td`
  padding: 8px 10px;
  border: 1px solid rgb(24, 24, 24);
  cursor: default;
`;

const Tr = styled.tr`
  &:nth-child(even) {
    background-color: #2e2e2e;
  }
`;

const ContextMenu = styled.div`
  position: fixed;
  background: #333;
  color: white;
  border: 1px solid #555;
  border-radius: 4px;
  z-index: 1000;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
`;

const MenuItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  &:hover {
    background: #555;
  }
`;

const LoadingText = styled.p`
  font-style: italic;
  color: #ccc;
`;

const ErrorText = styled.p`
  color: red;
`;

const NoDataText = styled.p`
  color: #aaa;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
`;

const ModalContent = styled.div`
  background: #222;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  color: white;
`;

const ModalTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 8px;
  font-size: 1rem;
  margin-bottom: 15px;
  border-radius: 4px;
  border: 1px solid #555;
  background: #111;
  color: white;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const ModalButton = styled.button`
  background: #444;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: #666;
  }
`;
