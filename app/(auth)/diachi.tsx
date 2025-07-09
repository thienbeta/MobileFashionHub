import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { ChevronRight, ChevronLeft, Edit, Trash2, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import Select from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://192.168.10.32:5261/api';

interface Province { ProvinceID: number; ProvinceName: string; }
interface District { DistrictID: number; DistrictName: string; }
interface Ward { WardCode: string; WardName: string; }
interface Address {
  maDiaChi: number;
  maNguoiDung: string;
  hoTen: string;
  sdt: string;
  diaChi: string;
  phuongXa: string;
  quanHuyen: string;
  tinh: string;
  trangThai: number;
}
interface FormErrors {
  hoTen?: string;
  sdt?: string;
  tinh?: string;
  quanHuyen?: string;
  phuongXa?: string;
  diaChi?: string;
}
type Mode = 'add' | 'edit';

const shippingData: { [key: string]: { fee: number; time: string } } = {
  "Hà Nội": { fee: 40000, time: "3 - 5 ngày" },
  "TP. Hồ Chí Minh": { fee: 20000, time: "2 - 3 ngày" },
  "Hải Phòng": { fee: 45000, time: "3 - 5 ngày" },
  "Đà Nẵng": { fee: 30000, time: "2 - 3 ngày" },
  "Cần Thơ": { fee: 30000, time: "2 - 4 ngày" },
  "An Giang": { fee: 35000, time: "3 - 4 ngày" },
  "Bà Rịa - Vũng Tàu": { fee: 25000, time: "2 - 3 ngày" },
  "Bắc Giang": { fee: 45000, time: "3 - 5 ngày" },
  "Bắc Kạn": { fee: 50000, time: "4 - 6 ngày" },
  "Bạc Liêu": { fee: 35000, time: "3 - 4 ngày" },
  "Bắc Ninh": { fee: 40000, time: "3 - 5 ngày" },
  "Bến Tre": { fee: 30000, time: "2 - 4 ngày" },
  "Bình Định": { fee: 25000, time: "2 - 3 ngày" },
  "Bình Dương": { fee: 20000, time: "2 - 3 ngày" },
  "Bình Phước": { fee: 20000, time: "2 - 3 ngày" },
  "Bình Thuận": { fee: 25000, time: "2 - 3 ngày" },
  "Cà Mau": { fee: 35000, time: "3 - 5 ngày" },
  "Cao Bằng": { fee: 50000, time: "4 - 6 ngày" },
  "Đắk Lắk": { fee: 0, time: "Nội tỉnh" },
  "Đắk Nông": { fee: 15000, time: "1 - 2 ngày" },
  "Điện Biên": { fee: 50000, time: "4 - 6 ngày" },
  "Đồng Nai": { fee: 20000, time: "2 - 3 ngày" },
  "Đồng Tháp": { fee: 30000, time: "3 - 4 ngày" },
  "Gia Lai": { fee: 15000, time: "1 - 2 ngày" },
  "Hà Giang": { fee: 50000, time: "4 - 6 ngày" },
  "Hà Nam": { fee: 45000, time: "3 - 5 ngày" },
  "Hà Tĩnh": { fee: 35000, time: "3 - 4 ngày" },
  "Hải Dương": { fee: 45000, time: "3 - 5 ngày" },
  "Hậu Giang": { fee: 35000, time: "3 - 4 ngày" },
  "Hòa Bình": { fee: 45000, time: "3 - 5 ngày" },
  "Hưng Yên": { fee: 40000, time: "3 - 5 ngày" },
  "Khánh Hòa": { fee: 25000, time: "2 - 3 ngày" },
  "Kiên Giang": { fee: 35000, time: "3 - 4 ngày" },
  "Kon Tum": { fee: 15000, time: "1 - 2 ngày" },
  "Lai Châu": { fee: 50000, time: "4 - 6 ngày" },
  "Lâm Đồng": { fee: 20000, time: "1 - 2 ngày" },
  "Lạng Sơn": { fee: 50000, time: "4 - 6 ngày" },
  "Lào Cai": { fee: 50000, time: "4 - 6 ngày" },
  "Long An": { fee: 30000, time: "2 - 4 ngày" },
  "Nam Định": { fee: 45000, time: "3 - 5 ngày" },
  "Nghệ An": { fee: 35000, time: "3 - 4 ngày" },
  "Ninh Bình": { fee: 45000, time: "3 - 5 ngày" },
  "Ninh Thuận": { fee: 25000, time: "2 - 3 ngày" },
  "Phú Thọ": { fee: 45000, time: "3 - 5 ngày" },
  "Phú Yên": { fee: 25000, time: "2 - 3 ngày" },
  "Quảng Bình": { fee: 35000, time: "3 - 4 ngày" },
  "Quảng Nam": { fee: 25000, time: "2 - 3 ngày" },
  "Quảng Ngãi": { fee: 25000, time: "2 - 3 ngày" },
  "Quảng Ninh": { fee: 50000, time: "4 - 6 ngày" },
  "Quảng Trị": { fee: 30000, time: "3 - 4 ngày" },
  "Sóc Trăng": { fee: 35000, time: "3 - 4 ngày" },
  "Sơn La": { fee: 50000, time: "4 - 6 ngày" },
  "Tây Ninh": { fee: 25000, time: "2 - 3 ngày" },
  "Thái Bình": { fee: 45000, time: "3 - 5 ngày" },
  "Thái Nguyên": { fee: 45000, time: "3 - 5 ngày" },
  "Thanh Hóa": { fee: 40000, time: "3 - 4 ngày" },
  "Thừa Thiên Huế": { fee: 30000, time: "2 - 3 ngày" },
  "Tiền Giang": { fee: 30000, time: "2 - 3 ngày" },
  "Trà Vinh": { fee: 30000, time: "2 - 3 ngày" },
  "Tuyên Quang": { fee: 50000, time: "4 - 6 ngày" },
  "Vĩnh Long": { fee: 30000, time: "2 - 3 ngày" },
  "Vĩnh Phúc": { fee: 45000, time: "3 - 5 ngày" },
  "Yên Bái": { fee: 50000, time: "4 - 6 ngày" },
};

export default function AddressScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<Mode>('add');
  const [currentAddress, setCurrentAddress] = useState<Partial<Address>>({ trangThai: 1 });
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const loadUserData = useCallback(async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'user.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        setIsLoading(false);
        Alert.alert('Lỗi', 'Tệp thông tin người dùng không tồn tại. Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }

      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const data = JSON.parse(fileContent);
      const user = data?.user;

      if (!user || !user.maNguoiDung) {
        setIsLoading(false);
        Alert.alert('Lỗi', 'Dữ liệu người dùng không hợp lệ. Vui lòng đăng nhập lại.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }

      setUserId(user.maNguoiDung);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      Alert.alert('Lỗi', `Không thể đọc thông tin người dùng: ${error.message}. Vui lòng đăng nhập lại.`, [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  }, [router]);

  const fetchProvinces = async () => {
    setIsLoadingProvinces(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/GHN/provinces`);
      setProvinces(response.data.map((item: any) => ({
        ProvinceID: item.provinceID,
        ProvinceName: item.provinceName,
      })));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lấy danh sách tỉnh/thành phố');
    } finally {
      setIsLoadingProvinces(false);
    }
  };

  const fetchDistricts = async (provinceId: number) => {
    setIsLoadingDistricts(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/GHN/districts/${provinceId}`);
      setDistricts(response.data.map((item: any) => ({
        DistrictID: item.districtID,
        DistrictName: item.districtName,
      })));
      setWards([]);
      setSelectedDistrict(null);
      setSelectedWard(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lấy danh sách quận/huyện');
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const fetchWards = async (districtId: number) => {
    setIsLoadingWards(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/GHN/wards/${districtId}`);
      setWards(response.data.map((item: any) => ({
        WardCode: item.wardCode,
        WardName: item.wardName,
      })));
      setSelectedWard(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lấy danh sách phường/xã');
    } finally {
      setIsLoadingWards(false);
    }
  };

  const fetchAddresses = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/DanhSachDiaChi/maNguoiDung/${userId}`);
      setAddresses(response.data.sort((a: Address, b: Address) => b.trangThai - a.trangThai));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách địa chỉ');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUserData();
    fetchProvinces();
  }, [loadUserData]);

  useEffect(() => {
    if (userId) fetchAddresses();
  }, [userId, fetchAddresses]);

  useEffect(() => {
    if (selectedProvince?.ProvinceID) fetchDistricts(selectedProvince.ProvinceID);
  }, [selectedProvince]);

  useEffect(() => {
    if (selectedDistrict?.DistrictID) fetchWards(selectedDistrict.DistrictID);
  }, [selectedDistrict]);

  const validateForm = (formData: Partial<Address>): FormErrors => {
    const errors: FormErrors = {};
    if (!formData.hoTen || formData.hoTen.trim().length < 5) errors.hoTen = 'Họ tên phải có ít nhất 5 ký tự';
    if (!formData.sdt || !/^\d{10}$/.test(formData.sdt)) errors.sdt = 'Số điện thoại phải có đúng 10 chữ số';
    if (!selectedProvince) errors.tinh = 'Tỉnh/Thành phố là bắt buộc';
    if (!selectedDistrict) errors.quanHuyen = 'Quận/Huyện là bắt buộc';
    if (!selectedWard) errors.phuongXa = 'Phường/Xã là bắt buộc';
    if (!formData.diaChi || formData.diaChi.trim() === '') errors.diaChi = 'Địa chỉ chi tiết là bắt buộc';
    return errors;
  };

  const handleSubmit = async () => {
    const fullFormData: Partial<Address> = {
      ...currentAddress,
      tinh: selectedProvince?.ProvinceName,
      quanHuyen: selectedDistrict?.DistrictName,
      phuongXa: selectedWard?.WardName,
    };

    const errors = validateForm(fullFormData);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ và đúng thông tin');
      return;
    }

    try {
      if (formMode === 'add') {
        if (addresses.length >= 5) {
          Alert.alert('Lỗi', 'Bạn chỉ có thể có tối đa 5 địa chỉ');
          setModalVisible(false);
          return;
        }
        await axios.post(`${API_BASE_URL}/DanhSachDiaChi`, {
          ...fullFormData,
          maNguoiDung: userId,
          trangThai: 1,
        });
        Alert.alert('Thành công', 'Đã thêm địa chỉ mới');
      } else {
        await axios.put(`${API_BASE_URL}/DanhSachDiaChi/${currentAddress.maDiaChi}`, {
          ...fullFormData,
          maDiaChi: currentAddress.maDiaChi,
          maNguoiDung: userId,
          trangThai: currentAddress.trangThai,
        });
        Alert.alert('Thành công', 'Đã cập nhật địa chỉ');
      }
      fetchAddresses();
      setModalVisible(false);
      setFormErrors({});
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || `Không thể ${formMode === 'add' ? 'thêm' : 'cập nhật'} địa chỉ`);
    }
  };

  const handleDelete = async (maDiaChi: number) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa địa chỉ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE_URL}/DanhSachDiaChi/${maDiaChi}`);
            setAddresses(addresses.filter((addr) => addr.maDiaChi !== maDiaChi));
            Alert.alert('Thành công', 'Đã xóa địa chỉ');
          } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể xóa địa chỉ');
          }
        },
      },
    ]);
  };

  const handleSelectAddress = async (maDiaChi: number) => {
    Alert.alert('Xác nhận', 'Bạn có muốn chọn địa chỉ này làm mặc định?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          try {
            await Promise.all(
              addresses.map((addr) =>
                axios.put(
                  `${API_BASE_URL}/DanhSachDiaChi/${addr.maDiaChi}`,
                  {
                    ...addr,
                    trangThai: addr.maDiaChi === maDiaChi ? 1 : 0,
                  }
                )
              )
            );
            Alert.alert('Thành công', 'Đã chọn địa chỉ mặc định');
            fetchAddresses();
          } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể chọn địa chỉ');
          }
        },
      },
    ]);
  };

  const openAddForm = () => {
    setFormMode('add');
    setCurrentAddress({ trangThai: 1 });
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setFormErrors({});
    setModalVisible(true);
  };

  const openEditForm = async (address: Address) => {
    setFormMode('edit');
    setCurrentAddress(address);
    const province = provinces.find((p) => p.ProvinceName === address.tinh);
    setSelectedProvince(province || null);

    if (province) {
      try {
        setIsLoadingDistricts(true);
        const districtResponse = await axios.get(`${API_BASE_URL}/GHN/districts/${province.ProvinceID}`);
        const newDistricts = districtResponse.data.map((item: any) => ({
          DistrictID: item.districtID,
          DistrictName: item.districtName,
        }));
        setDistricts(newDistricts);
        const district = newDistricts.find((d: District) => d.DistrictName === address.quanHuyen);
        setSelectedDistrict(district || null);

        if (district) {
          setIsLoadingWards(true);
          const wardResponse = await axios.get(`${API_BASE_URL}/GHN/wards/${district.DistrictID}`);
          const newWards = wardResponse.data.map((item: any) => ({
            WardCode: item.wardCode,
            WardName: item.wardName,
          }));
          setWards(newWards);
          const ward = newWards.find((w: Ward) => w.WardName === address.phuongXa);
          setSelectedWard(ward || null);
        }
      } catch (error: any) {
        Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải dữ liệu khu vực');
      } finally {
        setIsLoadingDistricts(false);
        setIsLoadingWards(false);
      }
    }
    setFormErrors({});
    setModalVisible(true);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAddresses();
    setRefreshing(false);
  }, [fetchAddresses]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={themeColors.iconPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Địa chỉ</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.maDiaChi.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
        ListHeaderComponent={
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: themeColors.secondaryBackground }]}
            onPress={openAddForm}
          >
            <Ionicons name="add-circle-outline" size={24} color={themeColors.iconPrimary} />
            <Text style={[styles.addButtonText, { color: themeColors.textPrimary }]}>Thêm địa chỉ mới</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Không có địa chỉ nào để hiển thị.</Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.addressCard, { backgroundColor: themeColors.secondaryBackground, borderColor: item.trangThai === 1 ? themeColors.primary : themeColors.border }]}>
            <View style={styles.addressInfo}>
              <Text style={[styles.addressName, { color: themeColors.textPrimary }]}>{item.hoTen}</Text>
              <Text style={[styles.addressDetail, { color: themeColors.textSecondary }]}>{item.sdt}</Text>
              <Text style={[styles.addressDetail, { color: themeColors.textSecondary }]}>{item.diaChi}, {item.phuongXa}, {item.quanHuyen}, {item.tinh}</Text>
              {shippingData[item.tinh] && (
                <View style={styles.shippingInfo}>
                  <Text style={[styles.shippingText, { color: themeColors.textSecondary }]}>Phí giao hàng: {shippingData[item.tinh].fee.toLocaleString()} VND</Text>
                  <Text style={[styles.shippingText, { color: themeColors.textSecondary }]}>Thời gian: {shippingData[item.tinh].time}</Text>
                </View>
              )}
            </View>
            <View style={styles.addressActions}>
              <Switch
                value={item.trangThai === 1}
                onValueChange={() => handleSelectAddress(item.maDiaChi)}
                trackColor={{ false: '#CBD5E0', true: themeColors.primary }}
                thumbColor="#fff"
              />
              <TouchableOpacity onPress={() => openEditForm(item)}>
                <Edit size={20} color={themeColors.iconPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.maDiaChi)}>
                <Trash2 size={20} color={themeColors.iconSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ChevronLeft size={24} color={themeColors.iconPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{formMode === 'add' ? 'Thêm địa chỉ' : 'Sửa địa chỉ'}</Text>
              <TouchableOpacity onPress={handleSubmit}>
                <CheckCircle size={24} color={themeColors.primary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { borderColor: formErrors.hoTen ? 'red' : themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Họ tên"
              placeholderTextColor={themeColors.textSecondary}
              value={currentAddress.hoTen || ''}
              onChangeText={(text) => setCurrentAddress({ ...currentAddress, hoTen: text })}
            />
            {formErrors.hoTen && <Text style={styles.errorText}>{formErrors.hoTen}</Text>}

            <TextInput
              style={[styles.input, { borderColor: formErrors.sdt ? 'red' : themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Số điện thoại"
              placeholderTextColor={themeColors.textSecondary}
              value={currentAddress.sdt || ''}
              onChangeText={(text) => setCurrentAddress({ ...currentAddress, sdt: text })}
              keyboardType="numeric"
              maxLength={10}
            />
            {formErrors.sdt && <Text style={styles.errorText}>{formErrors.sdt}</Text>}

            <Select
              style={{
                inputAndroid: [styles.select, { color: themeColors.textPrimary, backgroundColor: themeColors.background }],
                inputIOS: [styles.select, { color: themeColors.textPrimary, backgroundColor: themeColors.background }],
              }}
              placeholder={{ label: isLoadingProvinces ? 'Đang tải...' : 'Chọn tỉnh/thành phố', value: null }}
              items={provinces.map((p) => ({ label: p.ProvinceName, value: p.ProvinceID }))}
              onValueChange={(value) => {
                const province = provinces.find((p) => p.ProvinceID === value) || null;
                setSelectedProvince(province);
              }}
              disabled={isLoadingProvinces}
            />
            {formErrors.tinh && <Text style={styles.errorText}>{formErrors.tinh}</Text>}

            <Select
              style={{
                inputAndroid: [styles.select, { color: themeColors.textPrimary, backgroundColor: themeColors.background }],
                inputIOS: [styles.select, { color: themeColors.textPrimary, backgroundColor: themeColors.background }],
              }}
              placeholder={{ label: isLoadingDistricts ? 'Đang tải...' : 'Chọn quận/huyện', value: null }}
              items={districts.map((d) => ({ label: d.DistrictName, value: d.DistrictID }))}
              onValueChange={(value) => {
                const district = districts.find((d) => d.DistrictID === value) || null;
                setSelectedDistrict(district);
              }}
              disabled={!selectedProvince || isLoadingDistricts}
            />
            {formErrors.quanHuyen && <Text style={styles.errorText}>{formErrors.quanHuyen}</Text>}

            <Select
              style={{
                inputAndroid: [styles.select, { color: themeColors.textPrimary, backgroundColor: themeColors.background }],
                inputIOS: [styles.select, { color: themeColors.textPrimary, backgroundColor: themeColors.background }],
              }}
              placeholder={{ label: isLoadingWards ? 'Đang tải...' : 'Chọn phường/xã', value: null }}
              items={wards.map((w) => ({ label: w.WardName, value: w.WardCode }))}
              onValueChange={(value) => {
                const ward = wards.find((w) => w.WardCode === value) || null;
                setSelectedWard(ward);
              }}
              disabled={!selectedDistrict || isLoadingWards}
            />
            {formErrors.phuongXa && <Text style={styles.errorText}>{formErrors.phuongXa}</Text>}

            <TextInput
              style={[styles.input, { borderColor: formErrors.diaChi ? 'red' : themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Địa chỉ chi tiết"
              placeholderTextColor={themeColors.textSecondary}
              value={currentAddress.diaChi || ''}
              onChangeText={(text) => setCurrentAddress({ ...currentAddress, diaChi: text })}
            />
            {formErrors.diaChi && <Text style={styles.errorText}>{formErrors.diaChi}</Text>}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_600SemiBold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    marginLeft: 12,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  addressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressInfo: {
    flex: 1,
    marginRight: 16,
  },
  addressName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 2,
  },
  shippingInfo: {
    marginTop: 8,
  },
  shippingText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  addressActions: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_600SemiBold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  select: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'Poppins_400Regular',
  },
});