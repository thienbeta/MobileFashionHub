import { Stack } from 'expo-router';
import ThemeProvider from './context/theme';

export default function Layout() {
  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="_splash" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Login' }} />
        <Stack.Screen name="(auth)/register" options={{ title: 'Đăng ký', headerShown: true }} />
        <Stack.Screen name="(auth)/forgotpassword" options={{ title: 'Lấy lại mật khẩu', headerShown: true }} />
        <Stack.Screen name="(auth)/contact" options={{ title: 'Hỗ trợ', headerShown: true }} />
        <Stack.Screen name="(auth)/voucher" options={{ title: 'Voucher', headerShown: true }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}