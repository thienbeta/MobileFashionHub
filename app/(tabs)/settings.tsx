import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { ChevronRight, Bell, Moon, Pencil, ShoppingCart, Ticket, CircleUser, Contact, BookOpenText } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';

const API_BASE_URL = 'http://172.23.144.1:5261/api/XacThuc';

interface UserData {
  hoTen: string;
  email: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
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
        const user = data?.user;

        if (!user?.hoTen || !user?.email) {
          if (isMounted) {
            setIsLoading(false);
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', [
              { text: 'OK', onPress: () => router.replace('/(auth)/login') },
            ]);
          }
          return;
        }

        if (isMounted) {
          setUserData({ hoTen: user.hoTen, email: user.email });
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error reading user.json:', error);
        if (isMounted) {
          setIsLoading(false);
          Alert.alert('Lỗi', 'Không thể tải thông tin người dùng. Vui lòng thử lại.', [
            { text: 'OK', onPress: () => router.replace('/(auth)/login') },
          ]);
        }
      }
    };

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(fileContent);
        const token = data?.token;

        if (token) {
          await axios.post(
            `${API_BASE_URL}/DangXuat`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        await FileSystem.deleteAsync(fileUri);
        Alert.alert('Thành công', 'Đăng xuất thành công!', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin đăng nhập.');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Lỗi khi đăng xuất:', error);
      Alert.alert('Lỗi', 'Đăng xuất thất bại. Vui lòng thử lại.');
    }
  };

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const toggleDarkMode = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Cài đặt</Text>

      <TouchableOpacity
        style={[styles.profileSection, { backgroundColor: themeColors.secondaryBackground }]}
        onPress={() => router.push('/(auth)/profile')}
      >
        <View style={styles.profileInfo}>
          <CircleUser size={60} color={themeColors.iconPrimary} />
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: themeColors.textPrimary }]}>{userData.hoTen}</Text>
            <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>{userData.email}</Text>
          </View>
        </View>
        <ChevronRight size={24} color={themeColors.iconSecondary} />
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.textTertiary }]}>Tùy chọn</Text>

        <View style={[styles.option, { borderBottomColor: themeColors.border }]}>
          <View style={styles.optionLeft}>
            <Bell size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Thông báo</Text>
          </View>
          <Switch
            trackColor={{ false: '#CBD5E0', true: '#9F7AEA' }}
            thumbColor="#fff"
            ios_backgroundColor="#CBD5E0"
            value={true}
          />
        </View>

        <View style={[styles.option, { borderBottomColor: themeColors.border }]}>
          <View style={styles.optionLeft}>
            <Moon size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Chế độ tối</Text>
          </View>
          <Switch
            trackColor={{ false: '#CBD5E0', true: '#9F7AEA' }}
            thumbColor="#fff"
            ios_backgroundColor="#CBD5E0"
            value={isDarkMode}
            onValueChange={toggleDarkMode}
          />
        </View>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: themeColors.border }]}
          onPress={() => router.push('/(tabs)/orderHistory')}
        >
          <View style={styles.optionLeft}>
            <ShoppingCart size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Đơn hàng</Text>
          </View>
          <ChevronRight size={24} color={themeColors.iconSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: themeColors.border }]}
          onPress={() => router.push('/(auth)/contact')}
        >
          <View style={styles.optionLeft}>
            <Contact size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Hỗ trợ</Text>
          </View>
          <ChevronRight size={24} color={themeColors.iconSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: themeColors.border }]}
          onPress={() => router.push('/(auth)/voucher')}
        >
          <View style={styles.optionLeft}>
            <Ticket size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Voucher</Text>
          </View>
          <ChevronRight size={24} color={themeColors.iconSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: themeColors.border }]}
          onPress={() => router.push('/blogs' as const)}
        >
          <View style={styles.optionLeft}>
            <BookOpenText size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Bài viết</Text>
          </View>
          <ChevronRight size={24} color={themeColors.iconSecondary} />
        </TouchableOpacity>

      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: themeColors.logoutButton }]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutText, { color: themeColors.logoutText }]}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
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
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    marginHorizontal: 24,
    borderRadius: 12,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileText: {
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
  },
  logoutButton: {
    margin: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});
