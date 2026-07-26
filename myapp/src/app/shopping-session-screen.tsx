import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { createItem, searchItems, getItemById } from "../db/repositories/items.repository";
import { getStoreById } from "../db/repositories/stores.repository";
import { getLatestPriceForItemAtStore, upsertStoreItemPrice } from "../db/repositories/store-items.repository";
import {
  addSessionItem,
  decrementSessionItemQuantity,
  deleteSessionItem,
  listItemsBySession,
  markSessionItemPurchased,
  updateSessionItemQuantity,
} from "../db/repositories/shopping-session-items.repository";
import {
  finishShoppingSession,
  getActiveShoppingSession,
} from "../db/repositories/shopping-sessions.repository";
import type { Item, ShoppingSession, ShoppingSessionItem } from "../db/types";

type SessionItemRow = ShoppingSessionItem & {
  name: string;
  storeName: string;
};

export default function ShoppingSessionScreen() {
  const router = useRouter();

  const [session, setSession] = useState<ShoppingSession | null>(null);
  const [storeName, setStoreName] = useState("");
  const [items, setItems] = useState<SessionItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [savingSession, setSavingSession] = useState(false);

  // modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const nameInputRef = useRef<TextInput>(null);
  const priceInputRef = useRef<TextInput>(null);

  const loadSession = async () => {
    setLoading(true);

    const activeSessionResult = await getActiveShoppingSession();

    if (!activeSessionResult.ok) {
      setSession(null);
      setItems([]);
      setLoading(false);
      return;
    }

    const activeSession = activeSessionResult.data;
    setSession(activeSession);

    if (!activeSession) {
      setItems([]);
      setLoading(false);
      return;
    }

    const storeResult = await getStoreById(activeSession.storeId);
    const resolvedStoreName =
      storeResult.ok && storeResult.data ? storeResult.data.name : "Unknown store";
    setStoreName(resolvedStoreName);

    const itemsResult = await listItemsBySession(activeSession.id);

    if (!itemsResult.ok) {
      setItems([]);
      setLoading(false);
      return;
    }

    const resolvedItems: SessionItemRow[] = [];

    for (const sessionItem of itemsResult.data) {
      const itemResult = await getItemById(sessionItem.itemId);
      resolvedItems.push({
        ...sessionItem,
        name: itemResult.ok && itemResult.data ? itemResult.data.name : "Unknown item",
        storeName: resolvedStoreName,
      });
    }

    setItems(resolvedItems);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;
    async function initialize() {
      await loadSession();
      if (!isMounted) return;
    }
    initialize();
    return () => { isMounted = false; };
  }, []);

  // debounced search — fires 350ms after user stops typing
  useEffect(() => {
    if (!itemName.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const result = await searchItems(itemName.trim());
      setSearchResults(result.ok ? result.data.slice(0, 5) : []);
      setSearching(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [itemName]);

  const openModal = () => {
    setItemName("");
    setItemQuantity("1");
    setItemPrice("");
    setSearchResults([]);
    setPriceError(false);
    setModalVisible(true);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setPriceError(false);
  };

  const handlePickSuggestion = async (item: Item) => {
    setItemName(item.name);
    setSearchResults([]);
    setPriceError(false);

    if (session) {
      const priceResult = await getLatestPriceForItemAtStore(session.storeId, item.id);
      if (priceResult.ok && priceResult.data !== null) {
        setItemPrice(String(priceResult.data));
      } else {
        // No stored price for this item at this store — focus price field
        setItemPrice("");
        setTimeout(() => priceInputRef.current?.focus(), 100);
      }
    }
  };

  const handleAddItem = async () => {
    if (!session) {
      Alert.alert("No active session", "Start a shopping session first.");
      return;
    }

    const trimmedName = itemName.trim();
    const parsedQuantity = Number(itemQuantity);
    const parsedPrice = Number(itemPrice);

    if (!trimmedName) { Alert.alert("Missing item name", "Enter an item name."); return; }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) { Alert.alert("Invalid quantity", "Quantity must be at least 1."); return; }

    // Price is required — must be a positive number
    if (!itemPrice.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setPriceError(true);
      priceInputRef.current?.focus();
      Alert.alert(
        "Price required",
        "Enter the price for this item at the current store."
      );
      return;
    }

    setPriceError(false);

    setSaving(true);

    try {
      const existingResult = await searchItems(trimmedName);
      let itemId: number | null = null;

      if (existingResult.ok) {
        const exactMatch = existingResult.data.find(
          (i) => i.name.toLowerCase() === trimmedName.toLowerCase()
        );
        if (exactMatch) itemId = exactMatch.id;
      }

      if (itemId === null) {
        const createdResult = await createItem({ name: trimmedName, favorite: false });
        if (!createdResult.ok) { Alert.alert("Could not add item", createdResult.error); return; }
        itemId = createdResult.data.id;
      }

      const addResult = await addSessionItem({
        sessionId: session.id,
        itemId,
        quantity: parsedQuantity,
        price: parsedPrice,
      });

      if (!addResult.ok) { Alert.alert("Could not add item", addResult.error); return; }

      await upsertStoreItemPrice({ storeId: session.storeId, itemId, latestPrice: parsedPrice });

      closeModal();
      await loadSession();
    } catch (error) {
      Alert.alert("Could not add item", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const runningTotal = useMemo(() => session?.total ?? 0, [session]);

  const remainingBudget = useMemo(() => {
    if (!session) return 0;
    return session.budget - runningTotal;
  }, [session, runningTotal]);

  const purchasedCount = items.filter((item) => item.purchased).length;

  const handleIncrementQty = async (item: SessionItemRow) => {
    setBusyItemId(item.id);
    try {
      const result = await updateSessionItemQuantity(item.id, item.quantity + 1);
      if (!result.ok) { Alert.alert("Could not update item", result.error); return; }
      await loadSession();
    } catch (error) {
      Alert.alert("Could not update item", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDecrementQty = async (item: SessionItemRow) => {
    setBusyItemId(item.id);
    try {
      const result = await decrementSessionItemQuantity(item.id);
      if (!result.ok) { Alert.alert("Could not update item", result.error); return; }
      await loadSession();
    } catch (error) {
      Alert.alert("Could not update item", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteItem = async (item: SessionItemRow) => {
    Alert.alert("Delete Item", `Delete ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setBusyItemId(item.id);
          try {
            const result = await deleteSessionItem(item.id);
            if (!result.ok) { Alert.alert("Could not delete item", result.error); return; }
            await loadSession();
          } catch (error) {
            Alert.alert("Could not delete item", error instanceof Error ? error.message : "Unknown error");
          } finally {
            setBusyItemId(null);
          }
        },
      },
    ]);
  };

  const handleTogglePurchased = async (item: SessionItemRow) => {
    setBusyItemId(item.id);
    try {
      const result = await markSessionItemPurchased(item.id, !item.purchased);
      if (!result.ok) { Alert.alert("Could not update item", result.error); return; }
      await loadSession();
    } catch (error) {
      Alert.alert("Could not update item", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setBusyItemId(null);
    }
  };

  const handleFinishSession = async () => {
    if (!session) { Alert.alert("No active session", "Start a session first."); return; }

    setSavingSession(true);
    try {
      const result = await finishShoppingSession(session.id);
      if (!result.ok) { Alert.alert("Could not finish session", result.error); return; }
      router.replace("/transaction-history-screen");
    } catch (error) {
      Alert.alert("Could not finish session", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSavingSession(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Current Session</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>P{runningTotal.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Running total</Text>
            </View>

            <View style={styles.summaryBlock}>
              <Text style={[styles.summaryValue, remainingBudget < 0 ? styles.negative : null]}>
                P{remainingBudget.toFixed(2)}
              </Text>
              <Text style={styles.summaryLabel}>Remaining budget</Text>
            </View>
          </View>

          <View style={styles.summaryMetaRow}>
            <Text style={styles.summaryMeta}>Items: {items.length}</Text>
            <Text style={styles.summaryMeta}>Purchased: {purchasedCount}</Text>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{storeName || "Shopping Items"}</Text>
          <Pressable style={styles.inlineAction} onPress={openModal}>
            <Text style={styles.inlineActionText}>Add Item</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading session...</Text>
          </View>
        ) : !session ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No active session</Text>
            <Text style={styles.emptyText}>
              Start a shopping session from Home before adding items.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemMainRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>{item.storeName}</Text>
                  </View>
                  <View style={styles.priceBlock}>
                    <Text style={styles.itemPrice}>P{item.subtotal.toFixed(2)}</Text>
                    <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
                  </View>
                </View>

                <View style={styles.itemActionRow}>
                  <Pressable
                    style={[styles.itemAction, styles.purchasedAction]}
                    onPress={() => handleTogglePurchased(item)}
                    disabled={busyItemId === item.id}
                  >
                    <Text style={styles.itemActionText}>
                      {item.purchased ? "✓ Done" : "Mark Done"}
                    </Text>
                  </Pressable>

                  <View style={styles.qtyControls}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => handleDecrementQty(item)}
                      disabled={busyItemId === item.id}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => handleIncrementQty(item)}
                      disabled={busyItemId === item.id}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[styles.itemAction, styles.deleteAction]}
                    onPress={() => handleDeleteItem(item)}
                    disabled={busyItemId === item.id}
                  >
                    <Text style={styles.itemActionText}>Delete</Text>
                  </Pressable>
                </View>

                {busyItemId === item.id ? (
                  <Text style={styles.busyText}>Updating...</Text>
                ) : null}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptyText}>Tap Add Item or + to start.</Text>
              </View>
            }
          />
        )}

        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.finishButton, savingSession && styles.disabledButton]}
            onPress={handleFinishSession}
            disabled={savingSession}
          >
            <Text style={styles.finishButtonText}>
              {savingSession ? "Finishing..." : "Finish Session"}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.floatingButton} onPress={openModal}>
          <Text style={styles.floatingButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Add Item Bottom Sheet */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeModal} />

        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Item</Text>
            <Pressable style={styles.modalCloseButton} onPress={closeModal}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBody}
          >
            <Text style={styles.fieldLabel}>Item name</Text>
            <TextInput
              ref={nameInputRef}
              value={itemName}
              onChangeText={setItemName}
              placeholder="e.g. Milk"
              style={styles.input}
              placeholderTextColor="#8C8C81"
              returnKeyType="next"
            />

            {searching ? (
              <View style={styles.suggestionsRow}>
                <ActivityIndicator size="small" />
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.suggestions}>
                {searchResults.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.suggestionItem}
                    onPress={() => handlePickSuggestion(item)}
                  >
                    <Text style={styles.suggestionText}>{item.name}</Text>
                    {item.favorite ? <Text style={styles.suggestionStar}>★</Text> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.modalRow}>
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Qty</Text>
                <TextInput
                  value={itemQuantity}
                  onChangeText={setItemQuantity}
                  placeholder="1"
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor="#8C8C81"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.fieldLabel, priceError && styles.fieldLabelError]}>
                  Price{priceError ? " — required" : ""}
                </Text>
                <TextInput
                  ref={priceInputRef}
                  value={itemPrice}
                  onChangeText={(v) => { setItemPrice(v); if (priceError) setPriceError(false); }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  style={[styles.input, priceError && styles.inputError]}
                  placeholderTextColor="#8C8C81"
                />
              </View>
            </View>

            <Pressable
              style={[styles.primaryButton, saving && styles.disabledButton]}
              onPress={handleAddItem}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Adding..." : "Add to Session"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7F2" },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 92,
    backgroundColor: "#F7F7F2",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6B6B63",
  },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryBlock: { flex: 1, backgroundColor: "#F4F2E9", borderRadius: 16, padding: 14 },
  summaryValue: { fontSize: 28, fontWeight: "900", color: "#111111" },
  negative: { color: "#A11E1E" },
  summaryLabel: { marginTop: 2, fontSize: 13, color: "#5B5B53", fontWeight: "600" },
  summaryMetaRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryMeta: { fontSize: 13, color: "#5B5B53", fontWeight: "600" },
  listHeader: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  inlineAction: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  loadingText: { fontSize: 14, color: "#5B5B53" },
  listContent: { paddingBottom: 16, gap: 12 },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 12,
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 17, fontWeight: "800", color: "#111111" },
  itemMeta: { fontSize: 13, color: "#6B6B63", fontWeight: "600" },
  priceBlock: { alignItems: "flex-end", gap: 2 },
  itemPrice: { fontSize: 17, fontWeight: "900", color: "#111111" },
  itemActionRow: { flexDirection: "row", gap: 10 },
  itemAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  purchasedAction: { backgroundColor: "#DDE8D8", borderWidth: 1, borderColor: "#B8D4B0" },
  deleteAction: { backgroundColor: "#F5DDD8" },
  itemActionText: { fontSize: 13, fontWeight: "800", color: "#111111", textAlign: "center" },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDEADE",
    borderRadius: 14,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 20, fontWeight: "700", color: "#111111", lineHeight: 24 },
  qtyValue: { fontSize: 15, fontWeight: "800", color: "#111111", minWidth: 28, textAlign: "center" },
  busyText: { fontSize: 12, color: "#5B5B53", fontWeight: "600" },
  emptyState: { paddingVertical: 40, alignItems: "center", gap: 6 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, color: "#5B5B53", textAlign: "center" },
  bottomBar: { position: "absolute", left: 16, right: 16, bottom: 18 },
  finishButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  disabledButton: { opacity: 0.6 },
  finishButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  floatingButton: {
    position: "absolute",
    right: 16,
    bottom: 84,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  floatingButtonText: { color: "#FFFFFF", fontSize: 28, lineHeight: 30, fontWeight: "700" },
  // bottom sheet
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7D3C7",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111111" },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: { fontSize: 14, fontWeight: "700", color: "#111111" },
  modalBody: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  modalRow: { flexDirection: "row", gap: 12 },
  modalField: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#5B5B53" },
  fieldLabelError: { color: "#A11E1E" },
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
  inputError: {
    borderColor: "#A11E1E",
    backgroundColor: "#FDF4F4",
  },
  suggestionsRow: { paddingVertical: 8, alignItems: "flex-start" },
  suggestions: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0EDE4",
  },
  suggestionText: { fontSize: 15, fontWeight: "600", color: "#111111" },
  suggestionStar: { fontSize: 14, color: "#C8A84B" },
  primaryButton: {
    marginTop: 4,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
