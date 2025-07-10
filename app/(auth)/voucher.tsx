import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Button } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../../src/utils/api';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

const API_BASE_URL = 'http://192.168.10.35:5261/api';
const { width: screenWidth } = Dimensions.get('window');

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
  tyLe?: number;
  coupons?: { id: number; maNhap: string; trangThai: number }[];
}

const SEGMENT_COLORS = [
  '#9b87f5', '#b794f6', '#d6bcfa', '#e9d5ff',
  '# discussione', '#8b5cf6', '#7c3aed', '#6d28d9',
  '#c4b5fd', '#ddd6fe', '#f3f0ff', '#ede9fe'
];

export default function VoucherScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDark ? colors.dark : colors.light;

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastSpinTime, setLastSpinTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [userId, setUserId] = useState<string>('KH001');
  const [refreshing, setRefreshing] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);

  const SPIN_COOLDOWN = 24 * 60 * 60 * 1000;
  const WHEEL_SIZE = Math.min(screenWidth * 0.8, 320);
  const WHEEL_RADIUS = WHEEL_SIZE / 2;

  const spin = useSharedValue(0);
  const popupScale = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const popupStyle = useAnimatedStyle(() => ({
    transform: [{ scale: popupScale.value }],
    opacity: popupScale.value,
  }));

  useEffect(() => {
    const load = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          Alert.alert('Vui lòng đăng nhập', 'Bạn cần đăng nhập để xem voucher', [
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
        const sc = await AsyncStorage.getItem('spinCount');

        if (ls) {
          const t = Number(ls);
          setLastSpinTime(t);
          setTimeLeft(calcRemain(t));
          const sv = await AsyncStorage.getItem('selectedVoucher');
          if (sv) setSelectedVoucher(JSON.parse(sv));
        }

        if (sc) {
          setSpinCount(Number(sc));
        }

        await loadVouchers();
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

  const loadVouchers = async () => {
    try {
      const data: Voucher[] = await apiFetch(`${API_BASE_URL}/Voucher`, 'Vouchers');
      const now = new Date();

      const vouchersWithRate = data
        .filter((v) => {
          const s = new Date(v.ngayBatDau);
          const e = new Date(v.ngayKetThuc);
          return v.trangThai === 0 && s <= now && now <= e;
        })
        .map((v, index) => ({
          ...v,
          tyLe: getTyLeByValue(v.giaTri)
        }));

      setVouchers(vouchersWithRate);
    } catch (e: any) {
      setError(e.message);
      Alert.alert('Lỗi', e.message);
    }
  };

  const getTyLeByValue = (giaTri: number): number => {
    if (giaTri >= 50) return 5;
    if (giaTri >= 30) return 10;
    if (giaTri >= 20) return 15;
    if (giaTri >= 10) return 25;
    return 45;
  };

  const calcRemain = (t: number) => Math.max(0, SPIN_COOLDOWN - (Date.now() - t));

  const fmt = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    if (h > 0) return `${h}h ${m}p ${s}s`;
    return `${m}p ${s}s`;
  };

  const canSpin = () => !isSpinning && timeLeft <= 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCondition = (condition: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(condition);
  };

  const calculateWinningVoucher = (): Voucher => {
    const totalRate = vouchers.reduce((sum, v) => sum + (v.tyLe || 0), 0);
    const random = Math.random() * totalRate;

    let currentRate = 0;
    for (const voucher of vouchers) {
      currentRate += voucher.tyLe || 0;
      if (random <= currentRate) {
        return voucher;
      }
    }

    return vouchers[vouchers.length - 1];
  };

  const handleSpin = () => {
    if (!canSpin()) {
      return Alert.alert('Chưa thể quay', `Vui lòng chờ ${fmt(timeLeft)}`);
    }

    setIsSpinning(true);
    setSelectedVoucher(null);
    setShowWinnerPopup(false);

    const winningVoucher = calculateWinningVoucher();
    const winningIndex = vouchers.findIndex(v => v.maVoucher === winningVoucher.maVoucher);

    const segmentAngle = 360 / vouchers.length;

    const targetAngle = winningIndex * segmentAngle + segmentAngle / 2;
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalAngle = spins * 360 + (360 - targetAngle);

    spin.value = withTiming(
      finalAngle,
      {
        duration: 3000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      },
      () => {
        runOnJS(handleSpinComplete)(winningVoucher);
      }
    );
  };

  const handleSpinComplete = async (winningVoucher: Voucher) => {
    setSelectedVoucher(winningVoucher);
    const now = Date.now();
    const newSpinCount = spinCount + 1;

    setLastSpinTime(now);
    setTimeLeft(SPIN_COOLDOWN);
    setSpinCount(newSpinCount);

    await AsyncStorage.setItem('lastSpinTime', now.toString());
    await AsyncStorage.setItem('spinCount', newSpinCount.toString());
    await AsyncStorage.setItem('selectedVoucher', JSON.stringify(winningVoucher));

    setIsSpinning(false);
    setShowWinnerPopup(true);

    popupScale.value = withTiming(1, {
      duration: 500,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });

    setTimeout(() => {
      popupScale.value = withTiming(0, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }, () => {
        runOnJS(setShowWinnerPopup)(false);
      });
    }, 1000);
  };

  const handleUseVoucher = async () => {
    if (selectedVoucher) {
      await AsyncStorage.setItem('selectedVoucher', JSON.stringify(selectedVoucher));
      router.push('/cart');
    }
  };

  const closePopup = () => {
    popupScale.value = withTiming(0, {
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }, () => {
      runOnJS(setShowWinnerPopup)(false);
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVouchers();
    setRefreshing(false);
  };

  const renderWheelSegment = (voucher: Voucher, index: number) => {
    const total = vouchers.length;
    const angle = 360 / total;
    const startAngle = angle * index;
    const endAngle = startAngle + angle;

    const startAngleRad = ((startAngle - 90) * Math.PI) / 180;
    const endAngleRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = WHEEL_RADIUS + (WHEEL_RADIUS - 10) * Math.cos(startAngleRad);
    const y1 = WHEEL_RADIUS + (WHEEL_RADIUS - 10) * Math.sin(startAngleRad);
    const x2 = WHEEL_RADIUS + (WHEEL_RADIUS - 10) * Math.cos(endAngleRad);
    const y2 = WHEEL_RADIUS + (WHEEL_RADIUS - 10) * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${WHEEL_RADIUS} ${WHEEL_RADIUS}`,
      `L ${x1} ${y1}`,
      `A ${WHEEL_RADIUS - 10} ${WHEEL_RADIUS - 10} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const textAngle = startAngle + angle / 2 - 90;
    const textAngleRad = (textAngle * Math.PI) / 180;
    const textRadius = WHEEL_RADIUS * 0.65;
    const textX = WHEEL_RADIUS + textRadius * Math.cos(textAngleRad);
    const textY = WHEEL_RADIUS + textRadius * Math.sin(textAngleRad);

    return (
      <View key={voucher.maVoucher}>
        <Path
          d={pathData}
          fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
          stroke="#FFF"
          strokeWidth={2}
        />
        <SvgText
          x={textX}
          y={textY}
          fontSize="12"
          fontWeight="bold"
          fill="#FFF"
          textAnchor="middle"
          alignmentBaseline="middle"
          transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
        >
          {voucher.giaTri}%
        </SvgText>
      </View>
    );
  };

  const renderWinnerPopup = () => {
    if (!showWinnerPopup || !selectedVoucher) return null;

    return (
      <View style={styles.popupOverlay}>
        <Animated.View style={[styles.winnerPopup, { backgroundColor: themeColors.background }, popupStyle]}>
          <TouchableOpacity style={styles.closeButton} onPress={closePopup}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={[styles.popupTitle, { color: themeColors.textPrimary }]}>
            🎉 Chúc mừng!
          </Text>

          {selectedVoucher.hinhAnh && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${selectedVoucher.hinhAnh}` }}
              style={styles.popupImage}
            />
          )}

          <Text style={[styles.popupVoucherName, { color: themeColors.textPrimary }]}>
            {selectedVoucher.tenVoucher}
          </Text>
          <Text style={[styles.popupVoucherValue, { color: '#9b87f5' }]}>
            Giảm {selectedVoucher.giaTri}% đơn hàng
          </Text>

          {selectedVoucher.moTa && (
            <Text style={[styles.popupDescription, { color: themeColors.textSecondary }]}>
              {selectedVoucher.moTa}
            </Text>
          )}

          <Text style={[styles.popupExpiry, { color: '#9b87f5' }]}>
            Hết hạn: {formatDate(selectedVoucher.ngayKetThuc)}
          </Text>

          {selectedVoucher.dieuKien && (
            <Text style={[styles.popupCondition, { color: themeColors.textSecondary }]}>
              Áp dụng cho đơn hàng từ {formatCondition(selectedVoucher.dieuKien)}
            </Text>
          )}

          <View style={styles.popupButtons}>
            <TouchableOpacity
              style={[styles.popupButton, styles.useButton]}
              onPress={closePopup}
            >
              <Text style={styles.laterButtonText}>Sử dụng ngay</Text>
            </TouchableOpacity>

          </View>
        </Animated.View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color="#9b87f5" />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          Đang tải voucher...
        </Text>
      </View>
    );
  }

  if (error || vouchers.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>
          {error || 'Chưa có voucher nào.'}
        </Text>
        <Button
          mode="contained"
          onPress={() => loadVouchers()}
          style={[styles.retryBtn, { backgroundColor: '#9b87f5' }]}
        >
          Thử lại
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>
            🎡 Vòng Quay May Mắn
          </Text>
        </View>

        <View style={styles.wheelContainer}>
          <TouchableOpacity
            onPress={handleSpin}
            disabled={!canSpin()}
            style={[
              styles.wheelWrapper,
              {
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
                opacity: canSpin() ? 1 : 0.7,
              },
            ]}
          >
            <Animated.View style={[styles.wheel, spinStyle]}>
              <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                {vouchers.map((voucher, index) => renderWheelSegment(voucher, index))}
              </Svg>
            </Animated.View>

            <View style={styles.pointer}>
              <View style={styles.pointerTriangle} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.controls}>
          <Button
            mode="contained"
            onPress={handleSpin}
            disabled={!canSpin()}
            style={[
              styles.spinBtn,
              {
                backgroundColor: canSpin() ? '#9b87f5' : themeColors.textSecondary,
              },
            ]}
            labelStyle={styles.spinBtnLabel}
          >
            {isSpinning
              ? '🎯 Đang quay...'
              : timeLeft > 0
                ? `⏰ Chờ ${fmt(timeLeft)}`
                : '🍀 Quay ngay'}
          </Button>
        </View>

        {selectedVoucher && !showWinnerPopup && (
          <View style={[styles.winnerCard, { backgroundColor: themeColors.secondaryBackground }]}>
            <Text style={[styles.winnerTitle, { color: themeColors.textPrimary }]}>
              🎉 Voucher đã trúng
            </Text>

            {selectedVoucher.hinhAnh && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${selectedVoucher.hinhAnh}` }}
                style={styles.winnerImage}
              />
            )}

            <View style={styles.winnerInfo}>
              <Text style={[styles.winnerName, { color: themeColors.textPrimary }]}>
                {selectedVoucher.tenVoucher}
              </Text>
              <Text style={[styles.winnerValue, { color: '#9b87f5' }]}>
                Giảm {selectedVoucher.giaTri}% đơn hàng
              </Text>

              {selectedVoucher.moTa && (
                <Text style={[styles.winnerDesc, { color: themeColors.textSecondary }]}>
                  {selectedVoucher.moTa}
                </Text>
              )}

              <Text style={[styles.expiryText, { color: '#9b87f5' }]}>
                Hết hạn: {formatDate(selectedVoucher.ngayKetThuc)}
              </Text>

              {selectedVoucher.dieuKien && (
                <Text style={[styles.conditionText, { color: themeColors.textSecondary }]}>
                  Áp dụng cho đơn hàng từ {formatCondition(selectedVoucher.dieuKien)}
                </Text>
              )}
            </View>

            {selectedVoucher.coupons
              ?.filter((coupon) => coupon.trangThai === 0)
              .slice(0, 2)
              .map((coupon, index) => (
                <View key={index} style={styles.couponContainer}>
                  <View style={[styles.couponCode, { backgroundColor: themeColors.background }]}>
                    <Text style={[styles.couponText, { color: themeColors.textPrimary }]}>
                      {coupon.maNhap}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(coupon.maNhap);
                      Alert.alert('Đã sao chép', `Mã ${coupon.maNhap} đã được sao chép.`);
                    }}
                    style={[styles.copyBtn, { backgroundColor: '#9b87f5' }]}
                  >
                    <Text style={styles.copyBtnText}>Sao chép</Text>
                  </TouchableOpacity>
                </View>
              ))}

            <Button
              mode="contained"
              onPress={handleUseVoucher}
              style={[styles.useBtn, { backgroundColor: '#9b87f5' }]}
            >
              🎁 Sử dụng ngay
            </Button>
          </View>
        )}
      </ScrollView>

      {renderWinnerPopup()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  wheelContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  wheelWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wheel: {
    borderRadius: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  pointer: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -12,
    transform: [{ rotate: '180deg' }],
    zIndex: 10,
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FF6B6B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  controls: {
    alignItems: 'center',
    marginBottom: 30,
  },
  spinBtn: {
    width: '80%',
    maxWidth: 280,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  spinBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 5,
  },
  cooldownText: {
    fontSize: 12,
    textAlign: 'center',
  },
  winnerCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#9b87f5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#9b87f5',
  },
  winnerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  winnerImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 15,
    borderRadius: 10,
  },
  winnerInfo: {
    alignItems: 'center',
    marginBottom: 15,
  },
  winnerName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  winnerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  winnerDesc: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  expiryText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  conditionText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  couponCode: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#9b87f5',
  },
  couponText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  copyBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  useBtn: {
    width: '100%',
    marginTop: 15,
    elevation: 5,
    shadowColor: '#9b87f5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 30,
  },
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  winnerPopup: {
    width: '90%',
    maxWidth: 350,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 15,
    shadowColor: '#9b87f5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    borderWidth: 2,
    borderColor: '#9b87f5',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 20,
    zIndex: 1001,
  },
  closeButtonText: {
    fontSize: 30,
    color: '#9b87f5',
    fontWeight: 'bold',
  },
  popupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  popupImage: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 15,
    borderRadius: 10,
  },
  popupVoucherName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupVoucherValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupDescription: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  popupExpiry: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  popupCondition: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  popupButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  popupButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  laterButton: {
    backgroundColor: '#6b7280',
  },
  laterButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  useButton: {
    backgroundColor: '#9b87f5',
  },
});