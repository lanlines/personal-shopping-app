import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getItemById } from "../db/repositories/items.repository";
import { getStoreById } from "../db/repositories/stores.repository";
import {
  deleteSessionItem,
  listItemsBySession,
  markSessionItemPurchased,
  updateSessionItemQuantity,
} from "../db/repositories/shopping-session-items.repository";
import {
  finishShoppingSession,
  getActiveShoppingSession,
  getShoppingSessionById,
} from "../db/repositories/shopping-sessions.repository";
import type { ShoppingSession, ShoppingSessionItem } from "../db/types";

type SessionItemRow = ShoppingSessionItem & {
  name: string;
  storeName: string;
};

export default function ShoppingSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();

  const requestedSessionId = useMemo(() => {
    const value = params.sessionId;
    const rawValue = Array.isArray(value) ? value[0] : value;

    if (!rawValue) {
      return null;
    }

    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params.sessionId]);

  const readOnlySession = requestedSessionId !== null;

  const [session, setSession] = useState<ShoppingSession | null>(null);
  const [storeName, setStoreName] = useState("");
  const [items, setItems] = useState<SessionItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [savingSession, setSavingSession] = useState(false);

  const loadSession = async () => {
    setLoading(true);

    const sessionResult =
      requestedSessionId !== null
        ? await getShoppingSessionById(requestedSessionId)
        : await getActiveShoppingSession();

    if (!sessionResult.ok) {
      setSession(null);
      setItems([]);
      setLoading(false);
      return;
    }

    const selectedSession = sessionResult.data;
    setSession(selectedSession);

    if (!selectedSession) {
      setItems([]);
      setLoading(false);
      return;
    }

    const storeResult = await getStoreById(selectedSession.storeId);
    const resolvedStoreName =
      storeResult.ok && storeResult.data ? storeResult.data.name : "Unknown store";
    setStoreName(resolvedStoreName);

    const itemsResult = await listItemsBySession(selectedSession.id);

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
      if (!isMounted) {
        return;
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const runningTotal = useMemo(() => {
    return session?.total ?? 0;
  }, [session]);

  const remainingBudget = useMemo(() => {
    if (!session) {
      return 0;
    }

    return session.budget - runningTotal;
  }, [session, runningTotal]);

  const purchasedCount = items.filter((item) => item.purchased).length;

  const refreshAfterChange = async () => {
    await loadSession();
  };

  const handleAddItem = () => {
    router.push("/quick-add-screen");
  };

  const handleEditItem = async (item: SessionItemRow) => {
    setBusyItemId(item.id);

    try {
      const nextQuantity = item.quantity + 1;
      const result = await updateSessionItemQuantity(item.id, nextQuantity);

      if (!result.ok) {
        Alert.alert("Could not update item", result.error);
        return;
      }

      await refreshAfterChange();
    } catch (error) {
      Alert.alert(
        "Could not update item",
        error instanceof Error ? error.message : "Unknown error"
      );
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

            if (!result.ok) {
              Alert.alert("Could not delete item", result.error);
              return;
            }

            await refreshAfterChange();
          } catch (error) {
            Alert.alert(
              "Could not delete item",
              error instanceof Error ? error.message : "Unknown error"
            );
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

      if (!result.ok) {
        Alert.alert("Could not update item", result.error);
        return;
      }

      await refreshAfterChange();
    } catch (error) {
      Alert.alert(
        "Could not update item",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setBusyItemId(null);
    }
  };

  const handleFinishSession = async () => {
    if (!session || readOnlySession) {
      Alert.alert("No active session", "Start a session first.");
      return;
    }

    setSavingSession(true);

    try {
      const result = await finishShoppingSession(session.id);

      if (!result.ok) {
        Alert.alert("Could not finish session", result.error);
        return;
      }

      router.replace("/transaction-history-screen");
    } catch (error) {
      Alert.alert(
        "Could not finish session",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setSavingSession(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>
            {readOnlySession ? "Session Details" : "Current Session"}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>P{runningTotal.toFixed(2)}</Text>
              <Text style={styles.summaryLabel}>Running total</Text>
            </View>

            <View style={styles.summaryBlock}>
              <Text
                style={[
                  styles.summaryValue,
                  remainingBudget < 0 ? styles.negative : null,
                ]}
              >
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
          <Text style={styles.sectionTitle}>
            {storeName || "Shopping Items"}
          </Text>
          {!readOnlySession ? (
            <Pressable style={styles.inlineAction} onPress={handleAddItem}>
              <Text style={styles.inlineActionText}>Add Item</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading session...</Text>
          </View>
        ) : !session ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {readOnlySession ? "Session not found" : "No active session"}
            </Text>
            <Text style={styles.emptyText}>
              {readOnlySession
                ? "This session could not be loaded."
                : "Start a shopping session from Home before adding items."}
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
                    <Text style={styles.itemPrice}>
                      P{item.subtotal.toFixed(2)}
                    </Text>
                    <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
                  </View>
                </View>

                {!readOnlySession ? (
                  <>
                    <View style={styles.itemActionRow}>
                      <Pressable
                        style={[styles.itemAction, styles.purchasedAction]}
                        onPress={() => handleTogglePurchased(item)}
                        disabled={busyItemId === item.id}
                      >
                        <Text style={styles.itemActionText}>
                          {item.purchased ? "Purchased" : "Mark Purchased"}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={styles.itemAction}
                        onPress={() => handleEditItem(item)}
                        disabled={busyItemId === item.id}
                      >
                        <Text style={styles.itemActionText}>Qty +1</Text>
                      </Pressable>

                      <Pressable
                        style={styles.itemAction}
                        onPress={() => handleDeleteItem(item)}
                        disabled={busyItemId === item.id}
                      >
                        <Text style={styles.itemActionText}>Delete</Text>
                      </Pressable>
                    </View>

                    {busyItemId === item.id ? (
                      <Text style={styles.busyText}>Updating...</Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No items yet</Text>
                <Text style={styles.emptyText}>
                  Add the first item to start the session.
                </Text>
              </View>
            }
          />
        )}

        {!readOnlySession ? (
          <>
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

            <Pressable style={styles.floatingButton} onPress={handleAddItem}>
              <Text style={styles.floatingButtonText}>+</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F7F2",
  },
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
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6B6B63",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryBlock: {
    flex: 1,
    backgroundColor: "#F4F2E9",
    borderRadius: 16,
    padding: 16,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.5,
  },
  negative: {
    color: "#A11E1E",
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: 13,
    color: "#5B5B53",
    fontWeight: "600",
  },
  summaryMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryMeta: {
    fontSize: 13,
    color: "#5B5B53",
    fontWeight: "600",
  },
  listHeader: {
    marginTop: 18,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  inlineAction: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#5B5B53",
  },
  listContent: {
    paddingBottom: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111111",
  },
  itemMeta: {
    fontSize: 13,
    color: "#6B6B63",
    fontWeight: "600",
  },
  priceBlock: {
    alignItems: "flex-end",
    gap: 2,
  },
  itemPrice: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111111",
  },
  itemActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  itemAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  purchasedAction: {
    backgroundColor: "#DDE8D8",
    borderWidth: 1,
    borderColor: "#B8D4B0",
  },
  itemActionText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111111",
    textAlign: "center",
  },
  busyText: {
    fontSize: 12,
    color: "#5B5B53",
    fontWeight: "600",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  emptyText: {
    fontSize: 14,
    color: "#5B5B53",
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
  },
  finishButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  finishButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
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
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "700",
  },
});