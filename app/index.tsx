import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Image, TouchableOpacity } from "react-native";
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
};

// Hardcoded categories. Add `posterUrl` to manually set the poster for each category!
const CATEGORIES = [
  {
    id: "english",
    title: "English Movies",
    href: "/DHAKA-FLIX-7/English%20Movies/",
    posterUrl:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "hindi",
    title: "Hindi Movies",
    href: "/DHAKA-FLIX-14/Hindi%20Movies/",
    posterUrl:
      "https://images.unsplash.com/photo-1570534279782-b7e2cc4a34b4?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "bangla",
    title: "Kolkata Bangla Movies",
    href: "/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/",
    posterUrl:
      "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "foreign",
    title: "Foreign Language Movies",
    href: "/DHAKA-FLIX-7/Foreign%20Language%20Movies/",
    posterUrl: null,
  },
  {
    id: "3d",
    title: "3D Movies",
    href: "/DHAKA-FLIX-7/3D%20Movies/",
    posterUrl: null,
  },
  {
    id: "animation",
    title: "Animation Movies",
    href: "/DHAKA-FLIX-14/Animation%20Movies/",
    posterUrl:
      "https://images.unsplash.com/photo-1580477667995-15608401ed8a?q=80&w=600&auto=format&fit=crop",
  },
  {
    id: "south_indian",
    title: "South Indian Movies",
    href: "/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/",
    posterUrl: null,
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const handlePress = useCallback((href: string) => {
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
      >
        {item.posterUrl ? (
          <Image source={{ uri: item.posterUrl }} style={styles.posterImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialCommunityIcons
              name="folder-play-outline"
              size={32}
              color={COLORS.textSecondary}
            />
          </View>
        )}

        <View style={styles.gradientOverlay}>
          <Text style={styles.itemTitle}>{item.title}</Text>
        </View>
      </Pressable>
    ),
    [handlePress],
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, flexDirection: 'row', alignItems: 'center' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            SAM<Text style={{ color: COLORS.red }}>FLIX</Text>
          </Text>
          <Text style={styles.headerSubtitle}>Select a category to explore</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.searchBtn}>
          <MaterialCommunityIcons name="magnify" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <FlashList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        estimatedItemSize={160}
        numColumns={2}
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
    paddingBottom: 16,
    backgroundColor: COLORS.bg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchBtn: {
    padding: 8,
    backgroundColor: COLORS.surfaceHover,
    borderRadius: 20,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
  itemContainer: {
    flex: 1,
    height: 160,
    marginHorizontal: 6,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  posterImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceHover,
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
