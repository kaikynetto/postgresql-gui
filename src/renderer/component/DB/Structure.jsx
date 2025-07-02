import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import Button from '../Button';
import Input from '../Input';

function Modal({ show, onClose, onSave, initialData }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');
  const [defaultValue, setDefaultValue] = useState('');
  const [maxLength, setMaxLength] = useState('');
  const [allowNull, setAllowNull] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setType(initialData.type || 'text');
      setDefaultValue(initialData.defaultValue || '');
      setMaxLength(initialData.maxLength || '');
      setAllowNull(initialData.allowNull || false);
    } else {
      setName('');
      setType('text');
      setDefaultValue('');
      setMaxLength('');
      setAllowNull(false);
    }
  }, [initialData]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Name is required');
      return;
    }
    onSave({ name, type, defaultValue, maxLength, allowNull });
  };

  return (
    <ModalOverlay
      style={{ display: show ? 'flex' : 'none' }}
      onClick={onClose}
    >
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h3>{initialData ? 'Edit Column' : 'Add New Column'}</h3>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>
        <ModalBody>
          <Input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Column Name"
            style={{ marginBottom: 10 }}
            disabled={!!initialData}
          />
          <Label>
            Type:
            <Select
              value={type}
              onChange={e => setType(e.target.value)}
            //   disabled={!!initialData}
            >
              <option value="text">Text</option>
              <option value="integer">Integer</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
              <option value="varchar">Varchar</option>
              <option value="float">Float</option>
            </Select>
          </Label>
          <Input
            type="text"
            value={defaultValue}
            onChange={e => setDefaultValue(e.target.value)}
            placeholder="Default Value"
            style={{ marginBottom: 10 }}
          />
          <Input
            type="number"
            value={maxLength}
            onChange={e => setMaxLength(e.target.value)}
            placeholder="Max Length"
            style={{ marginBottom: 10 }}
            min="0"
            disabled={type !== 'varchar'}
          />
          <LabelCheckbox>
            <input
              type="checkbox"
              checked={allowNull}
              onChange={e => setAllowNull(e.target.checked)}
            />
            Allow Null
          </LabelCheckbox>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
}

