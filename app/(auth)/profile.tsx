import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';

const API_BASE_URL = 'http://172.23.144.1:5261/api';

interface UserData {
  maNguoiDung: string | undefined;
  hoTen: string;
  taiKhoan: string;
  email: string;
  sdt: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('profile');
  const [token, setToken] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    hoTen: '',
    taiKhoan: '',
    email: '',
    sdt: null as string | null,
  });

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          if (isMounted) {
            setIsLoading(false);
            Alert.alert('Lỗi', 'Vui lòng đăng nhập lại', [
              { text: 'OK', onPress: () => router.replace('/(auth)/login') },
            ]);
          }
          return;
        }

        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const data = JSON.parse(fileContent);
        const maNguoiDung = data?.user?.maNguoiDung;
        const userToken = data?.token;

        if (!maNguoiDung || !userToken) {
          if (isMounted) {
            setIsLoading(false);
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', [
              { text: 'OK', onPress: () => router.replace('/(auth)/login') },
            ]);
          }
          return;
        }

        setToken(userToken);

        const response = await axios.get(`${API_BASE_URL}/UpdateProfile/profile`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });

        const user = response.data;
        console.log('UserData Raw Response:', user);

        const userData: UserData = {
          maNguoiDung: user.maNguoiDung,
          hoTen: user.hoTen,
          taiKhoan: user.taiKhoan || 'user',
          email: user.email,
          sdt: user.sdt || null,
        };

        if (isMounted) {
          setUserData(userData);
          setFormData({
            hoTen: user.hoTen,
            taiKhoan: user.taiKhoan || 'user',
            email: user.email,
            sdt: user.sdt || null,
          });
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        if (isMounted) {
          setIsLoading(false);
          if (error.response?.status === 401) {
            Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', [
              { text: 'OK', onPress: () => router.replace('/(auth)/login') },
            ]);
          } else {
            Alert.alert('Lỗi', 'Không thể tải thông tin người dùng. Vui lòng kiểm tra kết nối.');
          }
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleInputChange = (field: keyof UserData, value: string) => {
    if (field === 'sdt' && value === '') {
      setFormData((prev) => ({ ...prev, [field]: null }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveChanges = async () => {
    if (!formData.hoTen.trim() || !formData.taiKhoan.trim() || !formData.email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ họ tên, tài khoản và email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Lỗi', 'Email không đúng định dạng.');
      return;
    }

    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('HoTen', formData.hoTen);
      formDataToSubmit.append('TaiKhoan', formData.taiKhoan);
      formDataToSubmit.append('Email', formData.email);
      formDataToSubmit.append('Sdt', formData.sdt || '');

      console.log('Sending profile update:', formDataToSubmit);

      const response = await axios.put(
        `${API_BASE_URL}/UpdateProfile/update-profile/${userData?.maNguoiDung}`,
        formDataToSubmit,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 200) {
        Alert.alert('Thành công', 'Cập nhật thông tin thành công.');
        setUserData({
          ...userData!,
          hoTen: formData.hoTen,
          taiKhoan: formData.taiKhoan,
          email: formData.email,
          sdt: formData.sdt,
        });
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response) {
        if (error.response.status === 400) {
          Alert.alert('Lỗi', 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.');
        } else if (error.response.status === 404) {
          Alert.alert('Lỗi', 'Không tìm thấy người dùng hoặc endpoint không tồn tại.');
        } else {
          Alert.alert('Lỗi', `Cập nhật thất bại (Mã lỗi: ${error.response.status}).`);
        }
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến server.');
      }
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ mật khẩu cũ, mới và xác nhận.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      const formDataToSubmit = new FormData();
      formDataToSubmit.append('MatKhauCu', oldPassword);
      formDataToSubmit.append('MatKhauMoi', newPassword);

      console.log('Sending password update:', { oldPassword, newPassword });

      const response = await axios.put(
        `${API_BASE_URL}/UpdateProfile/update-password/${userData?.maNguoiDung}`,
        formDataToSubmit,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 200) {
        Alert.alert('Thành công', 'Đổi mật khẩu thành công.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.response) {
        if (error.response.status === 404) {
          Alert.alert('Lỗi', 'Endpoint đổi mật khẩu không tồn tại hoặc người dùng không hợp lệ.');
        } else if (error.response.status === 400) {
          Alert.alert('Lỗi', 'Mật khẩu cũ không đúng hoặc dữ liệu không hợp lệ.');
        } else {
          Alert.alert('Lỗi', `Đổi mật khẩu thất bại (Mã lỗi: ${error.response.status}).`);
        }
      } else {
        Alert.alert('Lỗi', 'Không thể kết nối đến server.');
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
          <ChevronLeft size={24} color={themeColors.iconPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Hồ sơ người dùng</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            currentTab === 'profile' && styles.activeTab,
            { backgroundColor: currentTab === 'profile' ? themeColors.logoutButton : themeColors.secondaryBackground },
          ]}
          onPress={() => setCurrentTab('profile')}
        >
          <Text
            style={[
              styles.tabText,
              { color: currentTab === 'profile' ? themeColors.logoutText : themeColors.textPrimary },
            ]}
          >
            Trang cá nhân
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            currentTab === 'changePassword' && styles.activeTab,
            { backgroundColor: currentTab === 'changePassword' ? themeColors.logoutButton : themeColors.secondaryBackground },
          ]}
          onPress={() => setCurrentTab('changePassword')}
        >
          <Text
            style={[
              styles.tabText,
              { color: currentTab === 'changePassword' ? themeColors.logoutText : themeColors.textPrimary },
            ]}
          >
            Đổi mật khẩu
          </Text>
        </TouchableOpacity>
      </View>

      {currentTab === 'profile' && (
        <>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="person-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.hoTen}
              onChangeText={(text) => handleInputChange('hoTen', text)}
              placeholder="Họ và tên"
              placeholderTextColor={themeColors.textSecondary}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="at-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.taiKhoan}
              editable={false}
              placeholder="Tài khoản"
              placeholderTextColor={themeColors.textSecondary}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="mail-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              placeholder="Email"
              placeholderTextColor={themeColors.textSecondary}
              keyboardType="email-address"
            />
          </View>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="call-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary }]}
              value={formData.sdt || ''}
              onChangeText={(text) => handleInputChange('sdt', text)}
              placeholder="Số điện thoại"
              placeholderTextColor={themeColors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.logoutButton }]}
            onPress={handleSaveChanges}
          >
            <Text style={[styles.buttonText, { color: themeColors.logoutText }]}>Lưu thay đổi</Text>
          </TouchableOpacity>
        </>
      )}

      {currentTab === 'changePassword' && (
        <>
          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="lock-closed-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
              placeholder="Mật khẩu cũ"
              placeholderTextColor={themeColors.textSecondary}
              secureTextEntry={!showOldPassword}
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)} style={styles.eyeIcon}>
              <Ionicons name={showOldPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={themeColors.iconPrimary} />
            </TouchableOpacity>
          </View>

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
              <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={themeColors.iconPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.inputContainer, { backgroundColor: themeColors.secondaryBackground, borderColor: themeColors.border }]}>
            <Ionicons name="lock-closed-outline" size={24} color={themeColors.iconPrimary} style={styles.icon} />
            <TextInput
              style={[styles.input, { color: themeColors.textPrimary, flex: 1 }]}
              placeholder="Mật khẩu xác nhận"
              placeholderTextColor={themeColors.textSecondary}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color={themeColors.iconPrimary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: themeColors.logoutButton }]}
            onPress={handleChangePassword}
          >
            <Text style={[styles.buttonText, { color: themeColors.logoutText }]}>Đổi mật khẩu</Text>
          </TouchableOpacity>
        </>

      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 24,
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
    marginHorizontal: 24,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});
