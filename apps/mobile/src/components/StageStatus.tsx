import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Clock, RotateCw, X } from 'lucide-react-native';
import { colors, radius, type } from '../theme/tokens';
import { extraCopy, statusCopy, type JobKind, type JobStatus } from '../theme/statusCopy';

export type StageItem = {
  kind: JobKind;
  status: JobStatus;
  /** Ganti label default, misalnya extraCopy.meshWorkerUnavailable. */
  labelOverride?: string;
  /** Muncul sebagai tombol "Coba lagi" saat status failed. */
  onRetry?: () => void;
};

/**
 * Daftar status per komponen (foto, model 3D, ide, panduan, ilustrasi).
 * Menampilkan nama tahap, tanpa persentase kemajuan.
 */
export function StageStatus({ items }: { items: StageItem[] }) {
  return (
    <View style={styles.card}>
      {items.map((item, i) => (
        <Row key={`${item.kind}-${i}`} item={item} last={i === items.length - 1} />
      ))}
    </View>
  );
}

function Row({ item, last }: { item: StageItem; last: boolean }) {
  const label = item.labelOverride ?? statusCopy[item.kind][item.status];
  const failed = item.status === 'failed';
  return (
    <View style={[styles.row, !last && styles.divider]} accessibilityLiveRegion="polite">
      <StatusIcon status={item.status} />
      <Text style={[type.body, styles.label, failed && { color: colors.dangerFg }]}>{label}</Text>
      {failed && item.onRetry ? (
        <Pressable
          onPress={item.onRetry}
          accessibilityRole="button"
          accessibilityLabel={`${extraCopy.retry}: ${label}`}
          style={styles.retry}
          hitSlop={8}
        >
          <RotateCw size={16} color={colors.green700} strokeWidth={2.75} />
          <Text style={[type.pill, { color: colors.green700 }]}>{extraCopy.retry}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatusIcon({ status }: { status: JobStatus }) {
  switch (status) {
    case 'succeeded':
      return (
        <View style={[styles.dot, { backgroundColor: colors.green500 }]}>
          <Check size={16} color={colors.white} strokeWidth={3.25} />
        </View>
      );
    case 'running':
    case 'retry_wait':
      return (
        <View style={[styles.dot, { backgroundColor: colors.green50 }]}>
          <ActivityIndicator size="small" color={colors.green500} />
        </View>
      );
    case 'failed':
      return (
        <View style={[styles.dot, { backgroundColor: colors.dangerBg }]}>
          <X size={16} color={colors.dangerFg} strokeWidth={3.25} />
        </View>
      );
    default:
      return (
        <View style={[styles.dot, { backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.line }]}>
          <Clock size={14} color={colors.iconIdle} strokeWidth={2.75} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 52 },
  divider: { borderBottomWidth: 2, borderBottomColor: colors.line },
  dot: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.green100,
  },
});
