import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  deleteItem,
  listItems,
  searchItems,
  toggleFavorite,
} from "../db/repositories/items.repository";
import type { Item } from "../db/types";

export default function ItemDetailsScreen() {
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async (search?: string) => {
    setLoading(true);
    const result = search?.trim()
      ? await searchItems(search.trim())
      : await listItems();
    if (result.ok) setItems(result.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    load(query);
  }, [query]);

  const handleToggleFavorite = async (item: Item) => {
    setBusyId(item.id);
    const result = await toggleFavorite(item.id, !item.favorite);
    if (!result.ok) Alert.alert("Error", result.error);
    else await load(query);
    setBusyId(null);
  };

  const handleDelete = (item: Item) => {
    Alert.alert("Delete Item", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteItem(item.id);
          if (!result.ok) Alert.alert("Error", result.error);
          else await load(query);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Shopping App</Text>
          <Text style={styles.title}>Items</Text>
          <Text style={styles.subtitle}>Browse and manage your saved items.</Text>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search items..."
          style={styles.searchInput}
          placeholderTextColor="#8C8C81"
          clearButtonMode="while-editing"
        />

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading items...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No items found</Text>
                <Text style={styles.emptyText}>
                  Items are created when you add them to a shopping session.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.favorite && (
                      <Text style={styles.favoriteBadge}>★ Favorite</Text>
                    )}
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable
                      style={[
                        styles.actionButton,
                        item.favorite && styles.favoriteActive,
                      ]}
                      onPress={() => handleToggleFavorite(item)}
                      disabled={busyId === item.id}
                    >
                      <Text style={styles.actionButtonText}>
                        {item.favorite ? "★" : "☆"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(item)}
                      disabled={busyId === item.id}
                    >
                      <Text style={styles.actionButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        <Pressable style={styles.backButton} onPress={() => router.push("/home-screen")}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7F2" },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  header: { gap: 6, paddingTop: 10, marginBottom: 14 },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6B6B63",
  },
  title: { fontSize: 34, fontWeight: "800", color: "#111111" },
  subtitle: { fontSize: 15, lineHeight: 21, color: "#4E4E46" },
  searchInput: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7D3C7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#111111",
    marginBottom: 14,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: { fontSize: 14, color: "#5B5B53" },
  listContent: { gap: 10, paddingBottom: 16 },
  emptyState: { paddingVertical: 28, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, color: "#5B5B53" },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E4DA",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#111111" },
  favoriteBadge: { fontSize: 12, color: "#B07D2A", fontWeight: "700" },
  itemActions: { flexDirection: "row", gap: 8 },
  actionButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteActive: { backgroundColor: "#FFF3CD" },
  deleteButton: { backgroundColor: "#F5DDD8" },
  actionButtonText: { fontSize: 13, fontWeight: "700", color: "#111111" },
  backButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  backButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
