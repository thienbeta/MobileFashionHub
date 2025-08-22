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
import { ChevronLeft, Edit, Trash2, CheckCircle, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/theme';
import { Appearance } from 'react-native';
import { colors } from '../style/themeColors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import Select from 'react-native-picker-select';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'https://bicacuatho.azurewebsites.net/api';

interface Province { ProvinceID: number; ProvinceName: string; }
interface District { DistrictID: number; DistrictName: string; }
interface Ward { WardCode: string; WardName: string; }
interface Address {
  maDiaChi: number;
  maNguoiDung: string;
  hoTen: string;
  sdt: string;
  moTa?: string;
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
interface LeadTimeResponse {
  leadtime: number;
  leadtime_order: {
    from_estimate_date: string;
    to_estimate_date: string;
  };
}
interface ShippingFeeResponse {
  total: number;
}
type Mode = 'add' | 'edit' | 'view';

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
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [isLoadingShippingFee, setIsLoadingShippingFee] = useState(false);
  const [leadTime, setLeadTime] = useState<LeadTimeResponse | null>(null);
  const [isLoadingLeadTime, setIsLoadingLeadTime] = useState(false);

  const isDarkMode = theme === 'dark' || (theme === 'system' && Appearance.getColorScheme() === 'dark');
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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
      const response = await axios.get(`${API_BASE_URL}/GHN/provinces`, {
        headers: await getAuthHeaders(),
      });
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
      const response = await axios.get(`${API_BASE_URL}/GHN/districts/${provinceId}`, {
        headers: await getAuthHeaders(),
      });
      setDistricts(response.data.map((item: any) => ({
        DistrictID: item.districtID,
        DistrictName: item.districtName,
      })));
      setWards([]);
      setSelectedDistrict(null);
      setSelectedWard(null);
      setShippingFee(null);
      setLeadTime(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lấy danh sách quận/huyện');
    } finally {
      setIsLoadingDistricts(false);
    }
  };

  const fetchWards = async (districtId: number) => {
    setIsLoadingWards(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/GHN/wards/${districtId}`, {
        headers: await getAuthHeaders(),
      });
      setWards(response.data.map((item: any) => ({
        WardCode: item.wardCode,
        WardName: item.wardName,
      })));
      setSelectedWard(null);
      setShippingFee(null);
      setLeadTime(null);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể lấy danh sách phường/xã');
    } finally {
      setIsLoadingWards(false);
    }
  };

  const fetchShippingFee = async () => {
    if (!selectedDistrict?.DistrictID || !selectedWard?.WardCode) {
      setShippingFee(null);
      return;
    }
    setIsLoadingShippingFee(true);
    try {
      const request = {
        service_type_id: 2,
        from_district_id: 1552,
        from_ward_code: '400103',
        to_district_id: selectedDistrict.DistrictID,
        to_ward_code: selectedWard.WardCode,
        length: 35,
        width: 25,
        height: 10,
        weight: 1000,
        insurance_value: 0,
        coupon: null,
        items: [],
      };
      const response = await axios.post<ShippingFeeResponse>(`${API_BASE_URL}/GHN/shipping-fee`, request, {
        headers: await getAuthHeaders(),
      });
      setShippingFee(response.data.total);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải phí giao hàng');
      setShippingFee(null);
    } finally {
      setIsLoadingShippingFee(false);
    }
  };

  const fetchLeadTime = async () => {
    if (!selectedDistrict?.DistrictID || !selectedWard?.WardCode) {
      setLeadTime(null);
      return;
    }
    setIsLoadingLeadTime(true);
    try {
      const request = {
        from_district_id: 1552,
        from_ward_code: '400103',
        to_district_id: selectedDistrict.DistrictID,
        to_ward_code: selectedWard.WardCode,
        service_id: 53320,
      };
      const response = await axios.post<LeadTimeResponse>(`${API_BASE_URL}/GHN/leadtime`, request, {
        headers: await getAuthHeaders(),
      });
      setLeadTime(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải thời gian giao hàng');
      setLeadTime(null);
    } finally {
      setIsLoadingLeadTime(false);
    }
  };

  const fetchAddresses = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/DanhSachDiaChi/maNguoiDung/${userId}`, {
        headers: await getAuthHeaders(),
      });
      const fetchedAddresses = response.data.sort((a: Address, b: Address) => b.trangThai - a.trangThai);
      const updatedAddresses = await Promise.all(
        fetchedAddresses.map(async (addr: Address) => {
          const province = provinces.find((p) => p.ProvinceName === addr.tinh);
          if (!province) return addr;

          const districtResponse = await axios.get(`${API_BASE_URL}/GHN/districts/${province.ProvinceID}`, {
            headers: await getAuthHeaders(),
          });
          const districts = districtResponse.data.map((item: any) => ({
            DistrictID: item.districtID,
            DistrictName: item.districtName,
          }));
          const district = districts.find((d: District) => d.DistrictName === addr.quanHuyen);
          if (!district) return addr;

          const wardResponse = await axios.get(`${API_BASE_URL}/GHN/wards/${district.DistrictID}`, {
            headers: await getAuthHeaders(),
          });
          const wards = wardResponse.data.map((item: any) => ({
            WardCode: item.wardCode,
            WardName: item.wardName,
          }));
          const ward = wards.find((w: Ward) => w.WardName === addr.phuongXa);
          if (!ward) return addr;

          const shippingRequest = {
            service_type_id: 2,
            from_district_id: 1552,
            from_ward_code: '400103',
            to_district_id: district.DistrictID,
            to_ward_code: ward.WardCode,
            length: 35,
            width: 25,
            height: 10,
            weight: 1000,
            insurance_value: 0,
            coupon: null,
            items: [],
          };
          const shippingResponse = await axios.post<ShippingFeeResponse>(`${API_BASE_URL}/GHN/shipping-fee`, shippingRequest, {
            headers: await getAuthHeaders(),
          });

          return { ...addr, moTa: shippingResponse.data.total.toString() };
        })
      );
      setAddresses(updatedAddresses);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải danh sách địa chỉ');
    } finally {
      setIsLoading(false);
    }
  }, [userId, provinces]);

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

  useEffect(() => {
    if (selectedDistrict && selectedWard) {
      fetchShippingFee();
      fetchLeadTime();
    }
  }, [selectedDistrict, selectedWard]);

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
      moTa: shippingFee ? shippingFee.toString() : undefined,
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
        }, { headers: await getAuthHeaders() });
        Alert.alert('Thành công', 'Đã thêm địa chỉ mới');
      } else if (formMode === 'edit') {
        await axios.put(`${API_BASE_URL}/DanhSachDiaChi/${currentAddress.maDiaChi}`, {
          ...fullFormData,
          maDiaChi: currentAddress.maDiaChi,
          maNguoiDung: userId,
          trangThai: currentAddress.trangThai,
        }, { headers: await getAuthHeaders() });
        Alert.alert('Thành công', 'Đã cập nhật địa chỉ');
      }
      await fetchAddresses();
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
            await axios.delete(`${API_BASE_URL}/DanhSachDiaChi/${maDiaChi}`, {
              headers: await getAuthHeaders(),
            });
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
            const headers = await getAuthHeaders();
            await Promise.all(
              addresses.map((addr) =>
                axios.put(
                  `${API_BASE_URL}/DanhSachDiaChi/${addr.maDiaChi}`,
                  {
                    ...addr,
                    trangThai: addr.maDiaChi === maDiaChi ? 1 : 0,
                  },
                  { headers }
                )
              )
            );

            Alert.alert('Thành công', 'Đã chọn địa chỉ mặc định');
            await fetchAddresses();
          } catch (error: any) {
            Alert.alert('Lỗi', error.response?.data?.message || 'Không thể chọn địa chỉ');
          }
        },
      },
    ]);
  };

  const openAddForm = async () => {
    setFormMode('add');
    setCurrentAddress({ trangThai: 1 });
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setFormErrors({});
    setShippingFee(null);
    setLeadTime(null);
    setModalVisible(true);
    await fetchAddresses(); // Giả định đây là dòng gây lỗi TS1308 tại dòng 432
  };

  const openEditForm = async (address: Address) => {
    setFormMode('edit');
    setCurrentAddress(address);
    const province = provinces.find((p) => p.ProvinceName === address.tinh);
    setSelectedProvince(province || null);

    if (province) {
      try {
        setIsLoadingDistricts(true);
        const districtResponse = await axios.get(`${API_BASE_URL}/GHN/districts/${province.ProvinceID}`, {
          headers: await getAuthHeaders(),
        });
        const newDistricts = districtResponse.data.map((item: any) => ({
          DistrictID: item.districtID,
          DistrictName: item.districtName,
        }));
        setDistricts(newDistricts);
        const district = newDistricts.find((d: District) => d.DistrictName === address.quanHuyen);
        setSelectedDistrict(district || null);

        if (district) {
          setIsLoadingWards(true);
          const wardResponse = await axios.get(`${API_BASE_URL}/GHN/wards/${district.DistrictID}`, {
            headers: await getAuthHeaders(),
          });
          const newWards = wardResponse.data.map((item: any) => ({
            WardCode: item.wardCode,
            WardName: item.wardName,
          }));
          setWards(newWards);
          const ward = newWards.find((w: Ward) => w.WardName === address.phuongXa);
          setSelectedWard(ward || null);
          if (ward) {
            await fetchShippingFee();
            await fetchLeadTime();
          }
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

  const openViewForm = async (address: Address) => {
    setFormMode('view');
    setCurrentAddress(address);
    const province = provinces.find((p) => p.ProvinceName === address.tinh);
    setSelectedProvince(province || null);

    if (province) {
      try {
        setIsLoadingDistricts(true);
        const districtResponse = await axios.get(`${API_BASE_URL}/GHN/districts/${province.ProvinceID}`, {
          headers: await getAuthHeaders(),
        });
        const newDistricts = districtResponse.data.map((item: any) => ({
          DistrictID: item.districtID,
          DistrictName: item.districtName,
        }));
        setDistricts(newDistricts);
        const district = newDistricts.find((d: District) => d.DistrictName === address.quanHuyen);
        setSelectedDistrict(district || null);

        if (district) {
          setIsLoadingWards(true);
          const wardResponse = await axios.get(`${API_BASE_URL}/GHN/wards/${district.DistrictID}`, {
            headers: await getAuthHeaders(),
          });
          const newWards = wardResponse.data.map((item: any) => ({
            WardCode: item.wardCode,
            WardName: item.wardName,
          }));
          setWards(newWards);
          const ward = newWards.find((w: Ward) => w.WardName === address.phuongXa);
          setSelectedWard(ward || null);
          if (ward) {
            await fetchShippingFee();
            await fetchLeadTime();
          }
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

  const formatDate = (dateString: string) => {
    const deliveryDate = new Date(dateString);
    const day = deliveryDate.getDate();
    const month = deliveryDate.getMonth() + 1;
    const year = deliveryDate.getFullYear();
    return `Ngày ${day}, tháng ${month}, năm ${year} nhận hàng`;
  };

  const restrictToDigits = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, '');
    setCurrentAddress({ ...currentAddress, sdt: digitsOnly });
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
              <View style={styles.shippingInfo}>
                <Text style={[styles.shippingText, { color: themeColors.textSecondary }]}>Phí giao hàng: {item.moTa ? `${parseInt(item.moTa).toLocaleString()} VND` : 'Đang tải...'}</Text>
              </View>
            </View>
            <View style={styles.addressActions}>
              <Switch
                value={item.trangThai === 1}
                onValueChange={() => handleSelectAddress(item.maDiaChi)}
                trackColor={{ false: '#CBD5E0', true: themeColors.primary }}
                thumbColor="#fff"
              />
              <TouchableOpacity onPress={() => openViewForm(item)}>
                <Eye size={20} color={themeColors.iconPrimary} />
              </TouchableOpacity>
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
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                {formMode === 'add' ? 'Thêm địa chỉ' : formMode === 'edit' ? 'Sửa địa chỉ' : 'Xem địa chỉ'}
              </Text>
              {formMode !== 'view' ? (
                <TouchableOpacity onPress={handleSubmit}>
                  <CheckCircle size={24} color={themeColors.primary} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 24 }} />
              )}
            </View>

            <TextInput
              style={[styles.input, { borderColor: formErrors.hoTen ? 'red' : themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Họ tên"
              placeholderTextColor={themeColors.textSecondary}
              value={currentAddress.hoTen || ''}
              onChangeText={(text) => setCurrentAddress({ ...currentAddress, hoTen: text })}
              editable={formMode !== 'view'}
            />
            {formErrors.hoTen && <Text style={styles.errorText}>{formErrors.hoTen}</Text>}

            <TextInput
              style={[styles.input, { borderColor: formErrors.sdt ? 'red' : themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Số điện thoại"
              placeholderTextColor={themeColors.textSecondary}
              value={currentAddress.sdt || ''}
              onChangeText={restrictToDigits}
              keyboardType="numeric"
              maxLength={10}
              editable={formMode !== 'view'}
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
              disabled={isLoadingProvinces || formMode === 'view'}
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
              disabled={!selectedProvince || isLoadingDistricts || formMode === 'view'}
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
              disabled={!selectedDistrict || isLoadingWards || formMode === 'view'}
            />
            {formErrors.phuongXa && <Text style={styles.errorText}>{formErrors.phuongXa}</Text>}

            <TextInput
              style={[styles.input, { borderColor: formErrors.diaChi ? 'red' : themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Địa chỉ chi tiết"
              placeholderTextColor={themeColors.textSecondary}
              value={currentAddress.diaChi || ''}
              onChangeText={(text) => setCurrentAddress({ ...currentAddress, diaChi: text })}
              editable={formMode !== 'view'}
            />
            {formErrors.diaChi && <Text style={styles.errorText}>{formErrors.diaChi}</Text>}

            {selectedWard && (
              <View style={styles.shippingInfo}>
                <Text style={[styles.shippingText, { color: themeColors.textSecondary }]}>
                  Phí giao hàng dự kiến: {isLoadingShippingFee ? 'Đang tải...' : shippingFee !== null ? `${shippingFee.toLocaleString()} VND` : 'Không thể tải phí giao hàng'}
                </Text>
                <Text style={[styles.shippingText, { color: themeColors.textSecondary }]}>
                  Thời gian giao hàng dự kiến: {isLoadingLeadTime ? 'Đang tải...' : leadTime ? formatDate(leadTime.leadtime_order.to_estimate_date) : 'Không thể tải thời gian giao hàng'}
                </Text>
              </View>
            )}
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