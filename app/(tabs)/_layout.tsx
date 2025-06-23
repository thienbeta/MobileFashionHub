import { Tabs } from 'expo-router';
import { Chrome as Home, ShoppingBag, List, Settings, QrCode } from 'lucide-react-native';
import { useTheme } from '../context/theme';

export default function TabLayout() {
  const { theme } = useTheme();

  const isDarkMode =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1A202C' : '#fff',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#9F7AEA',
        tabBarInactiveTintColor: isDarkMode ? '#A0AEC0' : '#718096',
        tabBarLabelStyle: {
          fontFamily: 'Poppins_400Regular',
          fontSize: 12,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang Chủ',
          tabBarLabel: 'Trang Chủ',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products/index"
        options={{
          title: 'Sản Phẩm',
          tabBarLabel: 'Sản Phẩm',
          tabBarIcon: ({ color, size }) => <List size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="copycart/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="copycart/copysupport"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="combos/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="cartSupport/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="orderHistory"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="combos/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Quét QR',
          tabBarLabel: 'Quét QR',
          tabBarIcon: ({ color, size }) => <QrCode size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Giỏ Hàng',
          tabBarLabel: 'Giỏ Hàng',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài Đặt',
          tabBarLabel: 'Cài Đặt',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="blogs/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="blogs/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}