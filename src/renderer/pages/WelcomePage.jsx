import React, { useState } from 'react';
import styled from 'styled-components';
import Input from '../component/Input';
import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const [tabSelected, setTabSelected] = useState("standard");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [start_query, setStartQuery] = useState("");
  const [urlConnect, setUrlConnect] = useState("");
  const [connectOnStart, setConnectOnStart] = useState(false);
  const navigate = useNavigate();

  const connectOnDatabase = async () => {
    let urlToConnect;
    if (tabSelected === "standard") {
      if (!host || !port || !username || !password || !database) {
        alert("Please fill in all required fields in the Standard tab.");
        return;
      }
      urlToConnect = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
      setUrlConnect(urlToConnect);
    } else if (tabSelected === "connectUrl") {
      if (!urlConnect) {
        alert("Please fill in the connection URL.");
        return;
      }
      urlToConnect = urlConnect;
    }

    try {
      const response = await fetch('http://localhost:4000/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString: urlToConnect }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("CONNECTED!")
        const newDate = { connectUrl: urlToConnect };
        window.electron.ipcRenderer.sendMessage('save-data', newDate);
        navigate('/DB');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <BoxContainer>
      <BoxCard>
        <Tabs>
          <Tab active={tabSelected === "standard"} onClick={() => setTabSelected("standard")}>Standard</Tab>
          <Tab active={tabSelected === "connectUrl"} onClick={() => setTabSelected("connectUrl")}>Connect URL</Tab>
        </Tabs>

        {tabSelected === "standard" ? (
          <Form>
            <Label>Host</Label>
            <Input value={host} onChange={e => setHost(e.target.value)} placeholder="localhost" />

            <Label>Port</Label>
            <Input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="5432" />

            <Label>Username</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} />

            <Label>Password</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} type="password" />

            <Label>Database</Label>
            <Input value={database} onChange={e => setDatabase(e.target.value)} />

            <Label>Start Query</Label>
            <Input value={start_query} onChange={e => setStartQuery(e.target.value)} />

            <CheckboxWrapper>
              <input checked={connectOnStart} onChange={e => setConnectOnStart(e.target.checked)} type="checkbox" id="connect" />
              <CheckboxLabel htmlFor="connect">Connect on start</CheckboxLabel>
            </CheckboxWrapper>
            <ConnectButton onClick={connectOnDatabase}>Connect</ConnectButton>
          </Form>
        ) : (
          <Form>
            <Label>Connection URL</Label>
            <Input value={urlConnect} onChange={e => setUrlConnect(e.target.value)} placeholder="postgres://username@localhost/username" />
            <CheckboxWrapper>
              <input checked={connectOnStart} onChange={e => setConnectOnStart(e.target.checked)} type="checkbox" id="connect" />
              <CheckboxLabel htmlFor="connect">Connect on start</CheckboxLabel>
            </CheckboxWrapper>
            <ConnectButton onClick={connectOnDatabase}>Connect</ConnectButton>
          </Form>
        )}
      </BoxCard>
    </BoxContainer>
  );
}

const BoxContainer = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const BoxCard = styled.div`
  background: rgb(63, 63, 63);
  border: 1px solid rgb(152, 152, 152);
  padding: 20px;
  width: 300px;
  border-radius: 6px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.1);
`;

const Tabs = styled.div`
  display: flex;
  margin-bottom: 15px;
`;

const Tab = styled.div`
  flex: 1;
  text-align: center;
  padding: 6px 0;
  background: ${props => (props.active ? '#292929' : '#d0d0d0')};
  color: ${props => (props.active ? '#ffffff' : '#292929')};
  border-radius: 4px 4px 0 0;
  font-size: 14px;
  cursor: pointer;
  margin-right: 2px;
  &:last-child {
    margin-right: 0;
  }
`;

const Form = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 13px;
  margin-bottom: 3px;
  margin-top: 8px;
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 10px;
`;

const CheckboxLabel = styled.label`
  font-size: 13px;
  margin-left: 5px;
`;

const ConnectButton = styled.button`
  margin-top: 15px;
  padding: 8px 0;
  background: rgb(136, 136, 136);
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  transition: background 1s ease;
  &:hover {
    background: #292929;
    color: white;
  }
`;
