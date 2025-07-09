import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const API_BASE_URL = 'http://192.168.10.32:5261/api/XacThuc';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [taiKhoan, setTaiKhoan] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          const userData = JSON.parse(fileContent);
          setTaiKhoan(userData.taiKhoan || '');
          setPassword(userData.password || '');
        }
      } catch (error) {
        console.log('Error loading user data:', error);
      }
    };
    loadSavedData();
  }, []);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert('Lỗi', 'Không thể hiển thị thông báo');
        return false;
      }
    }
    return true;
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/DangNhap`, {
        taiKhoan,
        matKhau: password,
      });
      if (response.status === 200) {
        const { user, token } = response.data;

        if (user.vaiTro !== 0) {
          Alert.alert('Lỗi', 'Chỉ người dùng (vai trò = 0) mới được phép đăng nhập.');
          setIsLoading(false);
          return;
        }

        const userData = { taiKhoan, password, token, user };
        await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'user.json', JSON.stringify(userData));
        Alert.alert('Thành công', 'Đăng nhập thành công');
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Đăng nhập thành công",
              body: "Chào mừng bạn đến với ứng dụng!",
              data: { someData: "goes here" },
            },
            trigger: null,
          });
        }
        router.push('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Đăng nhập</Text>

      <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
        <Ionicons name="person-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: themeColors.textPrimary }]}
          placeholder="Tài khoản"
          placeholderTextColor={themeColors.textSecondary}
          value={taiKhoan}
          onChangeText={setTaiKhoan}
          autoCapitalize="none"
        />
      </View>

      <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
        <Ionicons name="lock-closed-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: themeColors.textPrimary }]}
          placeholder="Mật khẩu"
          placeholderTextColor={themeColors.textSecondary}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color={themeColors.iconPrimary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/forgotpassword')}>
        <Text style={[styles.linkTextt, { color: themeColors.iconPrimary }]}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors.primary }]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color={themeColors.textOnPrimary} style={styles.buttonIcon} />
          ) : (
            <Ionicons name="log-in-outline" size={24} color={themeColors.textOnPrimary} style={styles.buttonIcon} />
          )}
          <Text style={[styles.buttonText, { color: themeColors.textOnPrimary }]}>
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={[styles.linkText, { color: themeColors.iconPrimary }]}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  linkText: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    marginVertical: 8,
  },
  linkTextt: {
    textAlign: 'right',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    marginVertical: 8,
  },
});