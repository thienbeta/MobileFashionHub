import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import axios from 'axios';
import * as Notifications from 'expo-notifications';

const API_BASE_URL = 'https://bicacuatho.azurewebsites.net/api/XacThuc';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState('email');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Mật khẩu đã được cập nhật",
              body: "Mật khẩu của bạn đã được cập nhật thành công.",
              data: { someData: "goes here" },
            },
            trigger: null,
          });
        }
        Alert.alert('Thành công', 'Đặt lại mật khẩu thành công', [
          { text: 'OK', onPress: () => router.push('/(auth)/login') }
        ]);
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
              style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
              placeholder="Mật khẩu mới"
              placeholderTextColor={themeColors.textSecondary}
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
              <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={24} color={themeColors.iconPrimary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="lock-closed-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
              placeholder="Xác nhận mật khẩu"
              placeholderTextColor={themeColors.textSecondary}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={24} color={themeColors.iconPrimary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors.primary }]}
        onPress={() => {
          if (step === 'email') handleSendOtp();
          else if (step === 'otp') handleVerifyOtp();
          else if (step === 'newPassword') handleResetPassword();
        }}
        disabled={isLoading}
      >
        <View style={styles.buttonContent}>
          {isLoading ? (
            <ActivityIndicator size="small" color={themeColors.textOnPrimary} style={styles.buttonIcon} />
          ) : (
            <Ionicons
              name={step === 'email' ? 'mail-outline' : step === 'otp' ? 'key-outline' : 'lock-closed-outline'}
              size={24}
              color={themeColors.textOnPrimary}
              style={styles.buttonIcon}
            />
          )}
          <Text style={[styles.buttonText, { color: themeColors.textOnPrimary }]}>
            {isLoading ? 'Đang xử lý...' : step === 'email' ? 'Gửi mã OTP' : step === 'otp' ? 'Xác nhận OTP' : 'Đặt lại mật khẩu'}
          </Text>
        </View>
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
  },
});