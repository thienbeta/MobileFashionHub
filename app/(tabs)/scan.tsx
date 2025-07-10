import { useState, useEffect } from 'react';
import { Alert, Text, View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, BarcodeScanningResult, Camera } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import * as FileSystem from 'expo-file-system';
import { apiFetch } from '../../src/utils/api';

const API_BASE_URL = 'http://192.168.10.35:5261/api';

type RootStackParamList = {
  Product: { productId: string };
};

type ScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Product'>;

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark' || (theme === 'system' && (Appearance.getColorScheme() === 'dark' || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    setShowScanner(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Xử lý QR code cho đăng nhập PC
      if (data.includes('/api/XacThuc/QRLogin')) {
        let qrData;
        try {
          qrData = JSON.parse(data);
        } catch (error) {
          throw new Error('Dữ liệu QR không hợp lệ');
        }

        const { sessionId, loginUrl } = qrData;
        if (!sessionId || !loginUrl) {
          throw new Error('Dữ liệu QR không chứa sessionId hoặc loginUrl');
        }

        const fileUri = FileSystem.documentDirectory + 'user.json';
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error('Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập trước.');
        }

        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const userData = JSON.parse(fileContent);
        const token = userData?.token;
        const maNguoiDung = userData?.user?.maNguoiDung;
        const taiKhoan = userData?.user?.taiKhoan;
        const matKhau = userData?.user?.matKhau;

        if (!token || !maNguoiDung || !taiKhoan) {
          throw new Error('Thông tin đăng nhập không đầy đủ');
        }

        // Gửi thông tin đăng nhập đến backend
        await apiFetch(loginUrl, 'QRLogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            token,
            user: {
              maNguoiDung,
              taiKhoan,
              matKhau,
            },
          }),
        });

        Alert.alert('Thành công', 'Đăng nhập tự động hoàn tất! Vui lòng kiểm tra trình duyệt trên máy tính.');
        return;
      }

      // Xử lý QR code cho sản phẩm
      if (data.startsWith('/products/')) {
        const productId = data.split('/products/')[1];
        router.push(`/products/${productId}`);
        return;
      }

      // Xử lý QR code cho sao chép giỏ hàng
      if (data.startsWith('http://localhost:5261/api/Cart/CopyGioHang?id=')) {
        const copyGioHangId = data.split('http://localhost:5261/api/Cart/CopyGioHang?id=')[1];
        router.push({
          pathname: '/(tabs)/copycart/[id]',
          params: { id: copyGioHangId },
        });
        return;
      }

      throw new Error('Mã QR không được hỗ trợ');
    } catch (error: any) {
      console.error('QR scan error:', error);
      Alert.alert('Lỗi', error.message || 'Không thể xử lý mã QR.');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.message, { color: themeColors.textPrimary }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.message, { color: themeColors.textPrimary }]}>
          No access to camera
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {showScanner ? (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={showScanner ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={[styles.iconContainer, { backgroundColor: themeColors.secondaryBackground }]}>
            <View style={[styles.qrIcon, { borderColor: themeColors.iconPrimary }]}>
              <View style={[styles.qrIconInner, { backgroundColor: themeColors.iconPrimary }]} />
            </View>
          </View>

          <Text style={[styles.title, { color: themeColors.textPrimary }]}>
            Quét QR Code
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Quét mã QR để tìm sản phẩm, sao chép giỏ hàng, hoặc đăng nhập tự động trên PC.
          </Text>

          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: themeColors.iconPrimary }]}
            onPress={() => setShowScanner(true)}
          >
            <Text style={styles.scanButtonText}>Mở quét mã</Text>
          </TouchableOpacity>

          <View style={styles.instructionsContainer}>
            <Text style={[styles.instructionsTitle, { color: themeColors.textPrimary }]}>
              Làm cách nào để quét:
            </Text>

            <View style={styles.instructionItem}>
              <View style={[styles.stepNumber, { backgroundColor: themeColors.secondaryBackground }]}>
                <Text style={[styles.stepNumberText, { color: themeColors.textPrimary }]}>1</Text>
              </View>
              <View>
                <Text style={[styles.instructionTitle, { color: themeColors.textPrimary }]}>
                  Chọn mở quét mã
                </Text>
                <Text style={[styles.instructionText, { color: themeColors.textSecondary }]}>
                  Khởi chạy máy quét QR để truy cập máy ảnh của bạn
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={[styles.stepNumber, { backgroundColor: themeColors.secondaryBackground }]}>
                <Text style={[styles.stepNumberText, { color: themeColors.textPrimary }]}>2</Text>
              </View>
              <View>
                <Text style={[styles.instructionTitle, { color: themeColors.textPrimary }]}>
                  Vị trí mã QR
                </Text>
                <Text style={[styles.instructionText, { color: themeColors.textSecondary }]}>
                  Hướng máy ảnh của bạn vào mã QR để quét
                </Text>
              </View>
            </View>

            <View style={styles.instructionItem}>
              <View style={[styles.stepNumber, { backgroundColor: themeColors.secondaryBackground }]}>
                <Text style={[styles.stepNumberText, { color: themeColors.textPrimary }]}>3</Text>
              </View>
              <View>
                <Text style={[styles.instructionTitle, { color: themeColors.textPrimary }]}>
                  Xử lý mã QR
                </Text>
                <Text style={[styles.instructionText, { color: themeColors.textSecondary }]}>
                  Xem sản phẩm, sao chép giỏ hàng, hoặc đăng nhập tự động trên PC
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {showScanner && (
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowScanner(false)}
        >
          <Text
            style={[
              styles.closeButtonText,
              { backgroundColor: themeColors.heroOverlay, color: themeColors.textPrimary },
            ]}
          >
            Close Scanner
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center',
    paddingBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  qrIcon: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrIconInner: {
    width: 16,
    height: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  scanButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  instructionsContainer: {
    width: '100%',
    marginTop: 48,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '500',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
});