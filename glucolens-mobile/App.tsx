import React from 'react';
import { Alert, Text, View } from 'react-native';
import { StackNavigator } from '@r¶Screen';
import HomeScreen from './screens/HomeScreen';

type RootStackParamList = {
  Home: undefined;
};

const Stack = StackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Stack.screens>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
      />
    </Stack.screens>
  );
}
