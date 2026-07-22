import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { deleteItem, listItems, toggleFavorite } from "../db/repositories/items.repository";
import { listPriceHistoryForItem } from "../db/repositories/store-items.repository";
import type { Item } from "../db/types";

type PriceHistoryRow = {
  storeId: number;
  storeName: string;
  latestPrice: number;
  updatedAt: string;
};

type ItemWithPrice = Item & {
  cheapestPrice: number | null;
  storeCount: number;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number): string {
  return `P${value.toFixed(2)}`;
}

export default function ItemDetailsScreen() {
  const router = useRouter();

  const [items, setItems] = useState<ItemWithPrice[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  // Sheet state
  const [sheetItem, setSheetItem] = useState<ItemWithPrice | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return items;
    return items.filter((item) => item.name.toLowerCase().includes(search));
  }, [items, query]);

  const priceSummary = useMemo(() => {
    if (priceHistory.length === 0) {
      return { latestPrice: null, cheapestPrice: null, averagePrice: null, storeCount: 0 };
    }
    const prices = priceHistory.map((r) => r.latestPrice);
    return {
      latestPrice: priceHistory[0].latestPrice,
      cheapestPrice: Math.min(...prices),
      averagePrice: prices.reduce((s, p) => s + p, 0) / prices.length,
      storeCount: new Set(priceHistory.map((r) => r.storeId)).size,
    };
  }, [priceHistory]);

  const loadItems = async () => {
    setLoadingItems(true);
    const result = await listItems();

    if (!result.ok) {
      setItems([]);
      setLoadingItems(false);
      return;
    }

    // Fetch cheapest price for each item in parallel
    const enriched = await Promise.all(
      result.data.map(async (item) => {
        const ph = await listPriceHistoryForItem(item.id);
        if (!ph.ok || ph.data.length === 0) {
          return { ...item, cheapestPrice: null, storeCount: 0 };
        }
        const prices = ph.data.map((r) => r.latestPrice);
        return {
          ...item,
          cheapestPrice: Math.min(...prices),
          storeCount: new Set(ph.data.map((r) => r.storeId)).size,
        };
      })
    );

    setItems(enriched);
    setLoadingItems(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openSheet = async (item: ItemWithPrice) => {
    setSheetItem(item);
    setPriceHistory([]);
    setLoadingHistory(true);
    const result = await listPriceHistoryForItem(item.id);
    setPriceHistory(result.ok ? result.data : []);
    setLoadingHistory(false);
  };

  const closeSheet = () => {
    setSheetItem(null);
    setPriceHistory([]);
  };

  const handleToggleFavorite = async (item: ItemWithPrice) => {
    setBusyId(item.id);
    const result = await toggleFavorite(item.id, !item.favorite);
    if (!result.ok) {
      Alert.alert("Error", result.error);
    } else {
      await loadItems();
      // Refresh sheetItem if it's the same one
      if (sheetItem?.id === item.id) {
        setSheetItem((prev) => prev ? { ...prev, favorite: !prev.favorite } : prev);
      }
    }
    setBusyId(null);
  };

  const handleDelete = (item: ItemWithPrice) => {
    Alert.alert("Delete Item", `Delete "${item.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteItem(item.id);
          if (!result.ok) {
            Alert.alert("Error", result.error);
            return;
          }
          closeSheet();
          await loadItems();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Shopping App</Text>
          <Text style={styles.title}>Items</Text>
          <Text style={styles.subtitle}>Tap an item to see its store prices.</Text>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search items..."
          style={styles.searchInput}
          placeholderTextColor="#8C8C81"
          clearButtonMode="while-editing"
        />

        <View style={styles.sectionSpacing}>
          <Text style={styles.sectionTitle}>Item List</Text>

          {loadingItems ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading items...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No items found</Text>
              <Text style={styles.emptyText}>
                Items appear here after you add them to a shopping session.
              </Text>
            </View>
          ) : (
            <View style={styles.listContent}>
              {filteredItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => openSheet(item)}
                >
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <View style={styles.itemNameRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.favorite ? <Text style={styles.favStar}>★</Text> : null}
                      </View>
                      <Text style={styles.itemMeta}>
                        {item.storeCount > 0
                          ? `${item.storeCount} store${item.storeCount > 1 ? "s" : ""} tracked`
                          : "No price data yet"}
                      </Text>
                    </View>

                    <View style={styles.itemPriceBlock}>
                      {item.cheapestPrice !== null ? (
                        <>
                          <Text style={styles.itemPrice}>{formatMoney(item.cheapestPrice)}</Text>
                          <Text style={styles.itemPriceLabel}>lowest</Text>
                        </>
                      ) : (
                        <Text style={styles.itemPriceDash}>—</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable style={styles.backButton} onPress={() => router.push("/home-screen")}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>

      {/* Price History Bottom Sheet */}
      <Modal visible={sheetItem !== null} transparent animationType="slide" onRequestClose={closeSheet}>
        <Pressable style={styles.sheetOverlay} onPress={closeSheet} />
        <View style={styles.sheetContainer}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={styles.sheetTitle}>{sheetItem?.name}</Text>
                <Text style={styles.sheetSubtitle}>Store-specific pricing history</Text>
              </View>
              <Text style={styles.sheetBadge}>{priceHistory.length} stores</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>
                  {priceSummary.latestPrice !== null ? formatMoney(priceSummary.latestPrice) : "—"}
                </Text>
                <Text style={styles.statLabel}>Latest</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, styles.statGreen]}>
                  {priceSummary.cheapestPrice !== null ? formatMoney(priceSummary.cheapestPrice) : "—"}
                </Text>
                <Text style={styles.statLabel}>Cheapest</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>
                  {priceSummary.averagePrice !== null ? formatMoney(priceSummary.averagePrice) : "—"}
                </Text>
                <Text style={styles.statLabel}>Average</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statValue}>{priceSummary.storeCount}</Text>
                <Text style={styles.statLabel}>Stores</Text>
              </View>
            </View>

            {/* Price Timeline */}
            <Text style={styles.subsectionTitle}>Price by store</Text>

            {loadingHistory ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading prices...</Text>
              </View>
            ) : priceHistory.length === 0 ? (
              <View style={styles.emptyInline}>
                <Text style={styles.emptyTitle}>No price history yet</Text>
                <Text style={styles.emptyText}>
                  Record a store price in the Stores screen to build history.
                </Text>
              </View>
            ) : (
              priceHistory.map((row) => (
                <View key={`${row.storeId}-${row.updatedAt}`} style={styles.historyRow}>
                  <View style={styles.historyCopy}>
                    <Text style={styles.rowTitle}>{row.storeName}</Text>
                    <Text style={styles.rowMeta}>Updated {formatDate(row.updatedAt)}</Text>
                  </View>
                  <Text style={styles.rowValue}>{formatMoney(row.latestPrice)}</Text>
                </View>
              ))
            )}

            {/* Actions */}
            <View style={styles.sheetActions}>
              <Pressable
                style={[styles.sheetActionBtn, sheetItem?.favorite && styles.favActive]}
                onPress={() => sheetItem && handleToggleFavorite(sheetItem)}
                disabled={busyId === sheetItem?.id}
              >
                <Text style={styles.sheetActionText}>
                  {sheetItem?.favorite ? "★  Unfavorite" : "☆  Favorite"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.sheetActionBtn, styles.deleteBtn]}
                onPress={() => sheetItem && handleDelete(sheetItem)}
                disabled={busyId === sheetItem?.id}
              >
                <Text style={styles.sheetActionText}>Delete Item</Text>
              </Pressable>
            </View>

            <Pressable style={styles.sheetDismiss} onPress={closeSheet}>
              <Text style={styles.sheetDismissText}>Close</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7F2" },
  screen: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, gap: 18 },
  header: { gap: 6, paddingTop: 10 },
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
  },
  sectionSpacing: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  subsectionTitle: { fontSize: 15, fontWeight: "800", color: "#111111", marginBottom: 4 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  loadingText: { fontSize: 14, color: "#5B5B53" },
  listContent: { gap: 10 },
  emptyState: { paddingVertical: 28, gap: 6 },
  emptyInline: { gap: 6, paddingVertical: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, color: "#5B5B53" },

  // Item card
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemInfo: { flex: 1, gap: 4 },
  itemNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#111111" },
  favStar: { fontSize: 14, color: "#E6A817" },
  itemMeta: { fontSize: 12, color: "#6B6B63" },
  itemPriceBlock: { alignItems: "flex-end", gap: 2 },
  itemPrice: { fontSize: 17, fontWeight: "900", color: "#111111", letterSpacing: -0.3 },
  itemPriceLabel: { fontSize: 11, fontWeight: "700", color: "#6B6B63", textTransform: "uppercase" },
  itemPriceDash: { fontSize: 18, color: "#C0BDB4", fontWeight: "700" },

  backButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  backButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },

  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "82%",
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7D3C7",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetContent: { paddingHorizontal: 24, paddingTop: 12, gap: 16 },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  sheetTitleBlock: { flex: 1, gap: 3 },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: "#111111" },
  sheetSubtitle: { fontSize: 13, color: "#6B6B63" },
  sheetBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111111",
    backgroundColor: "#F4F2E9",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBlock: {
    flex: 1,
    backgroundColor: "#F4F2E9",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 15, fontWeight: "900", color: "#111111", textAlign: "center" },
  statGreen: { color: "#2A7A3B" },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#6B6B63", textTransform: "uppercase" },

  // History rows
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEE9DF",
  },
  historyCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#111111" },
  rowMeta: { fontSize: 12, color: "#6B6B63" },
  rowValue: { fontSize: 15, fontWeight: "800", color: "#111111" },

  // Sheet actions
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  sheetActionBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  favActive: { backgroundColor: "#FFF3CD" },
  deleteBtn: { backgroundColor: "#F5DDD8" },
  sheetActionText: { fontSize: 14, fontWeight: "700", color: "#111111" },
  sheetDismiss: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetDismissText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
