import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Button } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../../src/utils/api';

const API_BASE_URL = 'http://192.168.43.163:5261/api';

interface Voucher {
  maVoucher: number;
  tenVoucher: string;
  giaTri: number;
  ngayBatDau: string;
  ngayKetThuc: string;
  hinhAnh?: string;
  moTa?: string;
  dieuKien?: number;
  soLuong?: number;
  trangThai?: number;
  coupons?: { id: number; maNhap: string; trangThai: number }[];
}

export default function VoucherScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDark ? colors.dark : colors.light;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastSpinTime, setLastSpinTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [userId, setUserId] = useState<string>('KH001');

  const SPIN_COOLDOWN = 24 * 60 * 60 * 1000;
  const spin = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  useEffect(() => {
    const load = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem giỏ hàng', [
            { text: 'OK', onPress: () => router.push('/(auth)/login') },
          ]);
          return;
        }

        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const userData = JSON.parse(fileContent);
        const userId = userData?.user?.maNguoiDung;
        if (userId) {
          setUserId(userId);
        }

        const ls = await AsyncStorage.getItem('lastSpinTime');
        if (ls) {
          const t = Number(ls);
          setLastSpinTime(t);
          setTimeLeft(calcRemain(t));
          const sv = await AsyncStorage.getItem('selectedVoucher');
          if (sv) setSelectedVoucher(JSON.parse(sv));
        }

        const data: Voucher[] = await apiFetch(`${API_BASE_URL}/Voucher`, 'Vouchers');
        const now = new Date();
        setVouchers(
          data.filter((v) => {
            const s = new Date(v.ngayBatDau),
              e = new Date(v.ngayKetThuc);
            return v.trangThai === 0 && s <= now && now <= e;
          })
        );
      } catch (e: any) {
        setError(e.message);
        Alert.alert('Lỗi', e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!lastSpinTime) return;
    const iv = setInterval(() => {
      const remain = calcRemain(lastSpinTime);
      setTimeLeft(remain);
      if (remain <= 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [lastSpinTime]);

  const calcRemain = (t: number) =>
    Math.max(0, SPIN_COOLDOWN - (Date.now() - t));
  const fmt = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}p ${s}s`;
  };
  const canSpin = () => !isSpinning && timeLeft <= 0;

  const handleSpin = () => {
    if (!canSpin()) {
      return Alert.alert('Chưa thể quay', `Vui lòng chờ ${fmt(timeLeft)}`);
    }
    setIsSpinning(true);
    setSelectedVoucher(null);

    const angle = 360 * 5 + Math.floor(Math.random() * 360);
    spin.value = withTiming(angle, { duration: 2000 });

    setTimeout(async () => {
      const final = angle % 360;
      const slice = 360 / vouchers.length;
      const idx = Math.floor(final / slice);
      const win = vouchers[vouchers.length - 1 - idx];

      setSelectedVoucher(win);
      const now = Date.now();
      setLastSpinTime(now);
      setTimeLeft(0);
      await AsyncStorage.setItem('lastSpinTime', now.toString());
      await AsyncStorage.setItem('selectedVoucher', JSON.stringify(win));

      setIsSpinning(false);
      Alert.alert('🎉 Chúc mừng!', `Bạn đã trúng: ${win.tenVoucher}`);
    }, 2000);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }
  if (error || vouchers.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={{ color: themeColors.textPrimary }}>
          {error || 'Chưa có voucher nào.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>
          Vòng Quay May Mắn
        </Text>
      </View>

      <View style={styles.wheelWrapper}>
        <TouchableOpacity onPress={handleSpin} disabled={!canSpin()}>
          <Animated.View style={[styles.wheel, spinStyle]}>
            {vouchers.map((v, i) => {
              const angle = (360 / vouchers.length) * i;
              return (
                <View
                  key={v.maVoucher}
                  style={[
                    styles.segment,
                    {
                      transform: [{ rotate: `${angle}deg` }],
                      borderRightColor: themeColors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: themeColors.textPrimary }]}>
                    {v.tenVoucher}
                  </Text>
                </View>
              );
            })}
          </Animated.View>
          <View style={[styles.pointer, { borderTopColor: 'red' }]} />
        </TouchableOpacity>
      </View>

      <Button
        mode="contained"
        onPress={handleSpin}
        disabled={!canSpin()}
        style={[styles.spinBtn, { backgroundColor: themeColors.primary }]}
      >
        {isSpinning
          ? 'Đang quay...'
          : timeLeft > 0
          ? `Chờ ${fmt(timeLeft)}`
          : 'Quay ngay'}
      </Button>

      {selectedVoucher && (
        <View style={[styles.card, { backgroundColor: themeColors.secondaryBackground }]}>
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            🎉 Chúc mừng bạn!
          </Text>
          {selectedVoucher.hinhAnh && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${selectedVoucher.hinhAnh}` }}
              style={styles.cardImage}
            />
          )}
          <Text style={[styles.cardText, { color: themeColors.textPrimary }]}>
            Tên: {selectedVoucher.tenVoucher}
          </Text>
          <Text style={[styles.cardText, { color: themeColors.textPrimary }]}>
            Giảm {selectedVoucher.giaTri}% đơn hàng
          </Text>
          {selectedVoucher.coupons?.[0] && (
            <Text style={[styles.cardText, { color: themeColors.textPrimary }]}>
              Mã: {selectedVoucher.coupons[0].maNhap}
            </Text>
          )}
          <Button
            mode="contained"
            onPress={() =>
              Alert.alert(
                'Sử dụng voucher',
                `Bạn đã chọn voucher: ${selectedVoucher.tenVoucher} cho userId: ${userId}`
              )
            }
            style={[styles.useBtn, { backgroundColor: themeColors.primary }]}
          >
            Sử dụng ngay
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold' },
  wheelWrapper: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    marginTop: 20,
    marginBottom: 20,
  },
  wheel: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#FBEAFF',
    borderWidth: 5,
    borderColor: '#BB8FCE',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  pointer: {
    position: 'absolute',
    top: -12,
    left: '50%',
    marginLeft: -12,
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 0,
    borderTopWidth: 24,
    borderStyle: 'solid',
  },
  spinBtn: { width: '80%', marginBottom: 20 },
  card: {
    width: '90%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  cardTitle: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  cardImage: { width: 160, height: 160, resizeMode: 'contain', marginBottom: 16, borderRadius: 8 },
  cardText: { fontSize: 16, marginBottom: 8 },
  useBtn: { marginTop: 16, paddingHorizontal: 24 },
});
