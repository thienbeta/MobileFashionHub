import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Search, ArrowRight, Zap, TrendingUp, FileText, Percent } from "lucide-react-native";
import { useTheme } from "../context/theme";
import { Appearance } from "react-native";
import { colors } from "../style/themeColors";
import { useRouter } from "expo-router";
import axios from "axios";

const API_BASE_URL = "http://192.168.43.163:5261/api";

interface CategoryFromAPI {
  maLoaiSanPham: number;
  tenLoaiSanPham: string;
  kiHieu: string;
  trangThai: number;
  hinhAnh: string;
}

interface ProductFromAPI {
  id: string;
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

interface ComboFromAPI {
  maCombo: number;
  name: string;
  hinhAnh: string;
  ngayTao: string;
  trangThai: number;
  sanPhams: ProductFromAPI[];
  moTa: string;
  gia: number;
  soLuong: number;
}

interface BlogFromAPI {
  maBlog: number;
  tieuDe: string;
  noiDung: string;
  slug: string | null;
  hinhAnh: string | null;
  ngayTao: string;
}

interface Category {
  name: string;
  kiHieu: string;
  image: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  isNew: boolean;
  type: "product";
}

interface Combo {
  id: number;
  name: string;
  price: number;
  image: string;
  type: "combo";
}

interface Blog {
  id: number;
  title: string;
  image: string;
  date: string;
  type: "blog";
}

interface SearchResult {
  id: string | number;
  name?: string;
  title?: string;
  image: string;
  type: "product" | "combo" | "blog";
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const isDarkMode =
    theme === "dark" ||
    (theme === "system" &&
      (Appearance.getColorScheme() === "dark" || Appearance.getColorScheme() === null));
  const themeColors = isDarkMode ? colors.dark : colors.light;

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesData = await axios.get<CategoryFromAPI[]>(
          `${API_BASE_URL}/LoaiSanPham`
        );
        if (!categoriesData.data) throw new Error("Không có dữ liệu danh mục");
        const activeCategories = categoriesData.data.filter(
          (item) => item.trangThai === 1
        );
        const uniqueCategories = activeCategories.reduce((acc, item) => {
          if (!acc.some((cat) => cat.kiHieu === item.kiHieu)) {
            acc.push({
              name: item.tenLoaiSanPham,
              kiHieu: item.kiHieu,
              image: item.hinhAnh.startsWith("http")
                ? item.hinhAnh
                : item.hinhAnh
                  ? `data:image/png;base64,${item.hinhAnh}`
                  : "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500",
            });
          }
          return acc;
        }, [] as Category[]);
        setCategories(uniqueCategories);

