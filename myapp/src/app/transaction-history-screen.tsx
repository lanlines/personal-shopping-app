import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { listShoppingSessions } from "../db/repositories/shopping-sessions.repository";
import type { ShoppingSession } from "../db/types";

type HistoryFilter = "all" | "completed" | "active";

export default function TransactionHistoryScreen() {
  const router = useRouter();

  const [sessions, setSessions] = useState<ShoppingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>("all");

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setLoading(true);
      const result = await listShoppingSessions();

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setSessions(result.data);
      } else {
        setSessions([]);
      }

      setLoading(false);
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSessions = sessions.filter((session) => {
    if (filter === "completed") {
      return session.finishedAt !== null;
    }

    if (filter === "active") {
      return session.finishedAt === null;
    }

    return true;
  });

  const totalSpent = filteredSessions.reduce((sum, session) => sum + session.total, 0);
  const completedCount = sessions.filter((session) => session.finishedAt !== null).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Shopping App</Text>
        <Text style={styles.title}>Transaction History</Text>
        <Text style={styles.subtitle}>
          Review previous shopping sessions and spending totals.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{sessions.length}</Text>
            <Text style={styles.summaryLabel}>Total sessions</Text>
          </View>

          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.summaryFooter}>
          <Text style={styles.summaryFooterLabel}>Filtered spending</Text>
          <Text style={styles.summaryFooterValue}>P{totalSpent.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterButton, filter === "all" && styles.filterButtonActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === "all" && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterButton,
            filter === "completed" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("completed")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === "completed" && styles.filterButtonTextActive,
            ]}
          >
            Completed
          </Text>
        </Pressable>

        <Pressable
          style={[styles.filterButton, filter === "active" && styles.filterButtonActive]}
          onPress={() => setFilter("active")}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === "active" && styles.filterButtonTextActive,
            ]}
          >
            Active
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sessions</Text>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No sessions found</Text>
            <Text style={styles.emptyText}>
              Start a shopping session to see it here.
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const dateLabel = new Date(session.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const statusLabel = session.finishedAt ? "Completed" : "Active";
            const statusStyle =
              session.finishedAt !== null ? styles.completedBadge : styles.activeBadge;

            return (
              <Pressable
                key={session.id}
                style={styles.sessionCard}
                onPress={() =>
                  router.push({
                    pathname: "/shopping-session-screen",
                    params: { sessionId: String(session.id) },
                  })
                }
              >
                <View style={styles.sessionTopRow}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>{dateLabel}</Text>
                    <Text style={styles.sessionMeta}>Budget: P{session.budget.toFixed(2)}</Text>
                  </View>

                  <View style={[styles.statusBadge, statusStyle]}>
                    <Text style={styles.statusText}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.sessionBottomRow}>
                  <Text style={styles.sessionTotal}>P{session.total.toFixed(2)}</Text>
                  <Text style={styles.sessionHint}>
                    {session.finishedAt ? "Saved session" : "Current session"}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

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
  summaryLabel: {
    marginTop: 2,
    fontSize: 13,
    color: "#5B5B53",
    fontWeight: "600",
  },
  summaryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryFooterLabel: {
    fontSize: 13,
    color: "#5B5B53",
    fontWeight: "600",
  },
  summaryFooterValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111111",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#EDEADE",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  filterButtonActive: {
    backgroundColor: "#111111",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111111",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111111",
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
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E7E4DA",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionDate: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111111",
  },
  sessionMeta: {
    fontSize: 13,
    color: "#6B6B63",
    fontWeight: "600",
  },
  statusBadge: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  completedBadge: {
    backgroundColor: "#DDE8D8",
  },
  activeBadge: {
    backgroundColor: "#EFDDB8",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111111",
  },
  sessionBottomRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  sessionTotal: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111111",
    letterSpacing: -0.5,
  },
  sessionHint: {
    fontSize: 13,
    color: "#5B5B53",
    fontWeight: "600",
  },
  homeButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  homeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});