export default function Structure({ table }) {
  const [loading, setLoading] = useState(false);
  const [connectionString, setConnectionString] = useState(null);
  const [columns, setColumns] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [oldColumnName, setOldColumnName] = useState(null);

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('load-data');
    const unsub = window.electron.ipcRenderer.on('load-data-response', (data) => {
      if (data && data.connectUrl) setConnectionString(data.connectUrl);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const fetchStructure = useCallback(() => {
    if (!connectionString || !table) return;
    const [schema, rawTable] = table.split('.');
    const tableName = rawTable.replace(/"/g, '');
    setLoading(true);
    fetch('http://localhost:4000/api/getTableStructure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString, schema, table: tableName }),
    })
      .then(res => res.json())
      .then(data => {
        setColumns(data);
        setLoading(false);
      })
      .catch(() => {
        setColumns([]);
        setLoading(false);
      });
  }, [connectionString, table]);

  useEffect(() => {
    fetchStructure();
  }, [fetchStructure]);

  const handleAddColumn = async (newColumn) => {
    const [schema, rawTable] = table.split('.');
    const tableName = rawTable.replace(/"/g, '');
    try {
      const res = await fetch('http://localhost:4000/api/addColumn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          schema,
          table: tableName,
          name: newColumn.name,
          type: newColumn.type,
          maxLength: newColumn.maxLength,
          defaultValue: newColumn.defaultValue,
          allowNull: newColumn.allowNull,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert('Error: ' + (errorData.error || 'Unknown error'));
      } else {
        fetchStructure();
        setShowModal(false);
      }
    } catch (error) {
      alert('Fetch error: ' + error.message);
    }
  };

  const handleEditColumn = async (updatedColumn) => {
    const [schema, rawTable] = table.split('.');
    const tableName = rawTable.replace(/"/g, '');
    try {
      const res = await fetch('http://localhost:4000/api/editColumn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          schema,
          table: tableName,
          oldName: oldColumnName,
          newName: updatedColumn.name,
          type: updatedColumn.type,
          maxLength: updatedColumn.maxLength,
          defaultValue: updatedColumn.defaultValue,
          allowNull: updatedColumn.allowNull,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert('Error: ' + (errorData.error || 'Unknown error'));
      } else {
        fetchStructure();
        setShowModal(false);
        setEditingColumn(null);
        setOldColumnName(null);
      }
    } catch (error) {
      alert('Fetch error: ' + error.message);
    }
  };

  const handleDeleteColumn = async (columnName) => {
    const [schema, rawTable] = table.split('.');
    const tableName = rawTable.replace(/"/g, '');
    try {
      const res = await fetch('http://localhost:4000/api/deleteColumn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionString,
          schema,
          table: tableName,
          column: columnName,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert('Error: ' + (errorData.error || 'Unknown error'));
      } else {
        fetchStructure();
      }
    } catch (error) {
      alert('Fetch error: ' + error.message);
    }
  };

  return (
    <div>
      <h2 style={{ color: 'white' }}>{table}</h2>
      {loading && <LoadingText>Loading structure...</LoadingText>}
      {!loading && columns.length > 0 && (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Column</Th>
                <Th>Type</Th>
                <Th>Nullable</Th>
                <Th>Max Length</Th>
                <Th>Primary Key</Th>
                <Th></Th>
                <Th></Th>
              </Tr>
            </Thead>
            <tbody>
              {columns.map(col => (
                <Tr key={col.column_name}>
                  <Td>{col.column_name}</Td>
                  <Td>{col.data_type}</Td>
                  <Td>{col.is_nullable}</Td>
                  <Td>{col.character_maximum_length || '-'}</Td>
                  <Td>{col.primary_key ? 'Yes' : '-'}</Td>
                  <TdDeleteEdit onClick={() => {
                    setEditingColumn({
                      name: col.column_name,
                      type: col.data_type,
                      defaultValue: '',
                      maxLength: col.character_maximum_length || '',
                      allowNull: col.is_nullable === 'YES',
                    });
                    setOldColumnName(col.column_name);
                    setShowModal(true);
                  }}>Edit</TdDeleteEdit>
                  <TdDeleteEdit onClick={() => handleDeleteColumn(col.column_name)}>Delete</TdDeleteEdit>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Button onClick={() => {
            setEditingColumn(null);
            setOldColumnName(null);
            setShowModal(true);
          }}>Add Column</Button>
        </TableWrapper>
      )}
      {!loading && columns.length === 0 && <NoDataText>No structure data found.</NoDataText>}

      <Modal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingColumn(null);
          setOldColumnName(null);
        }}
        onSave={editingColumn ? handleEditColumn : handleAddColumn}
        initialData={editingColumn}
      />
    </div>
  );
}

const TableWrapper = styled.div`
  margin-top: 20px;
  overflow-x: auto;
  padding: 10px;
  border-radius: 6px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
  color: white;
  margin-bottom: 10px;
`;

const Thead = styled.thead``;

const Th = styled.th`
  padding: 10px;
  text-align: left;
  border: 1px solid rgb(24, 24, 24);
`;

const Td = styled.td`
  padding: 8px 10px;
`;

const TdDeleteEdit = styled.td`
  padding: 8px 10px;
  cursor: pointer;
  text-decoration: underline;
  &:hover {
    opacity: 0.8;
  }
`;

const Tr = styled.tr`
  &:nth-child(even) {
    background-color: #2e2e2e;
  }
`;

const LoadingText = styled.p`
  font-style: italic;
  color: #ccc;
`;

const NoDataText = styled.p`
  color: #aaa;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: #222;
  color: white;
  padding: 20px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 0 10px #000;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 28px;
  line-height: 28px;
  cursor: pointer;
  color: white;
  &:hover {
    color: #ccc;
  }
`;

const ModalBody = styled.div`
  margin: 15px 0;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: white;
  font-weight: 500;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  background: #292929;
  color: white;
  border-radius: 3px;
  box-sizing: border-box;
`;

const LabelCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-weight: 500;
  margin-top: 10px;
  input {
    cursor: pointer;
  }
`;