        const productsData = await axios.get<ProductFromAPI[]>(
          `${API_BASE_URL}/SanPham/ListSanPham`
        );
        if (!productsData.data) throw new Error("Không có dữ liệu sản phẩm");
        setFeaturedProducts(
          productsData.data.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.donGia,
            image: product.hinh[0]?.startsWith("http")
              ? product.hinh[0]
              : product.hinh[0]
                ? `data:image/png;base64,${product.hinh[0]}`
                : "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=500",
            isNew: new Date(product.ngayTao) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            type: "product",
          }))
        );

        const combosData = await axios.get<ComboFromAPI[]>(
          `${API_BASE_URL}/Combo/ComboSanPhamView`
        );
        if (!combosData.data) throw new Error("Không có dữ liệu combo");
        setCombos(
          combosData.data.map((combo) => ({
            id: combo.maCombo,
            name: combo.name,
            price: combo.gia,
            image: combo.hinhAnh?.startsWith("http")
              ? combo.hinhAnh
              : combo.hinhAnh
                ? `data:image/png;base64,${combo.hinhAnh}`
                : "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500",
            type: "combo",
          }))
        );

        const blogsData = await axios.get<BlogFromAPI[]>(`${API_BASE_URL}/Blog`);
        if (!blogsData.data) throw new Error("Không có dữ liệu blog");
        setBlogs(
          blogsData.data.map((blog) => ({
            id: blog.maBlog,
            title: blog.tieuDe,
            image: blog.hinhAnh?.startsWith("http")
              ? blog.hinhAnh
              : blog.hinhAnh
                ? `data:image/png;base64,${blog.hinhAnh}`
                : "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500",
            date: new Date(blog.ngayTao).toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }),
            type: "blog",
          }))
        );
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    const allItems = [
      ...featuredProducts.map((p) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        type: p.type,
      })),
      ...combos.map((c) => ({
        id: c.id.toString(),
        name: c.name,
        image: c.image,
        type: c.type,
      })),
      ...blogs.map((b) => ({
        id: b.id.toString(),
        title: b.title,
        image: b.image,
        type: b.type,
      })),
    ] as SearchResult[];

    const results = allItems.filter((item) =>
      (item.name?.toLowerCase().includes(query.toLowerCase()) || item.title?.toLowerCase().includes(query.toLowerCase()))
    );
    setSearchResults(results);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Text style={{ color: themeColors.textPrimary }}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background }]}>
        <Text style={{ color: themeColors.textPrimary, textAlign: "center", padding: 20 }}>
          Error: {error}
        </Text>
        <Text style={{ color: themeColors.textSecondary, textAlign: "center" }}>
          Vui lòng kiểm tra kết nối mạng hoặc xác thực với ngrok bằng cách mở URL API trong trình
          duyệt.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: "https://intphcm.com/data/upload/banner-thoi-trang-tuoi.jpg" }}
          style={styles.heroBackground}
        />
        <View style={[styles.heroOverlay, { backgroundColor: themeColors.heroOverlay }]}>
          <Text style={[styles.heroTag, { backgroundColor: themeColors.heroTag }]}>Bộ sưu tập mùa hè 2025</Text>
          <Text style={styles.heroTitle}>Khám phá phong cách hoàn hảo của bạn</Text>
          <Text style={styles.heroSubtitle}>
            Khám phá bộ sưu tập được tuyển chọn của chúng tôi về các xu hướng thời trang mới nhất
          </Text>
          <TouchableOpacity style={styles.heroButton} onPress={() => router.push("/products")}>
            <Text style={[styles.heroButtonText, { color: themeColors.iconPrimary }]}>Mua sắm ngay</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: themeColors.secondaryBackground }]}>
        <Search size={20} color={themeColors.iconSecondary} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.textPrimary }]}
          placeholder="Tìm kiếm..."
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {searchResults.length > 0 && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Kết quả tìm kiếm</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.searchCard}
                onPress={() => {
                  if (item.type === "product") router.push(`/products/${item.id}`);
                  else if (item.type === "combo") router.push({ pathname: "/(tabs)/combos/[id]", params: { id: item.id } });
                  else if (item.type === "blog") router.push(`/blogs/${item.id}`);
                }}
              >
                <Image source={{ uri: item.image }} style={styles.searchImage} />
                <View style={styles.searchOverlay}>
                  <Text style={[styles.searchText, { color: themeColors.textPrimary }]}>
                    {item.name || item.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Danh mục</Text>
          <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push("/products")}>
            <Text style={[styles.viewAllText, { color: themeColors.iconPrimary }]}>Xem tất cả</Text>
            <ArrowRight size={16} color={themeColors.iconPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={styles.categoryCard}
              onPress={() => router.push(`/products?category=${category.kiHieu}`)}
            >
              <Image source={{ uri: category.image }} style={styles.categoryImage} />
              <View style={[styles.categoryOverlay, { backgroundColor: themeColors.categoryOverlay }]}>
                <Text style={[styles.categoryText, { color: isDarkMode ? "#000" : "#fff" }]}>
                  {category.name}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Zap size={20} color="#FFD700" />
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Sản phẩm nổi bật</Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
          Khám phá bộ sưu tập các mặt hàng phải có được chúng tôi tuyển chọn kỹ lưỡng
        </Text>
        <View style={styles.productsGrid}>
          {featuredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => router.push(`/products/${product.id}`)}
            >
              <Image source={{ uri: product.image }} style={styles.productImage} />
              <Text style={[styles.productName, { color: themeColors.textPrimary }]}>{product.name}</Text>
              <Text style={[styles.productPrice, { color: themeColors.iconPrimary }]}>
                {(product.price / 1000).toFixed(3)} VND
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <TrendingUp size={20} color={themeColors.iconPrimary} />
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Combo hot</Text>
        </View>
        <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
          Xem ngay các ưu đãi kết hợp phổ biến của chúng tôi
        </Text>
        <View style={styles.productsGrid}>
          {combos.map((combo) => (
            <TouchableOpacity
              key={combo.id}
              style={styles.productCard}
              onPress={() =>
                router.push({ pathname: "/(tabs)/combos/[id]", params: { id: combo.id } })
              }
            >
              <Image source={{ uri: combo.image }} style={styles.productImage} />
              <Text style={[styles.productName, { color: themeColors.textPrimary }]}>{combo.name}</Text>
              <Text style={[styles.productPrice, { color: themeColors.iconPrimary }]}>
                {(combo.price / 1000).toFixed(3)} VND
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FileText size={20} color={themeColors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
              Bài viết mới
            </Text>
          </View>
          <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push("/blogs")}>
            <Text style={[styles.viewAllText, { color: themeColors.iconPrimary }]}>Xem tất cả</Text>
            <ArrowRight size={16} color={themeColors.iconPrimary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
          Khám phá các bài viết mới nhất từ đội ngũ của chúng tôi
        </Text>
        <View style={styles.productsGrid}>
          {blogs.map((blog) => (
            <TouchableOpacity
              key={blog.id}
              style={styles.productCard}
              onPress={() => router.push(`/blogs/${blog.id}`)}
            >
              <Image source={{ uri: blog.image }} style={styles.productImage} />
              <Text style={[styles.productName, { color: themeColors.textPrimary }]}>{blog.title}</Text>
              <Text style={[styles.productDate, { color: themeColors.textSecondary }]}>
                {blog.date}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={[styles.bannerContainer, { backgroundColor: themeColors.bannerBackground }]}>
        <View style={styles.bannerTextContainer}>
          <Text
            style={[styles.bannerTag, { backgroundColor: themeColors.iconPrimary, color: isDarkMode ? "#000" : "#fff" }]}
          >
            Ưu đãi đặc biệt
          </Text>
          <Text style={[styles.bannerTitle, { color: themeColors.textPrimary }]}>Lên đến 50%</Text>
          <Text style={[styles.bannerSubtitle, { color: themeColors.textTertiary }]}>
            Khuyến mãi có thời hạn cho bộ sưu tập mùa hè của chúng tôi
          </Text>
          <TouchableOpacity
            style={[styles.bannerButton, { backgroundColor: themeColors.iconPrimary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => router.push("/(auth)/voucher")}
          >
            <Percent size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.bannerButtonText}>Khuyến mãi</Text>
          </TouchableOpacity>
        </View>
        <Image
          source={{ uri: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80" }}
          style={styles.bannerImage}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroContainer: {
    height: 400,
    position: "relative",
  },
  heroBackground: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  heroTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 12,
    color: "#fff",
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 16,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  heroButtonText: {
    fontWeight: "500",
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 24,
    padding: 12,
    borderRadius: 12,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
  },
  searchCard: {
    width: 120,
    height: 160,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  searchImage: {
    width: "100%",
    height: "70%",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  searchOverlay: {
    padding: 8,
    backgroundColor: "#fff",
  },
  searchText: {
    fontSize: 14,
    fontWeight: "500",
  },
  searchPrice: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchDate: {
    fontSize: 12,
  },
  sectionContainer: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  viewAllText: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryCard: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },
  categoryText: {
    fontWeight: "500",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  productCard: {
    width: "50%",
    padding: 12,
  },
  productImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: "500",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  productDate: {
    fontSize: 12,
  },
  bannerContainer: {
    margin: 24,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
  },
  bannerTextContainer: {
    flex: 1,
    padding: 24,
  },
  bannerTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  bannerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  bannerButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  bannerImage: {
    width: 150,
    height: 200,
  },
});