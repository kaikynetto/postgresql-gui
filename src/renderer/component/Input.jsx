import React from 'react';
import styled from 'styled-components';

export default function Input({ placeholder, type = "text", value, onChange }) {
  return (
    <InputWrapper>
      <StyledInput
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={onChange}
      />
    </InputWrapper>
  );
}

const InputWrapper = styled.div`
  margin-bottom: 10px;
`;

const StyledInput = styled.input`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ccc;
  background: #292929;
  color: white;
  border-radius: 3px;
  width: 100%;
  box-sizing: border-box;
`;
