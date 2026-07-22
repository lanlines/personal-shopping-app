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
  createStore,
  deleteStore,
  listStores,
  updateStore,
} from "../db/repositories/stores.repository";
import type { Store } from "../db/types";

export default function StoreDetailsScreen() {
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    setLoading(true);
    const result = await listStores();
    if (result.ok) setStores(result.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

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
    await load();
  };

  const handleStartEdit = (store: Store) => {
    setEditingId(store.id);
    setEditName(store.name);
  };

  const handleSaveEdit = async (id: number) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const result = await updateStore(id, { name: trimmed });
    if (!result.ok) {
      Alert.alert("Error", result.error);
      return;
    }
    setEditingId(null);
    await load();
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
          await load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Shopping App</Text>
          <Text style={styles.title}>Stores</Text>
          <Text style={styles.subtitle}>Manage your stores.</Text>
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
            <Text style={styles.primaryButtonText}>
              {saving ? "Adding..." : "Add Store"}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading stores...</Text>
          </View>
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No stores yet</Text>
                <Text style={styles.emptyText}>Add a store above to get started.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.storeCard}>
                {editingId === item.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      style={[styles.input, styles.editInput]}
                      autoFocus
                    />
                    <Pressable
                      style={styles.saveButton}
                      onPress={() => handleSaveEdit(item.id)}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => setEditingId(null)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.storeRow}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    <View style={styles.storeActions}>
                      <Pressable
                        style={styles.actionButton}
                        onPress={() => handleStartEdit(item)}
                      >
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
  header: { gap: 6, paddingTop: 10, marginBottom: 18 },
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
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 10,
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
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
  listContent: { gap: 10, paddingBottom: 16 },
  emptyState: { paddingVertical: 28, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111111" },
  emptyText: { fontSize: 14, color: "#5B5B53" },
  storeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7E4DA",
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  storeName: { fontSize: 16, fontWeight: "700", color: "#111111", flex: 1 },
  storeActions: { flexDirection: "row", gap: 8 },
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
