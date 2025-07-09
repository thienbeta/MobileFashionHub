import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import axios from 'axios';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const API_BASE_URL = 'http://192.168.10.32:5261/api/NguoiDung';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleRegister = async () => {
    if (!fullName || !username || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(API_BASE_URL, {
        hoTen: fullName,
        taiKhoan: username,
        email: email,
        matKhau: password,
        TrangThai: 0,
        vaiTro: 0,
      });

      if (response.status === 201) {
        Alert.alert('Thành công', 'Đăng ký thành công');
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Đăng ký thành công",
              body: "Chúc mừng! Bạn đã đăng ký thành công.",
              data: { someData: "goes here" },
            },
            trigger: null,
          });
        }
        router.push('/(auth)/login');
      } else {
        Alert.alert('Lỗi', 'Đăng ký thất bại');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Đã xảy ra lỗi trong quá trình đăng ký');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Đăng ký</Text>

      <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
        <Ionicons name="person-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: themeColors.textPrimary }]}
          placeholder="Họ và tên"
          placeholderTextColor={themeColors.textSecondary}
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>

      <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
        <Ionicons name="at-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: themeColors.textPrimary }]}
          placeholder="Tài khoản"
          placeholderTextColor={themeColors.textSecondary}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
        <Ionicons name="mail-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: themeColors.textPrimary }]}
          placeholder="Email"
          placeholderTextColor={themeColors.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: themeColors.secondaryBackground,
            borderColor: themeColors.border,
          },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
          placeholder="Mật khẩu"
          placeholderTextColor={themeColors.textSecondary}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color={themeColors.iconPrimary}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors.primary }]}
        onPress={handleRegister}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color={themeColors.textOnPrimary} style={styles.buttonIcon} />
          ) : (
            <Ionicons name="person-add-outline" size={24} color={themeColors.textOnPrimary} style={styles.buttonIcon} />
          )}
          <Text style={[styles.buttonText, { color: themeColors.textOnPrimary }]}>
            {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={[styles.linkText, { color: themeColors.iconPrimary }]}>Đã có tài khoản? Đăng nhập</Text>
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
  eyeIcon: {
    padding: 6,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
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
  },
});