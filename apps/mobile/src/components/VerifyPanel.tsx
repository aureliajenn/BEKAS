import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Camera, Images, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiFailure, assetUri, retryJob, UPCYCLE_POINTS, USE_FIXTURES } from '../lib/api';
import { pickPhoto } from '../lib/photo';
import { startVerification } from '../lib/rewards';
import { icon3d } from '../theme/assets';
import { extraCopy } from '../theme/statusCopy';
import { colors, radius, space, type } from '../theme/tokens';
import type { ProjectView } from '../types/contracts';
import { Card, PointsPill } from './Card';
import { ChunkyButton } from './ChunkyButton';
import { Coin, Sparkle, Star } from './shapes';
import { StageStatus } from './StageStatus';

/** Verifikasi foto sesudah → poin upcycle (PRD 17, AC9). Dipasang di kartu selesai Panduan. */
export function VerifyPanel({ project }: { project: ProjectView }) {
  const qc = useQueryClient();
  const [denied, setDenied] = useState(false);
  const v = project.verification;

  const send = useMutation({
    mutationFn: (uri: string) => startVerification(project.id, uri),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', project.id] }),
  });
  const retry = useMutation({
    mutationFn: (jobId: string) => retryJob(project.id, jobId),
    onSettled: () => qc.invalidateQueries({ queryKey: ['project', project.id] }),
  });

  const choose = async (source: 'camera' | 'library') => {
    const res = await pickPhoto(source);
    setDenied(res === 'denied');
    if (res && res !== 'denied') send.mutate(res);
  };

  const approved = v?.result?.approved;
  const rejected = v?.result && !v.result.approved;
  const running = v && !v.result && v.job.status !== 'failed';
  const canSend = !approved && !running && !send.isPending;

  return (
    <Card style={{ gap: space.md }}>
      {approved ? (
        <>
          <Text style={[type.caption, { textAlign: 'center' }]}>Hadiah</Text>
          <View style={styles.reward} accessibilityLabel={`Hadiah ${v.result!.points} poin masuk ke dompet`}>
            <Sparkle size={14} color={colors.accentYellow} style={styles.sparkleA} />
            <Star size={12} color={colors.green400} style={styles.sparkleB} />
            <Text style={[type.display, { color: colors.green700 }]}>+{v.result!.points.toLocaleString('id-ID')}</Text>
            <Coin size={36} />
          </View>
          <Text style={[type.caption, { textAlign: 'center' }]}>Poin masuk ke dompetmu. {extraCopy.pointValue}</Text>
          <ChunkyButton label="Lihat dompet" icon={<Wallet size={22} color={colors.white} strokeWidth={2.5} />} onPress={() => router.push('/wallet')} />
        </>
      ) : (
        <View style={{ gap: space.xs }}>
          <View style={styles.titleRow}>
            <Text style={type.h3}>Dapatkan</Text>
            <PointsPill points={UPCYCLE_POINTS} />
          </View>
          <Text style={[type.body, { color: colors.muted }]}>Foto hasil karyamu. Setelah diperiksa, poin upcycle masuk ke dompet.</Text>
        </View>
      )}

      {running ? <StageStatus items={[{ kind: 'verification', status: v.job.status }]} /> : null}
      {v?.job.status === 'failed' ? (
        <StageStatus items={[{ kind: 'verification', status: 'failed', onRetry: () => retry.mutate(v.job.id) }]} />
      ) : null}
      {rejected ? (
        <View style={styles.danger} accessibilityRole="alert">
          <Text style={[type.bodyL, { color: colors.dangerFg }]}>Belum bisa diberi poin</Text>
          <Text style={type.body}>{v.result!.reason}</Text>
        </View>
      ) : null}
      {send.isError ? (
        <View style={styles.danger} accessibilityRole="alert">
          <Text style={[type.body, { color: colors.dangerFg }]}>
            {send.error instanceof ApiFailure ? send.error.detail.message : 'Foto gagal terkirim. Coba lagi.'}
          </Text>
        </View>
      ) : null}
      {denied ? (
        <View style={styles.danger} accessibilityRole="alert">
          <Text style={[type.body, { color: colors.dangerFg }]}>Izin ditolak. Izinkan kamera atau galeri di pengaturan HP.</Text>
        </View>
      ) : null}

      {canSend || send.isPending ? (
        <>
          {/* Tombol putus-putus ala mockup: ajakan foto, bukan aksi utama layar. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={send.isPending ? 'Mengunggah foto' : rejected ? 'Foto ulang' : 'Foto hasil karyamu'}
            accessibilityState={{ disabled: send.isPending, busy: send.isPending }}
            disabled={send.isPending}
            onPress={() => choose('camera')}
            style={({ pressed }) => [styles.dashed, pressed && { opacity: 0.8 }]}
          >
            {send.isPending ? <ActivityIndicator color={colors.green700} /> : <Camera size={22} color={colors.green700} strokeWidth={2.5} />}
            <Text style={[type.button, { color: colors.green700 }]}>
              {send.isPending ? 'Mengunggah foto' : rejected ? 'Foto ulang' : 'Foto hasil karyamu'}
            </Text>
          </Pressable>
          <ChunkyButton
            label="Pilih dari galeri"
            variant="secondary"
            disabled={send.isPending}
            icon={<Images size={22} color={colors.green700} strokeWidth={2.5} />}
            onPress={() => choose('library')}
          />
          {USE_FIXTURES && __DEV__ ? (
            // Hanya dev: kamera/galeri tidak bisa diotomasi di browser.
            <Pressable accessibilityRole="button" onPress={() => send.mutate(assetUri(icon3d.tasDaur))} disabled={send.isPending}>
              <Text style={[type.caption, styles.devLink]}>Pakai foto contoh (dev)</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reward: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.green50, borderRadius: radius.card, paddingVertical: space.lg },
  sparkleA: { position: 'absolute', top: space.md, right: '24%' },
  sparkleB: { position: 'absolute', bottom: space.md, left: '24%' },
  dashed: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.green400,
    backgroundColor: colors.green50,
  },
  danger: { backgroundColor: colors.dangerBg, borderRadius: radius.iconButton, padding: space.md, gap: space.xs },
  devLink: { textAlign: 'center', textDecorationLine: 'underline' },
});
