import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = 'http://172.23.144.1:5261/api/XacThuc';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('email');
  const [isLoading, setIsLoading] = useState(false);

  // Hàm validateEmail với kiểu dữ liệu rõ ràng cho tham số email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendOtp = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, { email });
      if (response.status === 200) {
        Alert.alert('Thành công', 'Mã OTP đã được gửi đến email của bạn');
        setStep('otp');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Lỗi', 'Mã OTP phải có 6 ký tự');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, { email, otp });
      if (response.status === 200) {
        Alert.alert('Thành công', 'Mã OTP hợp lệ');
        setStep('newPassword');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/reset-password`, { email, otp, newPassword });
      if (response.status === 200) {
        Alert.alert('Thành công', 'Đặt lại mật khẩu thành công');
        const userData = { email, password: newPassword };
        await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'user.json', JSON.stringify(userData));
        router.push('/(auth)/login');
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>
        {step === 'email' && 'Quên mật khẩu'}
        {step === 'otp' && 'Nhập mã OTP'}
        {step === 'newPassword' && 'Đặt mật khẩu mới'}
      </Text>
      <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
        {step === 'email' && 'Nhập địa chỉ email để nhận mã OTP'}
        {step === 'otp' && 'Nhập mã OTP đã gửi đến email của bạn'}
        {step === 'newPassword' && 'Nhập mật khẩu mới'}
      </Text>

      {step === 'email' && (
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
      )}

      {step === 'otp' && (
        <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
          <Ionicons name="key-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
          <TextInput
            style={[styles.input, { color: themeColors.textPrimary }]}
            placeholder="Mã OTP"
            placeholderTextColor={themeColors.textSecondary}
            keyboardType="numeric"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
        </View>
      )}

      {step === 'newPassword' && (
        <>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="lock-closed-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              placeholder="Mật khẩu mới"
              placeholderTextColor={themeColors.textSecondary}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="lock-closed-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor={themeColors.textSecondary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors.logoutButton }]}
        onPress={() => {
          if (step === 'email') handleSendOtp();
          else if (step === 'otp') handleVerifyOtp();
          else if (step === 'newPassword') handleResetPassword();
        }}
        disabled={isLoading}
      >
        <Text style={[styles.buttonText, { color: themeColors.logoutText }]}>
          {isLoading ? 'Đang xử lý...' : step === 'email' ? 'Gửi mã OTP' : step === 'otp' ? 'Xác nhận OTP' : 'Đặt lại mật khẩu'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={[styles.linkText, { color: themeColors.iconPrimary }]}>Quay lại đăng nhập</Text>
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
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
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 24,
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
