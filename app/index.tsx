import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";

const COLORS = {
  bg: "#0D0D0D",
  surface: "#181818",
  surfaceHover: "#222222",
  border: "#2A2A2A",
  red: "#E50914",
  textPrimary: "#FFFFFF",
  textSecondary: "#9E9E9E",
  folderIcon: "#FFB300",
};

// Define our hardcoded servers/categories
const CATEGORIES = [
  {
    id: "english",
    title: "English Movies",
    href: "/DHAKA-FLIX-7/English%20Movies/",
  },
  {
    id: "hindi",
    title: "Hindi Movies",
    href: "/DHAKA-FLIX-14/Hindi%20Movies/",
  },
  {
    id: "bangla",
    title: "Kolkata Bangla Movies",
    href: "/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/",
  },
  {
    id: "foreign",
    title: "Foreign Language Movies",
    href: "/DHAKA-FLIX-7/Foreign%20Language%20Movies/",
  },
  { id: "3d", title: "3D Movies", href: "/DHAKA-FLIX-7/3D%20Movies/" },
  {
    id: "animation",
    title: "Animation Movies",
    href: "/DHAKA-FLIX-14/Animation%20Movies/",
  },
  {
    id: "south_indian",
    title: "South Indian Movies",
    href: "/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/",
  },
  {
    id: "south_dubbed",
    title: "South-Movie Hindi Dubbed",
    href: "/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const handlePress = useCallback((href: string) => {
    // Strip trailing slash if present for building the expo route path
    let navPath = href.startsWith("/") ? href.slice(1) : href;
    navPath = navPath.replace(/\/$/, "");

    router.push({
      pathname: `/browse/${navPath}`,
      params: { rawHref: href },
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: (typeof CATEGORIES)[0] }) => (
      <Pressable
        style={({ pressed }) => [
          styles.itemContainer,
          pressed && styles.itemPressed,
        ]}
        onPress={() => handlePress(item.href)}
        android_ripple={{ color: "rgba(229,9,20,0.15)", borderless: false }}
      >
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: COLORS.folderIcon + "22" },
          ]}
        >
          <MaterialCommunityIcons
            name="folder-multiple"
            size={26}
            color={COLORS.folderIcon}
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemSubtitle}>FTP Directory</Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={COLORS.textSecondary}
        />
      </Pressable>
    ),
    [handlePress],
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Sam Online</Text>
        <Text style={styles.headerSubtitle}>Choose a category to browse</Text>
      </View>

      <FlashList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        estimatedItemSize={78}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#111111",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.red,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemPressed: {
    backgroundColor: COLORS.surfaceHover,
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
