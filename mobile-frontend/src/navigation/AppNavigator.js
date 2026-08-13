import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import PortfoliosScreen from "../screens/PortfoliosScreen";
import PortfolioDetailScreen from "../screens/PortfolioDetailScreen";
import MarketsScreen from "../screens/MarketsScreen";
import BlockchainScreen from "../screens/BlockchainScreen";
import AccountScreen from "../screens/AccountScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: "grid-outline",
  Portfolios: "briefcase-outline",
  Markets: "bar-chart-outline",
  Blockchain: "cube-outline",
  Account: "person-outline",
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#05070d",
    card: "#0d1526",
    text: "#f8fafc",
    border: "#1f2937",
    primary: "#6366f1",
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#818cf8",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          backgroundColor: "#0d1526",
          borderTopColor: "#1f2937",
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={TAB_ICONS[route.name]}
            size={size - 2}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Portfolios" component={PortfoliosScreen} />
      <Tab.Screen name="Markets" component={MarketsScreen} />
      <Tab.Screen name="Blockchain" component={BlockchainScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: "#0d1526" },
          headerTintColor: "#f8fafc",
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#05070d" },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PortfolioDetail"
          component={PortfolioDetailScreen}
          options={{ title: "Portfolio" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
