import { useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import { createItem, searchItems } from "../db/repositories/items.repository";
import { getActiveShoppingSession } from "../db/repositories/shopping-sessions.repository";
import { addSessionItem } from "../db/repositories/shopping-session-items.repository";
import type { Item, ShoppingSession } from "../db/types";

export default function QuickAddScreen() {
  const router = useRouter();

  const [activeSession, setActiveSession] = useState<ShoppingSession | null>(null);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadActiveSession() {
      const result = await getActiveShoppingSession();

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setActiveSession(result.data);
      } else {
        setActiveSession(null);
      }
    }

    loadActiveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function runSearch() {
      const query = name.trim();

      if (!query) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      const result = await searchItems(query);

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setSearchResults(result.data.slice(0, 5));
      } else {
        setSearchResults([]);
      }

      setLoading(false);
    }

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [name]);

  const handlePickItem = (item: Item) => {
    setName(item.name);
  };

  const handleAddItem = async () => {
    if (!activeSession) {
      Alert.alert("No active session", "Start a shopping session first.");
      return;
    }

    const trimmedName = name.trim();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);

    if (!trimmedName) {
      Alert.alert("Missing item name", "Enter an item name.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      Alert.alert("Invalid quantity", "Quantity must be at least 1.");
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      Alert.alert("Invalid price", "Enter a valid price.");
      return;
    }

    setSaving(true);

    try {
      const existingResult = await searchItems(trimmedName);
      let itemId: number | null = null;

      if (existingResult.ok) {
        const exactMatch = existingResult.data.find(
          (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (exactMatch) {
          itemId = exactMatch.id;
        }
      }

      if (itemId === null) {
        const createdItemResult = await createItem({
          name: trimmedName,
          favorite: false,
        });

        if (!createdItemResult.ok) {
          Alert.alert("Could not add item", createdItemResult.error);
          return;
        }

        itemId = createdItemResult.data.id;
      }

      const addResult = await addSessionItem({
        sessionId: activeSession.id,
        itemId,
        quantity: parsedQuantity,
        price: parsedPrice,
      });

      if (!addResult.ok) {
        Alert.alert("Could not add item", addResult.error);
        return;
      }

      setName("");
      setQuantity("1");
      setPrice("");
      setSearchResults([]);
      router.replace("/shopping-session-screen");
    } catch (error) {
      Alert.alert(
        "Could not add item",
        error instanceof Error ? error.message : "Unknown error"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Shopping App</Text>
        <Text style={styles.title}>Quick Add</Text>
        <Text style={styles.subtitle}>
          Add an item, save it to the database, and return to the session.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.sectionLabel}>Active Session</Text>
        <Text style={styles.summaryTitle}>
          {activeSession ? "Ready to add items" : "No active session"}
        </Text>
        <Text style={styles.summaryLine}>
          {activeSession
            ? `Budget: P${activeSession.budget.toFixed(2)}`
            : "Start a shopping session before adding items."}
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Item Details</Text>

        <Text style={styles.label}>Item name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Milk"
          style={styles.input}
          placeholderTextColor="#8C8C81"
        />

        <Text style={styles.label}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          placeholder="1"
          keyboardType="numeric"
          style={styles.input}
          placeholderTextColor="#8C8C81"
        />

        <Text style={styles.label}>Price</Text>
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="3.49"
          keyboardType="decimal-pad"
          style={styles.input}
          placeholderTextColor="#8C8C81"
        />

        <Pressable
          style={[
            styles.primaryButton,
            (!activeSession || saving) && styles.disabledButton,
          ]}
          onPress={handleAddItem}
          disabled={!activeSession || saving}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? "Adding..." : "Add Item"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Matches</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Searching items...</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptyText}>
              Type an item name to search existing items.
            </Text>
          </View>
        ) : (
          searchResults.map((item) => (
            <Pressable
              key={item.id}
              style={styles.matchRow}
              onPress={() => handlePickItem(item)}
            >
              <View style={styles.matchInfo}>
                <Text style={styles.matchName}>{item.name}</Text>
                <Text style={styles.matchMeta}>
                  {item.favorite ? "Favorite item" : "Saved item"}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push("/shopping-session-screen")}
      >
        <Text style={styles.secondaryButtonText}>Back to Session</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 18,
    backgroundColor: "#F7F7F2",
  },
  header: {
    gap: 6,
    paddingTop: 10,
  },
  kicker: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6B6B63",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#111111",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: "#4E4E46",
    maxWidth: 320,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6B6B63",
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111111",
  },
  summaryLine: {
    fontSize: 15,
    color: "#333333",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B5B53",
  },
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
  primaryButton: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  section: {
    gap: 12,
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
  emptyState: {
    paddingVertical: 28,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
  },
  emptyText: {
    fontSize: 14,
    color: "#5B5B53",
  },
  matchRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E7E4DA",
  },
  matchInfo: {
    gap: 3,
  },
  matchName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  matchMeta: {
    fontSize: 13,
    color: "#6B6B63",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "800",
  },
});