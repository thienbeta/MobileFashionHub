import { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../context/theme";
import { Appearance } from "react-native";
import { ArrowLeft, Heart, ShoppingBag, Star, Trash2, Send } from "lucide-react-native";
import { colors } from "../../style/themeColors";
import * as FileSystem from "expo-file-system";
import { apiFetch } from "../../../src/utils/api";
import axios from "axios";

const API_BASE_URL = "http://192.168.10.35:5261/api";

interface NguoiDung {
  maNguoiDung: string;
  hoTen: string;
  vaiTro: string;
  hinhAnh: string | null;
}

interface Comment {
  maBinhLuan: string;
  maComBo: number;
  maNguoiDung: string;
  hoTen: string;
  noiDungBinhLuan: string;
  danhGia: number;
  ngayBinhLuan: string;
  trangThai: number;
  hinhAnh: string | null;
}

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
  rating: number;
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
  const [userData, setUserData] = useState<NguoiDung | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [rating, setRating] = useState(0);

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
        setError("Không thể tải thông tin người dùng.");
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const fetchComboAndComments = async () => {
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
          rating: 0,
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

        const commentData = await apiFetch(`${API_BASE_URL}/Comment/list`, "Comments");
        const comboComments = commentData.filter(
          (comment: Comment) => comment.maComBo === parseInt(id) && comment.trangThai === 1
        );

        let enrichedComments = comboComments;
        if (userData?.maNguoiDung && authToken) {
          const nguoiDungData = await apiFetch(`${API_BASE_URL}/NguoiDung/${userData.maNguoiDung}`, "User");
          enrichedComments = comboComments.map((comment: Comment) => ({
            ...comment,
            hoTen: comment.maNguoiDung === userData.maNguoiDung ? userData?.hoTen : comment.hoTen,
            hinhAnh: comment.maNguoiDung === userData.maNguoiDung ? nguoiDungData.hinhAnh : comment.hinhAnh,
          }));

          const favoriteResponse = await apiFetch(`${API_BASE_URL}/YeuThich`, "Favorites");
          const userFavorite = favoriteResponse.find(
            (favorite: any) => favorite.maCombo === id && favorite.maNguoiDung === userData.maNguoiDung
          );
          if (userFavorite) {
            setIsLiked(true);
            setLikedId(userFavorite.maYeuThich);
          }
        }

        const totalRating = enrichedComments.reduce((sum: number, comment: Comment) => sum + comment.danhGia, 0);
        const averageRating = enrichedComments.length > 0 ? totalRating / enrichedComments.length : 0;
        const roundedAverageRating = Number(averageRating.toFixed(1));

        formattedCombo.rating = roundedAverageRating;

        setCombo(formattedCombo);
        setComments(enrichedComments);
      } catch (err) {
        setError((err as Error).message || "Không thể tải chi tiết combo.");
      } finally {
        setLoading(false);
      }
    };

    fetchComboAndComments();
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
        Alert.alert("Lỗi", "ID combo không hợp lệ!");
        return;
      }

      if (isLiked) {
        await apiFetch(`${API_BASE_URL}/YeuThich/${likedId}`, "RemoveFavorite", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setIsLiked(false);
        setLikedId(null);
        Alert.alert("Thành công", "Đã xóa combo khỏi danh sách yêu thích!");
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
        Alert.alert("Thành công", "Đã thêm combo vào danh sách yêu thích!");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi thao tác với yêu thích!");
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
        Alert.alert("Lỗi", "Dữ liệu combo không hợp lệ!");
        return;
      }

      const invalidProducts = combo.sanPhams.filter(
        (product) => selections[product.idSanPham]?.colorIndex === null || selections[product.idSanPham]?.sizeIndex === null
      );
      if (invalidProducts.length > 0) {
        Alert.alert("Lỗi", "Vui lòng chọn màu sắc và kích thước cho tất cả sản phẩm trong combo!");
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
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Có lỗi xảy ra khi thêm vào giỏ hàng!";
        const status = err.response?.status;
        if (status === 401) {
          Alert.alert("Lỗi", "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!", [
            { text: "OK", onPress: () => router.push("/(auth)/login") },
          ]);
        } else if (status === 500) {
          Alert.alert("Lỗi", "Lỗi máy chủ: Vui lòng liên hệ quản trị viên. Chi tiết: " + errorMessage);
        } else {
          Alert.alert("Lỗi", errorMessage);
        }
      } else {
        Alert.alert("Lỗi", "Đã có lỗi không xác định xảy ra!");
      }
    }
  };

  const handleAddComment = async () => {
    try {
      if (!newComment || rating < 1 || rating > 5) {
        Alert.alert("Lỗi", "Vui lòng nhập nội dung bình luận và chọn đánh giá từ 1 đến 5 sao!");
        return;
      }

      if (!userData?.maNguoiDung || !authToken) {
        Alert.alert("Lỗi", "Vui lòng đăng nhập trước khi thêm bình luận!", [
          { text: "OK", onPress: () => router.push("/(auth)/login") },
        ]);
        return;
      }

      if (!id || Array.isArray(id)) {
        Alert.alert("Lỗi", "ID combo không hợp lệ!");
        return;
      }

      const commentData = {
        maComBo: parseInt(id),
        tenCombo: combo?.name,
        maNguoiDung: userData.maNguoiDung,
        hoTen: userData?.hoTen,
        noiDungBinhLuan: newComment,
        danhGia: rating,
        ngayBinhLuan: new Date().toISOString(),
        trangThai: 0,
        hinhAnh: userData?.hinhAnh,
      };

      await apiFetch(`${API_BASE_URL}/Comment/add`, "AddComment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(commentData),
      });

      setNewComment("");
      setRating(0);
      Alert.alert("Thành công", "Bình luận của bạn đã được ghi lại và chờ duyệt!");
    } catch (err) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi thêm bình luận!");
    }
  };

  const handleDeleteComment = async (maBinhLuan: string) => {
    Alert.alert("Xác nhận", "Bạn có chắc muốn xóa bình luận này không?", [
      { text: "Không", style: "cancel" },
      {
        text: "Có",
        onPress: async () => {
          try {
            if (!authToken) {
              Alert.alert("Lỗi", "Bạn cần đăng nhập để thực hiện chức năng này!", [
                { text: "OK", onPress: () => router.push("/(auth)/login") },
              ]);
              return;
            }

            await apiFetch(`${API_BASE_URL}/Comment/delete/${maBinhLuan}`, "DeleteComment", {
              method: "DELETE",
              headers: { Authorization: `Bearer ${authToken}` },
            });

            setComments(prev => {
              const updatedComments = prev.filter(comment => comment.maBinhLuan !== maBinhLuan);
              const totalRating = updatedComments.reduce((sum, comment) => sum + comment.danhGia, 0);
              const averageRating = updatedComments.length > 0 ? totalRating / updatedComments.length : 0;
              const roundedAverageRating = Number(averageRating.toFixed(1));

              if (combo) {
                setCombo({ ...combo, rating: roundedAverageRating });
              }

              return updatedComments;
            });

            Alert.alert("Thành công", "Xóa bình luận thành công!");
          } catch (err) {
            Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa bình luận!");
          }
        },
      },
    ]);
  };

  const navigateToProduct = (productId: string, color: string) => {
    router.push(`/products/${productId}_${color.replace("#", "")}`);
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
      <View>
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
          <Text style={[styles.price, { color: themeColors.iconPrimary }]}> {(selectedPrice / 1000).toFixed(3)} VND </Text>

          {combo.sanPhams.map((product, index) => (
            <View key={index} style={styles.productSection}>
              <View style={styles.productRow}>
                <TouchableOpacity onPress={() => navigateToProduct(product.idSanPham, product.mauSac[0] || "")}>
                  <Image
                    source={{ uri: product.hinh[0] || "https://via.placeholder.com/80" }}
                    style={styles.productThumbnail}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigateToProduct(product.idSanPham, product.mauSac[0] || "")}>
                  <Text style={[styles.productName, { color: themeColors.textPrimary }]}>{product.name}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Màu sắc</Text>
              <View style={styles.colorsContainer}>
                {product.mauSac.map((color, colorIndex) => (
                  <TouchableOpacity
                    key={colorIndex}
                    style={[styles.colorButton, { backgroundColor: `#${color}` }, selections[product.idSanPham]?.colorIndex === colorIndex && styles.selectedBorder]}
                    onPress={() => handleSelectionChange(product.idSanPham, "colorIndex", colorIndex)}
                  />
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Kích thước</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sizesContainer}>
                {sizeQuantities[product.idSanPham] && sizeQuantities[product.idSanPham].length > 0 ? (
                  sizeQuantities[product.idSanPham].map((sizeData, sizeIndex) => (
                    <TouchableOpacity
                      key={sizeIndex}
                      style={[styles.sizeButton, { backgroundColor: themeColors.secondaryBackground }, selections[product.idSanPham]?.sizeIndex === sizeIndex && styles.selectedBorder]}
                      onPress={() => handleSelectionChange(product.idSanPham, "sizeIndex", sizeIndex)}
                      disabled={sizeData.quantity === 0}
                    >
                      <Text
                        style={[styles.sizeText, {
                          color: selections[product.idSanPham]?.sizeIndex === sizeIndex ? "#fff" : themeColors.textPrimary,
                          opacity: sizeData.quantity === 0 ? 0.5 : 1,
                        }]}
                      >
                        {sizeData.size} ({sizeData.quantity})
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
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
            style={[styles.button, { backgroundColor: themeColors.iconPrimary }]}
            onPress={handleAddToCart}
          >
            <ShoppingBag size={20} color="#fff" />
            <Text style={styles.addToCartText}>Thêm vào giỏ hàng</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary, fontSize: 24 }]}>Đánh giá Combos</Text>
          <View style={styles.commentForm}>
            <View style={styles.ratingInput}>
              {Array.from({ length: 5 }).map((_, index) => (
                <TouchableOpacity key={index} onPress={() => setRating(index + 1)}>
                  <Star
                    size={24}
                    color={index < rating ? '#facc15' : '#d1d5db'}
                    fill={index < rating ? '#facc15' : 'none'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.inputWrapper, { borderColor: themeColors.textSecondary }]}>
              <TextInput
                style={[styles.commentInput, { color: themeColors.textPrimary }]}
                placeholder="Nhập đánh giá của bạn..."
                placeholderTextColor={themeColors.textTertiary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity style={styles.submitIcon} onPress={handleAddComment}>
                <Send size={20} color={themeColors.iconPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.commentsContainer}>
            {comments.length === 0 ? (
              <Text style={[styles.noComments, { color: themeColors.textTertiary }]}>Chưa có đánh giá nào.</Text>
            ) : (
              comments.map(comment => (
                <View
                  key={comment.maBinhLuan}
                  style={[styles.comment, { backgroundColor: isDarkMode ? '#2D3748' : '#F7FAFC' }]}
                >
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthorContainer}>
                      {comment.hinhAnh ? (
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${comment.hinhAnh}` }}
                          style={styles.commentAvatar}
                        />
                      ) : (
                        <View style={[styles.commentAvatar, styles.placeholderAvatar]}>
                          <Text style={[styles.placeholderText, { color: themeColors.textSecondary }]}>
                            {comment.hoTen?.charAt(0)?.toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.commentAuthor, { color: themeColors.textPrimary }]}>{comment.hoTen}</Text>
                    </View>
                    {comment.maNguoiDung === userData?.maNguoiDung && (
                      <TouchableOpacity onPress={() => handleDeleteComment(comment.maBinhLuan)}>
                        <Trash2 size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.commentMeta}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        size={16}
                        color={index < comment.danhGia ? '#facc15' : '#d1d5db'}
                        fill={index < comment.danhGia ? '#facc15' : 'none'}
                      />
                    ))}
                    <Text style={[styles.commentDate, { color: themeColors.textTertiary }]}>
                      {new Date(comment.ngayBinhLuan).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.commentText, { color: themeColors.textPrimary }]}>{comment.noiDungBinhLuan}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    marginVertical: 20,
  },

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
    height: 200,
  },
  content: {
    padding: 24,
  },
  name: {
    fontSize: 24,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
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
  commentForm: {
    marginBottom: 24,
  },
  ratingInput: {
    flexDirection: "row",
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  commentInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
  },
  submitIcon: {
    marginLeft: 8,
  },
  commentsContainer: {
    marginBottom: 24,
  },
  comment: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAuthorContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  placeholderAvatar: {
    backgroundColor: "#A0AEC0",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentDate: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginLeft: 8,
  },
  commentText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
  },
  noComments: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
});