import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

export const useAutoLogin = () => {
  const router = useRouter();

  useEffect(() => {
    const checkBiometricAndLogin = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || supported.length === 0 || !enrolled) {
          console.log('Thiết bị không hỗ trợ sinh trắc học hoặc chưa cài đặt');
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Xác thực để đăng nhập',
          fallbackLabel: 'Nhập mật khẩu',
          disableDeviceFallback: true,
        });

        if (result.success) {
          const fileUri = FileSystem.documentDirectory + 'user.json';
          const fileExists = await FileSystem.getInfoAsync(fileUri);

          if (fileExists.exists) {
            const content = await FileSystem.readAsStringAsync(fileUri);
            const data = JSON.parse(content);

            if (data.token && data.user) {
              console.log('Tự động đăng nhập thành công');
              router.replace('/(tabs)/products');
            } else {
              console.log('Dữ liệu người dùng không hợp lệ');
            }
          }
        } else {
          console.log('Xác thực thất bại');
        }
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể xác thực: ' + (error as any).message);
      }
    };

    checkBiometricAndLogin();
  }, []);
};
