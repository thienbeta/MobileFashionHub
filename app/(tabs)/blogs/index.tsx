import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/theme";
import { Search, SlidersHorizontal } from "lucide-react-native";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../../src/utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import debounce from "lodash.debounce";

interface Blog {
  maBlog: number;
  tieuDe: string;
  noiDung: string;
  slug: string | null;
  hinhAnh: string | null;
  ngayTao: string;
}

type SortOrder = "newest" | "oldest" | "title-asc" | "title-desc";

export default function BlogsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const [originalBlogs, setOriginalBlogs] = useState<Blog[]>([]);
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE_URL = "http://192.168.10.32:5261";

  const debouncedSetSearchQuery = useCallback(
    debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch(`${API_BASE_URL}/api/Blog`, "Blogs");
      if (!Array.isArray(response)) {
        throw new Error("Dữ liệu blog không hợp lệ");
      }
      setOriginalBlogs(response);
      setFilteredBlogs(response);
    } catch (err) {
      console.error("Error fetching blogs:", err);
      setError(
        "Không thể tải danh sách blog. Vui lòng kiểm tra kết nối hoặc thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const savedFilters = await AsyncStorage.getItem("blogFilters");
        if (savedFilters) {
          const { searchQuery, sortOrder } = JSON.parse(savedFilters);
          setSearchQuery(searchQuery || "");
          setSortOrder(sortOrder || "newest");
        }
      } catch (err) {
        console.error("Error loading filters:", err);
      }
    };
    loadFilters();
    fetchBlogs();
  }, []);

  useEffect(() => {
    const saveFilters = async () => {
      try {
        await AsyncStorage.setItem(
          "blogFilters",
          JSON.stringify({ searchQuery, sortOrder })
        );
      } catch (err) {
        console.error("Error saving filters:", err);
      }
    };
    saveFilters();
  }, [searchQuery, sortOrder]);

  useEffect(() => {
    let result = [...originalBlogs];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (blog) =>
          blog.tieuDe.toLowerCase().includes(query) ||
          (blog.noiDung && blog.noiDung.toLowerCase().includes(query))
      );
    }
    switch (sortOrder) {
      case "newest":
        result.sort(
          (a, b) => new Date(b.ngayTao).getTime() - new Date(a.ngayTao).getTime()
        );
        break;
      case "oldest":
        result.sort(
          (a, b) => new Date(a.ngayTao).getTime() - new Date(b.ngayTao).getTime()
        );
        break;
      case "title-asc":
        result.sort((a, b) => a.tieuDe.localeCompare(b.tieuDe));
        break;
      case "title-desc":
        result.sort((a, b) => b.tieuDe.localeCompare(a.tieuDe));
        break;
    }
    setFilteredBlogs(result);
  }, [searchQuery, sortOrder, originalBlogs]);

  const clearFilters = () => {
    setSearchQuery("");
    setSortOrder("newest");
    setShowFilters(false);
  };

  const renderBlog = ({ item }: { item: Blog }) => {
    const formattedDate = new Date(item.ngayTao).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return (
      <TouchableOpacity
        style={styles.blogCard}
        onPress={() => router.push(`/blogs/${item.maBlog}`)}
      >
        <Image
          source={{
            uri: item.hinhAnh?.startsWith("http")
              ? item.hinhAnh
              : item.hinhAnh
              ? `data:image/jpeg;base64,${item.hinhAnh}`
              : "https://via.placeholder.com/150",
          }}
          style={styles.blogImage}
          resizeMode="cover"
        />
        <View style={[styles.blogInfo, isDarkMode && styles.blogInfoDark]}>
          <Text
            style={[styles.blogTitle, isDarkMode && styles.textDark]}
            numberOfLines={2}
          >
            {item.tieuDe}
          </Text>
          <Text style={[styles.blogDate, isDarkMode && styles.textDark]}>
            {formattedDate}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? "#1A202C" : "#fff" }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, isDarkMode && styles.textDark]}>
           
          </Text>
        </View>
        <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
          <Search size={20} color={isDarkMode ? "#A0AEC0" : "#718096"} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChangeText={debouncedSetSearchQuery}
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
            disabled={loading}
          >
            <SlidersHorizontal size={20} color={isDarkMode ? "#A0AEC0" : "#718096"} />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={[styles.filterContainer, isDarkMode && styles.filterContainerDark]}>
            <Text style={[styles.filterTitle, isDarkMode && styles.textDark]}>
              Sắp xếp theo
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 8 }}>
              {[
                { label: "Mới nhất", value: "newest" },
                { label: "Cũ nhất", value: "oldest" },
                { label: "Tiêu đề A-Z", value: "title-asc" },
                { label: "Tiêu đề Z-A", value: "title-desc" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterButton,
                    sortOrder === option.value && styles.filterButtonActive,
                  ]}
                  onPress={() => {
                    setSortOrder(option.value as SortOrder);
                    setShowFilters(false);
                  }}
                >
                  <Text style={[styles.filterButtonText, isDarkMode && styles.textDark]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.clearButton, isDarkMode && styles.clearButtonDark]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearButtonText, isDarkMode && styles.textDark]}>
                Xóa bộ lọc
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, isDarkMode && styles.textDark]}>{error}</Text>
          <TouchableOpacity onPress={fetchBlogs} style={styles.retryButton}>
            <Text style={[styles.retryText, isDarkMode && styles.textDark]}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? "#fff" : "#9F7AEA"} />
        </View>
      ) : filteredBlogs.length > 0 ? (
        <FlatList
          data={filteredBlogs}
          renderItem={renderBlog}
          keyExtractor={(item) => item.maBlog.toString()}
          numColumns={2}
          contentContainerStyle={styles.blogGrid}
          columnWrapperStyle={styles.columnWrapper}
          ListFooterComponent={<View style={{ height: 16 }} />}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
            Không tìm thấy blog nào.
          </Text>
          <Text style={[styles.emptySubText, isDarkMode && styles.textDark]}>
            Hãy thử thay đổi tiêu chí tìm kiếm hoặc bộ lọc.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
  },
  headerTitleContainer: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D3748",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7FAFC",
    borderRadius: 8,
    padding: 8,
  },
  searchContainerDark: {
    backgroundColor: "#2D3748",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#718096",
    fontSize: 16,
  },
  searchInputDark: {
    color: "#A0AEC0",
  },
  filterButton: {
    padding: 8,
  },
  filterButtonActive: {
    backgroundColor: "#9F7AEA",
    borderRadius: 12,
  },
  filterContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  filterContainerDark: {
    backgroundColor: "#2D3748",
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2D3748",
    marginBottom: 8,
  },
  filterButtonText: {
    color: "#718096",
    fontSize: 14,
  },
  blogGrid: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  blogCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  blogImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  blogInfo: {
    padding: 8,
    backgroundColor: "#fff",
  },
  blogInfoDark: {
    backgroundColor: "#2D3748",
  },
  blogTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2D3748",
  },
  blogDate: {
    fontSize: 12,
    color: "#718096",
    marginTop: 4,
  },
  textDark: {
    color: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#2D3748",
    textAlign: "center",
    marginBottom: 8,
  },
  retryButton: {
    padding: 8,
    backgroundColor: "#9F7AEA",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#718096",
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginTop: 8,
  },
  clearButton: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#718096",
    borderRadius: 8,
    alignItems: "center",
  },
  clearButtonDark: {
    borderColor: "#A0AEC0",
  },
  clearButtonText: {
    color: "#718096",
    fontSize: 14,
  },
});