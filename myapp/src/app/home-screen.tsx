import { useCallback, useState } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import { getItemById } from "../db/repositories/items.repository";
import {
  createShoppingSession,
  getActiveShoppingSession,
  listShoppingSessions,
} from "../db/repositories/shopping-sessions.repository";
import { listItemsBySession } from "../db/repositories/shopping-session-items.repository";
import { listStores, getStoreById } from "../db/repositories/stores.repository";
import type { ShoppingSession, Store } from "../db/types";

type CartItem = { name: string; subtotal: number };

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomeScreen() {
  const router = useRouter();

  const [activeSession, setActiveSession] = useState<ShoppingSession | null>(null);
  const [storeName, setStoreName] = useState("");
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [budget, setBudget] = useState("");
  const [starting, setStarting] = useState(false);

  const loadHomeData = async () => {
    setLoading(true);

    const [activeResult, sessionsResult] = await Promise.all([
      getActiveShoppingSession(),
      listShoppingSessions(),
    ]);

    const session = activeResult.ok ? activeResult.data : null;
    setActiveSession(session);

    if (session) {
      const storeResult = await getStoreById(session.storeId);
      setStoreName(storeResult.ok && storeResult.data ? storeResult.data.name : "");

      const itemsResult = await listItemsBySession(session.id);
      if (itemsResult.ok) {
        const resolved: CartItem[] = [];
        for (const si of itemsResult.data.slice(0, 3)) {
          const ir = await getItemById(si.itemId);
          if (ir.ok && ir.data) {
            resolved.push({ name: ir.data.name, subtotal: si.subtotal });
          }
        }
        setCartItems(resolved);
      }
    } else {
      setStoreName("");
      setCartItems([]);
    }

    if (sessionsResult.ok) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setTodayTotal(
        sessionsResult.data
          .filter((s) => new Date(s.createdAt) >= startOfToday)
          .reduce((sum, s) => sum + s.total, 0)
      );
      setMonthTotal(
        sessionsResult.data
          .filter((s) => new Date(s.createdAt) >= startOfMonth)
          .reduce((sum, s) => sum + s.total, 0)
      );
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHomeData().then(() => { if (!active) return; });
      return () => { active = false; };
    }, [])
  );

  const openStartModal = async () => {
    const result = await listStores();
    if (!result.ok || result.data.length === 0) {
      Alert.alert(
        "No stores",
        "Add a store first before starting a session.",
        [
          { text: "Go to Stores", onPress: () => router.push("/store-details-screen") },
          { text: "Cancel" },
        ]
      );
      return;
    }
    setStores(result.data);
    setSelectedStoreId(result.data[0].id);
    setBudget("");
    setShowModal(true);
  };

  const handleStartSession = async () => {
    if (!selectedStoreId) {
      Alert.alert("Select a store", "Pick a store to shop at.");
      return;
    }
    const parsedBudget = Number(budget);
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
      Alert.alert("Invalid budget", "Enter a budget greater than 0.");
      return;
    }
    setStarting(true);
    const result = await createShoppingSession({ storeId: selectedStoreId, budget: parsedBudget });
    setStarting(false);
    if (!result.ok) {
      Alert.alert("Error", result.error);
      return;
    }
    setShowModal(false);
    await loadHomeData();
    router.push("/shopping-session-screen");
  };

  const currentTotal = activeSession?.total ?? 0;
  const sessionBudget = activeSession?.budget ?? 0;
  const remaining = sessionBudget - currentTotal;
  const budgetProgress = sessionBudget > 0 ? Math.min(currentTotal / sessionBudget, 1) : 0;
  const overBudget = remaining < 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.date}>{formatDate()}</Text>
        </View>

        {/* Session Hero Card */}
        {activeSession ? (
          <Pressable
            style={styles.sessionCard}
            onPress={() => router.push("/shopping-session-screen")}
          >
            <View style={styles.sessionCardTop}>
              <View style={styles.sessionCardMeta}>
                <View style={styles.activeDot} />
                <Text style={styles.sessionCardLabel}>Active Session</Text>
              </View>
              <Text style={styles.sessionStoreName}>{storeName}</Text>
            </View>

            <View style={styles.sessionAmounts}>
              <View>
                <Text style={styles.sessionTotal}>P{currentTotal.toFixed(2)}</Text>
                <Text style={styles.sessionAmountLabel}>spent</Text>
              </View>
              <View style={styles.sessionDivider} />
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.sessionRemaining, overBudget && styles.overBudget]}>
                  P{Math.abs(remaining).toFixed(2)}
                </Text>
                <Text style={styles.sessionAmountLabel}>
                  {overBudget ? "over budget" : "remaining"}
                </Text>
              </View>
            </View>

            {/* Budget progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${budgetProgress * 100}%` as any },
                  overBudget && styles.progressFillOver,
                ]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressHint}>
                Budget: P{sessionBudget.toFixed(2)}
              </Text>
              <Text style={styles.progressHint}>
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""} in cart
              </Text>
            </View>

            <View style={styles.sessionCta}>
              <Text style={styles.sessionCtaText}>Continue shopping →</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.noSessionCard}>
            <Text style={styles.noSessionTitle}>No active session</Text>
            <Text style={styles.noSessionText}>
              Choose a store, set a budget, and start tracking your shop.
            </Text>
            <Pressable style={styles.startButton} onPress={openStartModal}>
              <Text style={styles.startButtonText}>Start Shopping Session</Text>
            </Pressable>
          </View>
        )}

        {/* Spending Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>P{todayTotal.toFixed(2)}</Text>
            <Text style={styles.statHint}>spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={styles.statValue}>P{monthTotal.toFixed(2)}</Text>
            <Text style={styles.statHint}>total</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Pressable
              style={styles.actionTile}
              onPress={() => activeSession ? router.push("/quick-add-screen") : openStartModal()}
            >
              <Text style={styles.actionIcon}>＋</Text>
              <Text style={styles.actionLabel}>Add Item</Text>
            </Pressable>
            <Pressable
              style={styles.actionTile}
              onPress={() => router.push("/transaction-history-screen")}
            >
              <Text style={styles.actionIcon}>🧾</Text>
              <Text style={styles.actionLabel}>History</Text>
            </Pressable>
            <Pressable
              style={styles.actionTile}
              onPress={() => router.push("/item-details-screen")}
            >
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionLabel}>Items</Text>
            </Pressable>
            <Pressable
              style={styles.actionTile}
              onPress={() => router.push("/store-details-screen")}
            >
              <Text style={styles.actionIcon}>🏪</Text>
              <Text style={styles.actionLabel}>Stores</Text>
            </Pressable>
          </View>
        </View>

        {/* Cart Preview — only when session is active */}
        {activeSession ? (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>In Your Cart</Text>
              <Pressable onPress={() => router.push("/shopping-session-screen")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>

            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" />
                <Text style={styles.loadingText}>Loading cart...</Text>
              </View>
            ) : cartItems.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartText}>No items added yet. Tap Add Item to start.</Text>
              </View>
            ) : (
              cartItems.map((item, i) => (
                <View key={i} style={styles.cartRow}>
                  <Text style={styles.cartName}>{item.name}</Text>
                  <Text style={styles.cartPrice}>P{item.subtotal.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}

      </ScrollView>

      {/* Start Session Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Start Shopping Session</Text>

          <Text style={styles.modalLabel}>Select Store</Text>
          <View style={styles.storeList}>
            {stores.map((store) => (
              <Pressable
                key={store.id}
                style={[
                  styles.storeOption,
                  selectedStoreId === store.id && styles.storeOptionActive,
                ]}
                onPress={() => setSelectedStoreId(store.id)}
              >
                <Text
                  style={[
                    styles.storeOptionText,
                    selectedStoreId === store.id && styles.storeOptionTextActive,
                  ]}
                >
                  {store.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Budget (P)</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="0.00"
            keyboardType="decimal-pad"
            style={styles.input}
            placeholderTextColor="#8C8C81"
          />

          <Pressable
            style={[styles.startButton, starting && styles.disabledButton]}
            onPress={handleStartSession}
            disabled={starting}
          >
            <Text style={styles.startButtonText}>
              {starting ? "Starting..." : "Start Session"}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7F2" },
  container: { padding: 20, gap: 20, paddingBottom: 40 },

  // Greeting
  header: { gap: 2, paddingTop: 6 },
  greeting: { fontSize: 28, fontWeight: "800", color: "#111111", letterSpacing: -0.3 },
  date: { fontSize: 14, color: "#6B6B63", fontWeight: "500" },

  // Active session hero card
  sessionCard: {
    backgroundColor: "#111111",
    borderRadius: 24,
    padding: 22,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sessionCardTop: { gap: 4 },
  sessionCardMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5DD67A",
  },
  sessionCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#9A9A8E",
  },
  sessionStoreName: { fontSize: 22, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  sessionAmounts: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionTotal: { fontSize: 32, fontWeight: "900", color: "#FFFFFF", letterSpacing: -1 },
  sessionRemaining: { fontSize: 32, fontWeight: "900", color: "#5DD67A", letterSpacing: -1 },
  overBudget: { color: "#FF6B6B" },
  sessionAmountLabel: { fontSize: 12, color: "#9A9A8E", fontWeight: "600", marginTop: 2 },
  sessionDivider: { width: 1, height: 40, backgroundColor: "#2E2E2E" },
  progressTrack: {
    height: 6,
    backgroundColor: "#2A2A2A",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#5DD67A",
    borderRadius: 3,
  },
  progressFillOver: { backgroundColor: "#FF6B6B" },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressHint: { fontSize: 12, color: "#6B6B63", fontWeight: "600" },
  sessionCta: {
    borderTopWidth: 1,
    borderTopColor: "#2A2A2A",
    paddingTop: 12,
  },
  sessionCtaText: { fontSize: 14, fontWeight: "700", color: "#9A9A8E" },

  // No session card
  noSessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noSessionTitle: { fontSize: 20, fontWeight: "800", color: "#111111" },
  noSessionText: { fontSize: 14, color: "#6B6B63", lineHeight: 20 },

  // Buttons
  startButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  startButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  disabledButton: { opacity: 0.5 },
  cancelButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "700", color: "#111111" },

  // Stats
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, color: "#6B6B63" },
  statValue: { fontSize: 26, fontWeight: "800", color: "#111111", letterSpacing: -0.5 },
  statHint: { fontSize: 12, color: "#9A9A8E" },

  // Section
  section: { gap: 12 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  seeAll: { fontSize: 14, fontWeight: "700", color: "#6B6B63" },

  // Quick actions 2×2 grid
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionTile: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  actionIcon: { fontSize: 24 },
  actionLabel: { fontSize: 15, fontWeight: "700", color: "#111111" },

  // Cart preview
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 14, color: "#6B6B63" },
  emptyCart: { paddingVertical: 16 },
  emptyCartText: { fontSize: 14, color: "#9A9A8E" },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cartName: { fontSize: 15, fontWeight: "700", color: "#111111" },
  cartPrice: { fontSize: 15, fontWeight: "800", color: "#111111" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    gap: 14,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D7D3C7",
    alignSelf: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111111" },
  modalLabel: { fontSize: 13, fontWeight: "700", color: "#5B5B53" },
  storeList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  storeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#EDEADE",
    borderWidth: 1,
    borderColor: "#D7D3C7",
  },
  storeOptionActive: { backgroundColor: "#111111", borderColor: "#111111" },
  storeOptionText: { fontSize: 14, fontWeight: "700", color: "#111111" },
  storeOptionTextActive: { color: "#FFFFFF" },
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
});
