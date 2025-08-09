import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'https://ce5e722365ab.ngrok-free.app/api';

export default function ContactScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', phone: '', message: '' };

    if (name.length < 5) {
      newErrors.name = 'Tên phải có ít nhất 5 ký tự';
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      newErrors.phone = 'Số điện thoại phải là 10 chữ số';
      isValid = false;
    }

    if (message.length < 5) {
      newErrors.message = 'Nội dung phải có ít nhất 5 ký tự';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Lỗi', 'Vui lòng kiểm tra lại các trường thông tin!');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        HoTen: name,
        Email: email,
        Sdt: phone,
        NoiDung: message,
        TrangThai: '0',
      };

      const response = await axios.post(`${API_BASE_URL}/LienHe/Add`, payload);

      if (response.status === 201) {
        setIsSubmitting(false);
        setIsSubmitted(true);
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
        setErrors({ name: '', email: '', phone: '', message: '' });
        Alert.alert('Thành công', 'Tin nhắn của bạn đã được gửi. Chúng tôi sẽ phản hồi sớm nhất có thể.');

        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Tin nhắn đã được gửi",
              body: "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể.",
              data: { someData: "goes here" },
            },
            trigger: null,
          });
        }
      }
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại!');
      console.error('Error submitting contact form:', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Liên hệ với chúng tôi</Text>
      <View style={styles.formContainer}>
        {isSubmitted ? (
          <View style={styles.successMessage}>
            <Text style={[styles.successText, { color: themeColors.textPrimary }]}>
              Tin nhắn đã được gửi!
            </Text>
            <Text style={[styles.successSubText, { color: themeColors.textSecondary }]}>
              Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.
            </Text>
            <TouchableOpacity
              onPress={() => setIsSubmitted(false)}
              style={[styles.resetButton, { backgroundColor: themeColors.primary }]}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="refresh-outline" size={20} color={themeColors.textOnPrimary} style={styles.buttonIcon} />
                <Text style={[styles.resetButtonText, { color: themeColors.textOnPrimary }]}>Gửi tin nhắn khác</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color={themeColors.iconPrimary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
                  placeholder="Tên của bạn"
                  placeholderTextColor={themeColors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={themeColors.iconPrimary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
                  placeholder="Địa chỉ email"
                  placeholderTextColor={themeColors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={themeColors.iconPrimary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
                  placeholder="Số điện thoại"
                  placeholderTextColor={themeColors.textSecondary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color={themeColors.iconPrimary} style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeColors.textPrimary,
                      flex: 1,
                      height: 120,
                      textAlignVertical: 'top',
                    },
                  ]}
                  placeholder="Tin nhắn của bạn"
                  placeholderTextColor={themeColors.textSecondary}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
              </View>
              {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: themeColors.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="send-outline" size={20} color={themeColors.textOnPrimary} style={styles.buttonIcon} />
                <Text style={[styles.submitButtonText, { color: themeColors.textOnPrimary }]}>
                  {isSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    padding: 24,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    paddingHorizontal: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  formContainer: {
    padding: 24,
  },
  successMessage: {
    alignItems: 'center',
    padding: 24,
  },
  successText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 8,
  },
  successSubText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 16,
    textAlign: 'center',
  },
  resetButton: {
    padding: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    borderColor: '#ccc',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});