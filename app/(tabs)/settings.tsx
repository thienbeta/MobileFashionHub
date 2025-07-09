import { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { ChevronRight, Bell, Moon, ShoppingCart, Ticket, CircleUser, Contact, BookOpenText, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://192.168.10.32:5261/api/XacThuc';

interface UserData {
  hoTen: string;
  email: string;
  token?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const loadUserData = useCallback(async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        setIsLoading(false);
        Alert.alert('Lỗi', 'Vui lòng đăng nhập lại', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const data = JSON.parse(fileContent);
      const user = data?.user;

      if (!user?.hoTen || !user?.email) {
        setIsLoading(false);
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }

      setUserData({ hoTen: user.hoTen, email: user.email, token: user.token });
      setIsLoading(false);
    } catch (error: any) {
      console.error('Lỗi khi đọc user.json:', error);
      setIsLoading(false);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng. Vui lòng thử lại.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      loadUserData();
      const loadNotificationPreference = async () => {
        try {
          const value = await AsyncStorage.getItem('notificationsEnabled');
          if (value !== null) {
            setIsNotificationsEnabled(value === 'true');
          }
        } catch (error) {
          console.error('Lỗi khi tải tùy chọn thông báo:', error);
        }
      };
      loadNotificationPreference();
    }

    return () => {
      isMounted = false;
    };
  }, [loadUserData]);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: isNotificationsEnabled,
        shouldPlaySound: isNotificationsEnabled,
        shouldSetBadge: false,
      }),
    });
  }, [isNotificationsEnabled]);

  useEffect(() => {
    if (isNotificationsEnabled) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          sendPushTokenToBackend(token);
        }
      });
    }
  }, [isNotificationsEnabled]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  }, [loadUserData]);

  const handleLogout = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(fileContent);
        const token = data?.user?.token;

        if (token) {
          await axios.post(
            `${API_BASE_URL}/DangXuat`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        await FileSystem.deleteAsync(fileUri);
        await AsyncStorage.multiRemove(['lastSpinTime', 'spinCount', 'selectedVoucher']);

        Alert.alert('Thành công', 'Đăng xuất thành công!', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      } else {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin đăng nhập.');
        router.replace('/(auth)/login');
      }
    } catch (error: any) {
      console.error('Lỗi khi đăng xuất:', error);
      Alert.alert('Lỗi', 'Đăng xuất thất bại. Vui lòng thử lại.');
    }
  };

  const toggleDarkMode = () => {
    setTheme(isDarkMode ? 'light' : 'dark');
  };

  const toggleNotifications = async () => {
    const newValue = !isNotificationsEnabled;
    setIsNotificationsEnabled(newValue);
    try {
      await AsyncStorage.setItem('notificationsEnabled', newValue.toString());
    } catch (error) {
      console.error('Lỗi khi lưu tùy chọn thông báo:', error);
    }
    if (newValue) {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        sendPushTokenToBackend(token);
      }
    } else {
      const token = await Notifications.getExpoPushTokenAsync();
      if (token) {
        await removePushTokenFromBackend(token.data);
      }
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Lỗi', 'Không nhận được mã thông báo đẩy cho thông báo đẩy!');
      setIsNotificationsEnabled(false);
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);
    return token;
  }

  async function sendPushTokenToBackend(token: string) {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) return;

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);
      const userToken = data?.user?.token;

      await axios.post(
        `${API_BASE_URL}/registerPushToken`,
        { pushToken: token },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    } catch (error) {
      console.error('Lỗi khi gửi push token:', error);
    }
  }

  async function removePushTokenFromBackend(token: string) {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) return;

      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const data = JSON.parse(fileContent);
      const userToken = data?.user?.token;

      await axios.post(
        `${API_BASE_URL}/unregisterPushToken`,
        { pushToken: token },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
    } catch (error) {
      console.error('Lỗi khi xóa push token:', error);
    }
  }

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
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={themeColors.primary}
        />
      }
    >
      <Text style={[styles.title, { color: themeColors.textPrimary }]}>Cài đặt</Text>

      <TouchableOpacity
        style={[styles.profileSection, { backgroundColor: themeColors.secondaryBackground }]}
        onPress={() => router.push('/(auth)/profile')}
      >
        <View style={styles.profileInfo}>
          <CircleUser size={60} color={themeColors.iconPrimary} />
          <View style={styles.profileText}>
            <Text style={[styles.profileName, { color: themeColors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">{userData.hoTen}</Text>
            <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">{userData.email}</Text>
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
            value={isNotificationsEnabled}
            onValueChange={toggleNotifications}
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
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Giảm giá</Text>
          </View>
          <ChevronRight size={24} color={themeColors.iconSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: themeColors.border }]}
          onPress={() => router.push('/(auth)/diachi')}
        >
          <View style={styles.optionLeft}>
            <MapPin size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Địa chỉ</Text>
          </View>
          <ChevronRight size={24} color={themeColors.iconSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, { borderBottomColor: themeColors.border }]}
          onPress={() => router.push('/(tabs)/blogs')}
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
        <View style={styles.buttonContent}>
          <Ionicons name="log-out-outline" size={24} color={themeColors.textOnPrimary} style={styles.buttonIcon} />
          <Text style={[styles.logoutText, { color: themeColors.textOnPrimary }]}>Đăng xuất</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 48,
    paddingBottom: 32,
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});