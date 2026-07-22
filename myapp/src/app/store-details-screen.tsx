import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  createStore,
  deleteStore,
  listStores,
  updateStore,
} from "../db/repositories/stores.repository";
import { listItems } from "../db/repositories/items.repository";
import {
  listPricesByStore,
  upsertStoreItemPrice,
} from "../db/repositories/store-items.repository";
import { listShoppingSessions } from "../db/repositories/shopping-sessions.repository";
import type { Item, ShoppingSession, Store } from "../db/types";

type StorePriceRow = {
  itemId: number;
  itemName: string;
  latestPrice: number;
  updatedAt: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

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

export default function StoreDetailsScreen() {
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sessions, setSessions] = useState<ShoppingSession[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [storePrices, setStorePrices] = useState<StorePriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [priceInput, setPriceInput] = useState("");

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, stores]
  );

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const filteredItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(query));
  }, [itemQuery, items]);

  const selectedStoreSessions = useMemo(() => {
    if (!selectedStore) {
      return [];
    }

    return sessions.filter((session) => session.storeId === selectedStore.id).slice(0, 4);
  }, [selectedStore, sessions]);

  const storePriceSummary = useMemo(() => {
    const count = storePrices.length;

    if (count === 0) {
      return {
        averagePrice: 0,
        latestUpdate: null as string | null,
        latestItem: null as string | null,
      };
    }

    const total = storePrices.reduce((sum, row) => sum + row.latestPrice, 0);
    const latestRow = [...storePrices].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    )[0];

    return {
      averagePrice: total / count,
      latestUpdate: latestRow.updatedAt,
      latestItem: latestRow.itemName,
    };
  }, [storePrices]);

  const loadData = async () => {
    setLoading(true);

    const [storesResult, itemsResult, sessionsResult] = await Promise.all([
      listStores(),
      listItems(),
      listShoppingSessions(),
    ]);

    const nextStores = storesResult.ok ? storesResult.data : [];
    const nextItems = itemsResult.ok ? itemsResult.data : [];
    const nextSessions = sessionsResult.ok ? sessionsResult.data : [];

    setStores(nextStores);
    setItems(nextItems);
    setSessions(nextSessions);

    setSelectedStoreId((currentValue) => {
      if (currentValue && nextStores.some((store) => store.id === currentValue)) {
        return currentValue;
      }

      return nextStores[0]?.id ?? null;
    });

    setSelectedItemId((currentValue) => {
      if (currentValue && nextItems.some((item) => item.id === currentValue)) {
        return currentValue;
      }

      return nextItems[0]?.id ?? null;
    });

    setLoading(false);
  };

  const loadStorePrices = async (storeId: number) => {
    setPriceLoading(true);
    const result = await listPricesByStore(storeId);

    if (result.ok) {
      setStorePrices(result.data);
    } else {
      setStorePrices([]);
    }

    setPriceLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedStoreId) {
      setStorePrices([]);
      return;
    }

    loadStorePrices(selectedStoreId);
  }, [selectedStoreId]);

  const handleCreate = async () => {
    const trimmed = newName.trim();

    if (!trimmed) {
      Alert.alert("Missing name", "Enter a store name.");
      return;
    }

    setSaving(true);
    const result = await createStore(trimmed);
    setSaving(false);

    if (!result.ok) {
      Alert.alert("Error", result.error);
      return;
    }

    setNewName("");
    await loadData();
  };

  const handleStartEdit = (store: Store) => {
    setEditingId(store.id);
    setEditName(store.name);
  };

  const handleSaveEdit = async (id: number) => {
    const trimmed = editName.trim();

    if (!trimmed) {
      return;
    }

    const result = await updateStore(id, { name: trimmed });
    if (!result.ok) {
      Alert.alert("Error", result.error);
      return;
    }

    setEditingId(null);
    await loadData();
  };

  const handleDelete = (store: Store) => {
    Alert.alert("Delete Store", `Delete "${store.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const result = await deleteStore(store.id);
          if (!result.ok) {
            Alert.alert("Error", result.error);
            return;
          }

          await loadData();
        },
      },
    ]);
  };

  const handleSavePrice = async () => {
    if (!selectedStoreId) {
      Alert.alert("Missing store", "Create or select a store first.");
      return;
    }

    if (!selectedItemId) {
      Alert.alert("Missing item", "Pick an item to link to this store.");
      return;
    }

    const parsedPrice = Number(priceInput);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert("Invalid price", "Enter a valid price.");
      return;
    }

    setSavingPrice(true);
    const result = await upsertStoreItemPrice({
      storeId: selectedStoreId,
      itemId: selectedItemId,
      latestPrice: parsedPrice,
    });
    setSavingPrice(false);

    if (!result.ok) {
      Alert.alert("Error", result.error);
      return;
    }

    setPriceInput("");
    await loadStorePrices(selectedStoreId);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Shopping App</Text>
          <Text style={styles.title}>Stores</Text>
          <Text style={styles.subtitle}>Manage stores and record store-specific prices.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Add Store</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Store name"
            style={styles.input}
            placeholderTextColor="#8C8C81"
          />
          <Pressable
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={handleCreate}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>{saving ? "Adding..." : "Add Store"}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionSpacing}>
          <Text style={styles.sectionTitle}>Store List</Text>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading stores...</Text>
            </View>
          ) : stores.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No stores yet</Text>
              <Text style={styles.emptyText}>Add a store above to get started.</Text>
            </View>
          ) : (
            <View style={styles.listContent}>
              {stores.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.storeCard,
                    selectedStoreId === item.id && styles.storeCardActive,
                  ]}
                >
                  {editingId === item.id ? (
                    <View style={styles.editRow}>
                      <TextInput
                        value={editName}
                        onChangeText={setEditName}
                        style={[styles.input, styles.editInput]}
                        autoFocus
                      />
                      <Pressable style={styles.saveButton} onPress={() => handleSaveEdit(item.id)}>
                        <Text style={styles.saveButtonText}>Save</Text>
                      </Pressable>
                      <Pressable style={styles.cancelButton} onPress={() => setEditingId(null)}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.storeRow}>
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{item.name}</Text>
                        <Text style={styles.storeMeta}>
                          {selectedStoreId === item.id ? "Selected for price entry" : `ID: ${item.id}`}
                        </Text>
                      </View>
                      <View style={styles.storeActions}>
                        <Pressable style={styles.actionButton} onPress={() => setSelectedStoreId(item.id)}>
                          <Text style={styles.actionButtonText}>Prices</Text>
                        </Pressable>
                        <Pressable style={styles.actionButton} onPress={() => handleStartEdit(item)}>
                          <Text style={styles.actionButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={() => handleDelete(item)}
                        >
                          <Text style={styles.actionButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionSpacing}>
          <Text style={styles.sectionTitle}>Store Prices</Text>

          {!selectedStore ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No store selected</Text>
              <Text style={styles.emptyText}>Pick a store to view and edit its prices.</Text>
            </View>
          ) : (
            <View style={styles.detailsCard}>
              <View style={styles.detailsHeader}>
                <View style={styles.detailsCopy}>
                  <Text style={styles.detailsTitle}>{selectedStore.name}</Text>
                  <Text style={styles.detailsSubtitle}>Store-specific prices and recent visits.</Text>
                </View>
                <Text style={styles.detailsBadge}>{storePrices.length} prices</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryValue}>{storePrices.length}</Text>
                  <Text style={styles.summaryLabel}>Price links</Text>
                </View>
                <View style={styles.summaryBlock}>
                  <Text style={styles.summaryValue}>
                    {storePrices.length > 0 ? formatMoney(storePriceSummary.averagePrice) : "-"}
                  </Text>
                  <Text style={styles.summaryLabel}>Average price</Text>
                </View>
              </View>

              <View style={styles.summaryFooter}>
                <Text style={styles.summaryFooterLabel}>Latest update</Text>
                <Text style={styles.summaryFooterValue}>
                  {storePriceSummary.latestUpdate
                    ? `${storePriceSummary.latestItem ?? "Item"} • ${formatDate(storePriceSummary.latestUpdate)}`
                    : "No price history yet"}
                </Text>
              </View>

              <View style={styles.formStack}>
                <Text style={styles.subsectionTitle}>Add or update a price</Text>

                <TextInput
                  value={itemQuery}
                  onChangeText={setItemQuery}
                  placeholder="Search items..."
                  style={styles.searchInput}
                  placeholderTextColor="#8C8C81"
                />

                <View style={styles.itemPicker}>
                  {filteredItems.length === 0 ? (
                    <View style={styles.emptyInline}>
                      <Text style={styles.emptyTitle}>No items found</Text>
                      <Text style={styles.emptyText}>Create an item first, then link a price here.</Text>
                    </View>
                  ) : (
                    filteredItems.slice(0, 8).map((item) => (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.itemPickRow,
                          selectedItemId === item.id && styles.itemPickRowActive,
                        ]}
                        onPress={() => setSelectedItemId(item.id)}
                      >
                        <Text style={styles.itemPickName}>{item.name}</Text>
                        {selectedItemId === item.id ? (
                          <Text style={styles.itemPickMeta}>Selected</Text>
                        ) : null}
                      </Pressable>
                    ))
                  )}
                </View>

                <View style={styles.selectionSummary}>
                  <Text style={styles.selectionLabel}>Selected item</Text>
                  <Text style={styles.selectionValue}>{selectedItem?.name ?? "None"}</Text>
                </View>

                <TextInput
                  value={priceInput}
                  onChangeText={setPriceInput}
                  placeholder="3.49"
                  keyboardType="decimal-pad"
                  style={styles.input}
                  placeholderTextColor="#8C8C81"
                />

                <Pressable
                  style={[styles.primaryButton, savingPrice && styles.disabledButton]}
                  onPress={handleSavePrice}
                  disabled={savingPrice}
                >
                  <Text style={styles.primaryButtonText}>
                    {savingPrice ? "Saving..." : "Save Price"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.historyBlock}>
                <Text style={styles.subsectionTitle}>Price history</Text>

                {priceLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator />
                    <Text style={styles.loadingText}>Loading prices...</Text>
                  </View>
                ) : storePrices.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Text style={styles.emptyTitle}>No store prices yet</Text>
                    <Text style={styles.emptyText}>
                      Save a price above to start building history for this store.
                    </Text>
                  </View>
                ) : (
                  storePrices.map((row) => (
                    <View key={row.itemId} style={styles.historyRow}>
                      <View style={styles.historyCopy}>
                        <Text style={styles.rowTitle}>{row.itemName}</Text>
                        <Text style={styles.rowMeta}>Updated {formatDate(row.updatedAt)}</Text>
                      </View>
                      <Text style={styles.rowValue}>{formatMoney(row.latestPrice)}</Text>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.historyBlock}>
                <Text style={styles.subsectionTitle}>Recent visits</Text>

                {selectedStoreSessions.length === 0 ? (
                  <View style={styles.emptyInline}>
                    <Text style={styles.emptyTitle}>No sessions for this store</Text>
                    <Text style={styles.emptyText}>
                      Start a shopping session here to see recent visits.
                    </Text>
                  </View>
                ) : (
                  selectedStoreSessions.map((session) => (
                    <View key={session.id} style={styles.historyRow}>
                      <View style={styles.historyCopy}>
                        <Text style={styles.rowTitle}>Session #{session.id}</Text>
                        <Text style={styles.rowMeta}>{formatDate(session.createdAt)}</Text>
                      </View>
                      <Text style={styles.rowValue}>{formatMoney(session.total)}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}
        </View>

        <Pressable style={styles.backButton} onPress={() => router.push("/home-screen")}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>
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
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionSpacing: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  subsectionTitle: { fontSize: 16, fontWeight: "800", color: "#111111" },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7D3C7",
    backgroundColor: "#FBFBF7",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#111111",
  },
  searchInput: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7D3C7",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111111",
  },
  editInput: { flex: 1 },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: { fontSize: 14, color: "#5B5B53" },
  listContent: { gap: 10 },
  emptyState: { paddingVertical: 28, gap: 6 },
  emptyInline: { gap: 6, paddingVertical: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, color: "#5B5B53" },
  storeCard: {
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
  storeCardActive: {
    borderColor: "#111111",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  storeInfo: { flex: 1, gap: 4 },
  storeName: { fontSize: 16, fontWeight: "700", color: "#111111" },
  storeMeta: { fontSize: 12, color: "#6B6B63" },
  storeActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  actionButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: { backgroundColor: "#F5DDD8" },
  actionButtonText: { fontSize: 13, fontWeight: "700", color: "#111111" },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  saveButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { fontSize: 13, fontWeight: "700", color: "#111111" },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  detailsCopy: { flex: 1, gap: 4 },
  detailsTitle: { fontSize: 20, fontWeight: "800", color: "#111111" },
  detailsSubtitle: { fontSize: 14, color: "#5B5B53" },
  detailsBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111111",
    backgroundColor: "#F4F2E9",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: "hidden",
  },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBlock: {
    flex: 1,
    backgroundColor: "#F4F2E9",
    borderRadius: 16,
    padding: 14,
  },
  summaryValue: { fontSize: 24, fontWeight: "900", color: "#111111" },
  summaryLabel: { marginTop: 4, fontSize: 13, color: "#5B5B53" },
  summaryFooter: {
    backgroundColor: "#FBFBF7",
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  summaryFooterLabel: { fontSize: 12, fontWeight: "800", color: "#6B6B63", textTransform: "uppercase" },
  summaryFooterValue: { fontSize: 14, color: "#111111", fontWeight: "700" },
  formStack: { gap: 12 },
  itemPicker: { gap: 8, maxHeight: 220 },
  itemPickRow: {
    borderWidth: 1,
    borderColor: "#E7E4DA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  itemPickRowActive: {
    borderColor: "#111111",
    backgroundColor: "#F4F2E9",
  },
  itemPickName: { fontSize: 14, fontWeight: "700", color: "#111111", flex: 1 },
  itemPickMeta: { fontSize: 12, fontWeight: "700", color: "#5B5B53" },
  selectionSummary: {
    backgroundColor: "#FBFBF7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  selectionLabel: { fontSize: 12, fontWeight: "800", color: "#6B6B63", textTransform: "uppercase" },
  selectionValue: { fontSize: 14, fontWeight: "700", color: "#111111" },
  historyBlock: { gap: 10 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE9DF",
  },
  historyCopy: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: "#111111" },
  rowMeta: { fontSize: 12, color: "#6B6B63" },
  rowValue: { fontSize: 15, fontWeight: "800", color: "#111111" },
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
