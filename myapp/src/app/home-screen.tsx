import { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { getItemById } from "../db/repositories/items.repository";
import {
  createShoppingSession,
  getActiveShoppingSession,
  listShoppingSessions,
} from "../db/repositories/shopping-sessions.repository";
import { listItemsBySession } from "../db/repositories/shopping-session-items.repository";
import { listStores } from "../db/repositories/stores.repository";
import type { ShoppingSession, Store } from "../db/types";

type RecentItem = { name: string; store: string; price: string };

export default function HomeScreen() {
  const router = useRouter();

  const [activeSession, setActiveSession] = useState<ShoppingSession | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Start session modal
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

    if (activeResult.ok) setActiveSession(activeResult.data);

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

    if (activeResult.ok && activeResult.data) {
      const itemsResult = await listItemsBySession(activeResult.data.id);
      if (itemsResult.ok) {
        const resolved: RecentItem[] = [];
        for (const si of itemsResult.data.slice(0, 3)) {
          const ir = await getItemById(si.itemId);
          if (ir.ok && ir.data) {
            resolved.push({
              name: ir.data.name,
              store: "Current session",
              price: `P${si.subtotal.toFixed(2)}`,
            });
          }
        }
        setRecentItems(resolved);
      }
    } else {
      setRecentItems([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    loadHomeData().then(() => { if (!active) return; });
    return () => { active = false; };
  }, []);

  const openStartModal = async () => {
    const result = await listStores();
    if (!result.ok || result.data.length === 0) {
      Alert.alert(
        "No stores",
        "Add a store first before starting a session.",
        [{ text: "Go to Stores", onPress: () => router.push("/store-details-screen") }, { text: "Cancel" }]
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
  const remainingBudget = (activeSession?.budget ?? 0) - currentTotal;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Shopping App</Text>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>
          Quick access to your current shopping session and recent activity.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionLabel}>Current Shopping Session</Text>
        <Text style={styles.summaryTitle}>
          {activeSession ? "Active session" : "No active session"}
        </Text>
        <Text style={styles.summaryLine}>Items in cart: {recentItems.length}</Text>
        <Text style={styles.summaryLine}>Running total: P{currentTotal.toFixed(2)}</Text>
        <Text style={styles.summaryLine}>Remaining budget: P{remainingBudget.toFixed(2)}</Text>

        {activeSession ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/shopping-session-screen")}
          >
            <Text style={styles.primaryButtonText}>Continue shopping session</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={openStartModal}>
            <Text style={styles.primaryButtonText}>Start shopping session</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.sectionLabel}>Today</Text>
          <Text style={styles.statValue}>P{todayTotal.toFixed(2)}</Text>
          <Text style={styles.statHint}>Spent so far</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.sectionLabel}>This Month</Text>
          <Text style={styles.statValue}>P{monthTotal.toFixed(2)}</Text>
          <Text style={styles.statHint}>Total spending</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Pressable style={styles.actionButton} onPress={() => router.push("/quick-add-screen")}>
            <Text style={styles.actionButtonText}>Quick Add Item</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => router.push("/transaction-history-screen")}>
            <Text style={styles.actionButtonText}>View History</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => router.push("/item-details-screen")}>
            <Text style={styles.actionButtonText}>Items</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => router.push("/store-details-screen")}>
            <Text style={styles.actionButtonText}>Manage Stores</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => router.push("/debug-screen")}>
            <Text style={styles.actionButtonText}>Database Debug</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Items</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading recent items...</Text>
          </View>
        ) : recentItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No recent items yet</Text>
            <Text style={styles.emptyText}>Start a shopping session to see recent items here.</Text>
          </View>
        ) : (
          recentItems.map((item) => (
            <View key={item.name} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>{item.store}</Text>
              </View>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
          ))
        )}
      </View>

      {/* Start Session Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start Shopping Session</Text>

            <Text style={styles.label}>Select Store</Text>
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

            <Text style={styles.label}>Budget (P)</Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              placeholder="100.00"
              keyboardType="decimal-pad"
              style={styles.input}
              placeholderTextColor="#8C8C81"
            />

            <Pressable
              style={[styles.primaryButton, starting && styles.disabledButton]}
              onPress={handleStartSession}
              disabled={starting}
            >
              <Text style={styles.primaryButtonText}>
                {starting ? "Starting..." : "Start Session"}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 18, backgroundColor: "#F7F7F2" },
  header: { gap: 6, paddingTop: 10 },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6B6B63",
  },
  title: { fontSize: 34, fontWeight: "800", color: "#111111" },
  subtitle: { fontSize: 15, lineHeight: 21, color: "#4E4E46", maxWidth: 320 },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6B6B63",
  },
  summaryTitle: { fontSize: 22, fontWeight: "800", color: "#111111", marginTop: 2, marginBottom: 4 },
  summaryLine: { fontSize: 15, color: "#333333" },
  primaryButton: {
    marginTop: 10,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  disabledButton: { opacity: 0.5 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statValue: { fontSize: 28, fontWeight: "800", color: "#111111", letterSpacing: -0.5 },
  statHint: { fontSize: 13, color: "#5B5B53" },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionButton: {
    width: "48%",
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: "#EDEADE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
  },
  actionButtonText: { fontSize: 15, fontWeight: "700", color: "#111111" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemInfo: { gap: 3 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#111111" },
  itemMeta: { fontSize: 13, color: "#6B6B63" },
  itemPrice: { fontSize: 16, fontWeight: "800", color: "#111111" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  loadingText: { fontSize: 14, color: "#5B5B53" },
  emptyState: { paddingVertical: 28, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, color: "#5B5B53" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    gap: 14,
  },
  modalTitle: { fontSize: 24, fontWeight: "800", color: "#111111", marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "700", color: "#5B5B53" },
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
  cancelButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: { fontSize: 16, fontWeight: "700", color: "#111111" },
});
