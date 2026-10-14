import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>BEKAS</Text>
        <Text style={styles.message}>Fondasi aplikasi siap.</Text>
        <Text style={styles.note}>Alur foto barang akan dibangun di sini.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F2',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#294C35',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 1,
  },
  message: {
    color: '#203128',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
  },
  note: {
    color: '#607064',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
});
