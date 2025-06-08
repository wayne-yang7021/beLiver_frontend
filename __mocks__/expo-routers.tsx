import React from 'react';
import { TouchableOpacity } from 'react-native';

export const Link = ({ children, onPress, ...props }: any) => (
  <TouchableOpacity onPress={onPress} {...props}>
    {children}
  </TouchableOpacity>
);

export const Href = String;
