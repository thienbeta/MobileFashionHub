import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { ActivityIndicator, View, Alert } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const [shouldNavigate, setShouldNavigate] = useState<string | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const userFile = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(userFile);

        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(userFile);
          const data = JSON.parse(content);

          if (data.biometricEnabled) {
            // Check biometric support
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Xác thực bằng sinh trắc học để tiếp tục',
                cancelLabel: 'Hủy',
                fallbackLabel: 'Sử dụng mật khẩu',
              });

              if (result.success) {
                // Retrieve token from secure store
                const token = await SecureStore.getItemAsync('userToken');
                const userData = await SecureStore.getItemAsync('userData');

                if (token && userData) {
                  setShouldNavigate('/(tabs)/index');
                } else {
                  // Clear user.json if secure store data is missing
                  await FileSystem.deleteAsync(userFile, { idempotent: true });
                  setShouldNavigate('/(auth)/login');
                }
              } else {
                setShouldNavigate('/(auth)/login');
              }
            } else {
              Alert.alert('Thông báo', 'Thiết bị không hỗ trợ xác thực sinh trắc học hoặc chưa đăng ký.');
              setShouldNavigate('/(auth)/login');
            }
          } else {
            setShouldNavigate('/(auth)/login');
          }
        } else {
          setShouldNavigate('/(auth)/login');
        }
      } catch (error) {
        console.error('Error checking user.json or biometrics:', error);
        setShouldNavigate('/(auth)/login');
      }
    };

    checkLogin();
  }, []);

  useEffect(() => {
    if (shouldNavigate) {
      router.replace(shouldNavigate);
    }
  }, [shouldNavigate, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="blue" />
    </View>
  );
}