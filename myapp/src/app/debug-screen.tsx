import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { listItems } from "../db/repositories/items.repository";
import { listItemsBySession } from "../db/repositories/shopping-session-items.repository";
import { listShoppingSessions } from "../db/repositories/shopping-sessions.repository";
import { listPricesByStore } from "../db/repositories/store-items.repository";
import { listStores } from "../db/repositories/stores.repository";
import type { Item, ShoppingSession, ShoppingSessionItem, Store } from "../db/types";

type DebugStoreItemRow = {
  storeName: string;
  itemName: string;
  storeId: number;
  itemId: number;
  latestPrice: number;
  updatedAt: string;
};

type DebugData = {
  stores: Store[];
  items: Item[];
  storeItems: DebugStoreItemRow[];
  sessions: ShoppingSession[];
  sessionItems: ShoppingSessionItem[];
};

const initialData: DebugData = {
  stores: [],
  items: [],
  storeItems: [],
  sessions: [],
  sessionItems: [],
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

function DebugSection({
  title,
  count,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{count}</Text>
      </View>

      {count === 0 ? <Text style={styles.emptyText}>{emptyText}</Text> : children}
    </View>
  );
}

export default function DebugScreen() {
  const router = useRouter();
  const [data, setData] = useState<DebugData>(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [storesResult, itemsResult, sessionsResult] = await Promise.all([
      listStores(),
      listItems(),
      listShoppingSessions(),
    ]);

    const stores = storesResult.ok ? storesResult.data : [];
    const items = itemsResult.ok ? itemsResult.data : [];
    const sessions = sessionsResult.ok ? sessionsResult.data : [];

    const storeItemRows: DebugStoreItemRow[] = [];
    for (const store of stores) {
      const result = await listPricesByStore(store.id);
      if (!result.ok) {
        continue;
      }

      for (const row of result.data) {
        storeItemRows.push({
          storeName: store.name,
          itemName: row.itemName,
          storeId: store.id,
          itemId: row.itemId,
          latestPrice: row.latestPrice,
          updatedAt: row.updatedAt,
        });
      }
    }

    const sessionItemRows: ShoppingSessionItem[] = [];
    for (const session of sessions) {
      const result = await listItemsBySession(session.id);
      if (result.ok) {
        sessionItemRows.push(...result.data);
      }
    }

    setData({
      stores,
      items,
      storeItems: storeItemRows,
      sessions,
      sessionItems: sessionItemRows,
    });
  };

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      await loadData();
      if (active) {
        setLoading(false);
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#111111" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Shopping App</Text>
        <Text style={styles.title}>Database Debug</Text>
        <Text style={styles.subtitle}>
          Read-only view of the local SQLite tables and their current rows.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{data.stores.length}</Text>
            <Text style={styles.summaryLabel}>Stores</Text>
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{data.items.length}</Text>
            <Text style={styles.summaryLabel}>Items</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{data.sessions.length}</Text>
            <Text style={styles.summaryLabel}>Sessions</Text>
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{data.sessionItems.length}</Text>
            <Text style={styles.summaryLabel}>Session items</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading database tables...</Text>
        </View>
      ) : (
        <>
          <DebugSection title="Stores" count={data.stores.length} emptyText="No stores saved yet.">
            {data.stores.map((store) => (
              <View key={store.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{store.name}</Text>
                <Text style={styles.rowMeta}>ID: {store.id}</Text>
                <Text style={styles.rowMeta}>Created: {formatDate(store.createdAt)}</Text>
              </View>
            ))}
          </DebugSection>

          <DebugSection title="Items" count={data.items.length} emptyText="No items saved yet.">
            {data.items.map((item) => (
              <View key={item.id} style={styles.rowCard}>
                <View style={styles.rowTopLine}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <View style={[styles.badge, item.favorite ? styles.badgeActive : styles.badgeMuted]}>
                    <Text style={styles.badgeText}>{item.favorite ? "Favorite" : "Item"}</Text>
                  </View>
                </View>
                <Text style={styles.rowMeta}>ID: {item.id}</Text>
                <Text style={styles.rowMeta}>Image path: {item.imagePath ?? "-"}</Text>
              </View>
            ))}
          </DebugSection>

          <DebugSection
            title="Store prices"
            count={data.storeItems.length}
            emptyText="No store price links saved yet."
          >
            {data.storeItems.map((row) => (
              <View key={`${row.storeId}-${row.itemId}`} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{row.itemName}</Text>
                <Text style={styles.rowMeta}>Store: {row.storeName}</Text>
                <Text style={styles.rowMeta}>Latest price: {formatMoney(row.latestPrice)}</Text>
                <Text style={styles.rowMeta}>Updated: {formatDate(row.updatedAt)}</Text>
              </View>
            ))}
          </DebugSection>

          <DebugSection
            title="Shopping sessions"
            count={data.sessions.length}
            emptyText="No shopping sessions saved yet."
          >
            {data.sessions.map((session) => (
              <View key={session.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>Session #{session.id}</Text>
                <Text style={styles.rowMeta}>Store ID: {session.storeId}</Text>
                <Text style={styles.rowMeta}>Budget: {formatMoney(session.budget)}</Text>
                <Text style={styles.rowMeta}>Total: {formatMoney(session.total)}</Text>
                <Text style={styles.rowMeta}>Created: {formatDate(session.createdAt)}</Text>
                <Text style={styles.rowMeta}>Finished: {formatDate(session.finishedAt)}</Text>
              </View>
            ))}
          </DebugSection>

          <DebugSection
            title="Session items"
            count={data.sessionItems.length}
            emptyText="No shopping session items saved yet."
          >
            {data.sessionItems.map((item) => (
              <View key={item.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>Session item #{item.id}</Text>
                <Text style={styles.rowMeta}>Session ID: {item.sessionId}</Text>
                <Text style={styles.rowMeta}>Item ID: {item.itemId}</Text>
                <Text style={styles.rowMeta}>Quantity: {item.quantity}</Text>
                <Text style={styles.rowMeta}>Price: {formatMoney(item.price)}</Text>
                <Text style={styles.rowMeta}>Subtotal: {formatMoney(item.subtotal)}</Text>
                <Text style={styles.rowMeta}>Purchased: {item.purchased ? "Yes" : "No"}</Text>
              </View>
            ))}
          </DebugSection>
        </>
      )}

      <Pressable style={styles.homeButton} onPress={() => router.push("/home-screen")}>
        <Text style={styles.homeButtonText}>Back to Home</Text>
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
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryBlock: {
    flex: 1,
    backgroundColor: "#F4F2E9",
    borderRadius: 16,
    padding: 14,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111111",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    color: "#5B5B53",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#4E4E46",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B6B63",
    backgroundColor: "#F4F2E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rowCard: {
    backgroundColor: "#F9F8F4",
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  rowTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  rowTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111111",
  },
  rowMeta: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5B5B53",
  },
  emptyText: {
    fontSize: 14,
    color: "#5B5B53",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeActive: {
    backgroundColor: "#E6F4EA",
  },
  badgeMuted: {
    backgroundColor: "#EFECE1",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
  },
  homeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#111111",
    marginTop: 4,
  },
  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});