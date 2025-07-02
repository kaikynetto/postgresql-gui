import React from 'react';
import styled from 'styled-components';

const ButtonStyled = styled.button`
  background-color:#222;
  color: white;
  border: 1px solid rgb(141, 141, 141);
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 1s ease;
  font-weight: 600;

  &:hover {
    border: 1px solid #222;
    background-color:rgb(13, 13, 13);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.5);
  }

  &:disabled {
    background-color: #999;
    border-color: #999;
    cursor: not-allowed;
    color: #ccc;
  }
`;

export default function Button({ children, onClick, disabled }) {
  return (
    <ButtonStyled onClick={onClick} disabled={disabled}>
      {children}
    </ButtonStyled>
  );
}
