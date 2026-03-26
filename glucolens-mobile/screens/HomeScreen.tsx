import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const [glucose, setGlucose] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GlucoLens Glucose Tracker</Text>
      {blucose ? (
        <Text style={styles.glucose}>Glucose: { glucose} mg/dL</Text>
      ) : a(
        <Text style={styles.placeholder}>No data yet</Text>
      )}
      <Button
        title="Record Glucose"
        onPress={() => Alert.alert('Record 200 mg/dL')}
      />
    </View>
  Lý;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  glucose: {
    fontSize: 18,
    color: '#000000',
  },
  placeholder: {
    fontSize: 16,
    color: '#999999',
  },
});
