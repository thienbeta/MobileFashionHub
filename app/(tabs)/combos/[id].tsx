import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/theme";
import { Appearance } from "react-native";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react-native";
import { colors } from "../../style/themeColors";
import * as FileSystem from "expo-file-system";
import { apiFetch } from "../../../src/utils/api";
import axios from "axios";

const API_BASE_URL = "http://172.23.144.1:5261/api";

interface ComboProduct {
  idSanPham: string;
  name: string;
  thuongHieu: string;
  loaiSanPham: string;
  kichThuoc: string[];
  soLuong: number;
  donGia: number;
  moTa: string | null;
  chatLieu: string;
  mauSac: string[];
  hinh: string[];
  ngayTao: string;
  trangThai: number;
}

interface Combo {
  maCombo: number;
  name: string;
  hinhAnh: string;
  ngayTao: string;
  trangThai: number;
  sanPhams: ComboProduct[];
  moTa: string;
  gia: number;
  soLuong: number;
}

interface SizeQuantity {
  size: string;
  quantity: number;
  price: number;
}

export default function ComboDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark" || (theme === "system" && Appearance.getColorScheme() === "dark");
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [combo, setCombo] = useState<Combo | null>(null);
  const [selections, setSelections] = useState<Record<string, { colorIndex: number | null; sizeIndex: number | null }>>({});
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, SizeQuantity[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likedId, setLikedId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + "user.json";
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          const parsedUserData = JSON.parse(fileContent);
          setUserData(parsedUserData.user || null);
          setAuthToken(parsedUserData.token || null);
        }
      } catch (error) {
        console.error("Error loading user data from FileSystem:", error);
        setError("Không thể tải thông tin người dùng.");
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const fetchCombo = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!id || Array.isArray(id)) throw new Error("ID combo không hợp lệ");

        const comboResponse = await apiFetch(`${API_BASE_URL}/Combo/ComboSanPhamView?id=${id}`, "ComboDetail");
        if (!comboResponse || !comboResponse[0]) throw new Error("Dữ liệu combo không hợp lệ");

        const formattedCombo: Combo = {
          maCombo: comboResponse[0].maCombo,
          name: comboResponse[0].name,
          hinhAnh: `data:image/jpeg;base64,${comboResponse[0].hinhAnh}`,
          ngayTao: comboResponse[0].ngayTao,
          trangThai: comboResponse[0].trangThai,
          sanPhams: comboResponse[0].sanPhams.map((product: any) => ({
            idSanPham: product.idSanPham,
            name: product.name,
            thuongHieu: product.thuongHieu,
            loaiSanPham: product.loaiSanPham,
            kichThuoc: product.kichThuoc,
            soLuong: product.soLuong,
            donGia: product.donGia,
            moTa: product.moTa || "Không có mô tả",
            chatLieu: product.chatLieu,
            mauSac: product.mauSac,
            hinh: product.hinh.map((img: string) => `data:image/jpeg;base64,${img}`),
            ngayTao: product.ngayTao,
            trangThai: product.trangThai,
          })),
          moTa: comboResponse[0].moTa || "Không có mô tả",
          gia: comboResponse[0].gia,
          soLuong: comboResponse[0].soLuong,
        };

        const initialSelections = formattedCombo.sanPhams.reduce((acc, product) => ({
          ...acc,
          [product.idSanPham]: { colorIndex: null, sizeIndex: null },
        }), {});
        setSelections(initialSelections);

        formattedCombo.sanPhams.forEach((product) => {
          if (product.mauSac.length > 0) {
            fetchSizeQuantities(product.idSanPham, `#${product.mauSac[0]}`);
          }
        });

        if (userData?.maNguoiDung && authToken) {
          const favoriteResponse = await apiFetch(`${API_BASE_URL}/YeuThich`, "Favorites");
          const userFavorite = favoriteResponse.find(
            (favorite: any) => favorite.maCombo === id && favorite.maNguoiDung === userData.maNguoiDung
          );
          if (userFavorite) {
            setIsLiked(true);
            setLikedId(userFavorite.maYeuThich);
          }
        }

        setCombo(formattedCombo);
      } catch (err) {
        console.error("Error fetching combo:", err);
        setError((err as Error).message || "Không thể tải chi tiết combo.");
      } finally {
        setLoading(false);
      }
    };

    fetchCombo();
  }, [id, userData, authToken]);

  const fetchSizeQuantities = async (productId: string, color: string) => {
    try {
      const colorCode = color.replace("#", "");
      const response = await apiFetch(
        `${API_BASE_URL}/SanPham/SanPhamByIDSorted?id=${productId}_${colorCode}`,
        "SizeQuantities"
      );
      if (!response || !response[0]) {
        throw new Error("Không thể lấy thông tin kích thước và số lượng");
      }

      const sizeData = response[0].details.map((detail: any) => ({
        size: detail.kichThuoc.trim(),
        quantity: detail.soLuong,
        price: detail.gia,
      }));

      setSizeQuantities((prev) => ({
        ...prev,
        [productId]: sizeData,
      }));
    } catch (err) {
      console.error("Lỗi khi lấy thông tin kích thước:", err);
      setError("Không thể tải thông tin kích thước.");
    }
  };

  const handleSelectionChange = (productId: string, field: string, value: number) => {
    setSelections((prev) => {
      const newSelections = {
        ...prev,
        [productId]: { ...prev[productId], [field]: value },
      };

      if (field === "colorIndex" && combo) {
        const product = combo.sanPhams.find((p) => p.idSanPham === productId);
        if (product) {
          const selectedColor = product.mauSac[value];
          fetchSizeQuantities(productId, `#${selectedColor}`);
          newSelections[productId].sizeIndex = null;
        }
      }

      return newSelections;
    });
  };

  const handleToggleLike = async () => {
    try {
      if (!userData?.maNguoiDung || !authToken) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập để thêm combo vào danh sách yêu thích!", [
          { text: "OK", onPress: () => router.push("/(auth)/login") },
        ]);
        return;
      }

      if (!id || Array.isArray(id)) {
        Alert.alert("Lỗi", "ID combo không hợp lệ!", [{ text: "OK", onPress: () => { } }]);
        return;
      }

      if (isLiked) {
        await apiFetch(`${API_BASE_URL}/YeuThich/${likedId}`, "RemoveFavorite", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setIsLiked(false);
        setLikedId(null);
        Alert.alert("Thành công", "Đã xóa combo khỏi danh sách yêu thích!", [
          { text: "OK", onPress: () => { } },
        ]);
      } else {
        const favoriteData = {
          maCombo: id,
          tenCombo: combo?.name,
          maNguoiDung: userData.maNguoiDung,
          hoTen: userData.hoTen,
          soLuongYeuThich: 1,
          ngayYeuThich: new Date().toISOString(),
        };

        const addedFavorite = await apiFetch(`${API_BASE_URL}/YeuThich`, "AddFavorite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(favoriteData),
        });
        setIsLiked(true);
        setLikedId(addedFavorite.maYeuThich);
        Alert.alert("Thành công", "Đã thêm combo vào danh sách yêu thích!", [
          { text: "OK", onPress: () => { } },
        ]);
      }
    } catch (error) {
      console.error("Error in handleToggleLike:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi thao tác với yêu thích!", [
        { text: "OK", onPress: () => { } },
      ]);
    }
  };

  const handleAddToCart = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + "user.json";
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      let userDataFromFile = null;
      let token = null;

      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const parsedData = JSON.parse(fileContent);
        userDataFromFile = parsedData.user;
        token = parsedData.token;
      }

      if (!userDataFromFile || !token) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập để thêm combo vào giỏ hàng!", [
          { text: "OK", onPress: () => router.push("/(auth)/login") },
        ]);
        return;
      }

      if (!combo) {
        Alert.alert("Lỗi", "Dữ liệu combo không hợp lệ!", [
          { text: "OK", onPress: () => { } },
        ]);
        return;
      }

      const invalidProducts = combo.sanPhams.filter(
        (product) => selections[product.idSanPham]?.colorIndex === null || selections[product.idSanPham]?.sizeIndex === null
      );
      if (invalidProducts.length > 0) {
        Alert.alert("Lỗi", "Vui lòng chọn màu sắc và kích thước cho tất cả sản phẩm trong combo!", [
          { text: "OK", onPress: () => { } },
        ]);
        return;
      }

      const cartData = {
        IDKhachHang: userDataFromFile.maNguoiDung,
        IDCombo: combo.maCombo,
        SoLuong: quantity,
        Detail: combo.sanPhams.map((product) => {
          const selectedColorIndex = selections[product.idSanPham].colorIndex;
          const selectedSizeIndex = selections[product.idSanPham].sizeIndex;
          if (selectedColorIndex === null || selectedSizeIndex === null) {
            throw new Error(`Chưa chọn màu sắc hoặc kích thước cho sản phẩm ${product.idSanPham}`);
          }
          const sizeData = sizeQuantities[product.idSanPham][selectedSizeIndex];
          return {
            MaSanPham: product.idSanPham,
            MauSac: product.mauSac[selectedColorIndex].replace("#", ""),
            KichThuoc: sizeData.size,
          };
        }),
      };

      console.log("Sending cart data:", JSON.stringify(cartData, null, 2));
      const response = await apiFetch(`${API_BASE_URL}/Cart/ThemComboVaoGioHang`, "AddToCart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cartData),
      });

      if (response?.responseCode === 200) {
        Alert.alert("Thành công", "Đã thêm combo vào giỏ hàng thành công!");
      } else {
        throw new Error(`Yêu cầu thất bại với mã: ${response?.responseCode || 'unknown'}`);
      }

    } catch (err) {
      console.error("Error in handleAddToCart:", err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Có lỗi xảy ra khi thêm vào giỏ hàng!";
        const status = err.response?.status;
        console.log("API Error:", { status, data: err.response?.data });
        if (status === 401) {
          Alert.alert("Lỗi", "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", [
            { text: "OK", onPress: () => router.push("/(auth)/login") },
          ]);
        } else if (status === 500) {
          Alert.alert("Lỗi", "Lỗi máy chủ: Vui lòng liên hệ quản trị viên. Chi tiết: " + errorMessage, [
            { text: "OK", onPress: () => { } },
          ]);
        } else {
          Alert.alert("Lỗi", errorMessage, [{ text: "OK", onPress: () => { } }]);
        }
      } else {
        Alert.alert("Lỗi", "Đã có lỗi không xác định xảy ra!", [
          { text: "OK", onPress: () => { } },
        ]);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>Đang tải...</Text>
      </View>
    );
  }

  if (error || !combo) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>
          Lỗi: {error || "Không tìm thấy combo"}
        </Text>
      </View>
    );
  }

  const selectedPrice = combo.gia;

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/combos')}
          style={[styles.backButton, { backgroundColor: themeColors.secondaryBackground }]}
        >
          <ArrowLeft size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleToggleLike}
          style={[styles.wishlistButton, { backgroundColor: themeColors.secondaryBackground }]}
        >
          <Heart
            size={24}
            color={isLiked ? "#ff0000" : themeColors.iconPrimary}
            fill={isLiked ? "#ff0000" : "none"}
          />
        </TouchableOpacity>
      </View>

      <Image
        source={{ uri: combo.hinhAnh || "https://via.placeholder.com/300" }}
        style={styles.productImage}
      />

      <View style={styles.content}>
        <Text style={[styles.name, { color: themeColors.textPrimary }]}>{combo.name}</Text>
        <Text style={[styles.shortDescription, { color: themeColors.textTertiary }]}>{combo.moTa}</Text>
        <Text style={[styles.price, { color: themeColors.iconPrimary }]}>
          {(selectedPrice / 1000).toFixed(3)} VND
        </Text>

        {combo.sanPhams.map((product, index) => (
          <View key={index} style={styles.productSection}>
            <View style={styles.productRow}>
              <Image
                source={{ uri: product.hinh[0] || "https://via.placeholder.com/80" }}
                style={styles.productThumbnail}
              />
              <Text style={[styles.productName, { color: themeColors.textPrimary }]}>{product.name}</Text>
            </View>

            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Màu sắc</Text>
            <View style={styles.colorsContainer}>
              {product.mauSac.map((color, colorIndex) => (
                <TouchableOpacity
                  key={colorIndex}
                  style={[
                    styles.colorButton,
                    { backgroundColor: `#${color}` },
                    selections[product.idSanPham]?.colorIndex === colorIndex && styles.selectedBorder,
                  ]}
                  onPress={() => handleSelectionChange(product.idSanPham, "colorIndex", colorIndex)}
                />
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Kích thước</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizesContainer}>
              {sizeQuantities[product.idSanPham]?.map((sizeData, sizeIndex) => (
                <TouchableOpacity
                  key={sizeIndex}
                  style={[
                    styles.sizeButton,
                    { backgroundColor: themeColors.secondaryBackground },
                    selections[product.idSanPham]?.sizeIndex === sizeIndex && styles.selectedBorder,
                  ]}
                  onPress={() => handleSelectionChange(product.idSanPham, "sizeIndex", sizeIndex)}
                  disabled={sizeData.quantity === 0}
                >
                  <Text
                    style={[
                      styles.sizeText,
                      {
                        color: selections[product.idSanPham]?.sizeIndex === sizeIndex ? "#fff" : themeColors.textPrimary,
                        opacity: sizeData.quantity === 0 ? 0.5 : 1,
                      },
                    ]}
                  >
                    {sizeData.size} ({sizeData.quantity})
                  </Text>
                </TouchableOpacity>
              ))}
              {!sizeQuantities[product.idSanPham]?.length && (
                <Text style={[styles.errorText, { color: themeColors.textTertiary }]}>
                  Không có kích thước nào khả dụng cho màu này.
                </Text>
              )}
            </ScrollView>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Số lượng</Text>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={[styles.quantityButton, { borderColor: themeColors.textSecondary }]}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Text style={[styles.quantityText, { color: themeColors.textPrimary }]}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.quantityValue, { color: themeColors.textPrimary }]}>{quantity}</Text>
          <TouchableOpacity
            style={[styles.quantityButton, { borderColor: themeColors.textSecondary }]}
            onPress={() => setQuantity(quantity + 1)}
          >
            <Text style={[styles.quantityText, { color: themeColors.textPrimary }]}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addToCartButton, { backgroundColor: themeColors.iconPrimary }]}
          onPress={handleAddToCart}
        >
          <ShoppingBag size={20} color="#fff" />
          <Text style={styles.addToCartText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    paddingTop: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  wishlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  productImage: {
    width: "100%",
    height: 400,
  },
  content: {
    padding: 24,
  },
  name: {
    fontSize: 24,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 8,
  },
  shortDescription: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    marginBottom: 24,
  },
  productSection: {
    marginBottom: 24,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  productThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  productName: {
    fontSize: 18,
    fontFamily: "Poppins_500Medium",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 12,
  },
  colorsContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  sizesContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  sizeButton: {
    width: 60,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sizeText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  quantityButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
  },
  quantityText: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },
  quantityValue: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    marginHorizontal: 16,
  },
  description: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    lineHeight: 24,
    marginBottom: 24,
  },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
    marginTop: 24,
  },
  selectedBorder: {
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
});