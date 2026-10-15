import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Camera, Images, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiFailure, assetUri, retryJob, USE_FIXTURES } from '../lib/api';
import { pickPhoto } from '../lib/photo';
import { startVerification } from '../lib/rewards';
import { icon3d } from '../theme/assets';
import { extraCopy } from '../theme/statusCopy';
import { colors, radius, space, type } from '../theme/tokens';
import type { ProjectView } from '../types/contracts';
import { Pill } from './Card';
import { ChunkyButton } from './ChunkyButton';
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
    <View style={styles.panel}>
      <Text style={[type.h3, { textAlign: 'center' }]}>
        {approved ? 'Poin masuk ke dompetmu' : 'Dapatkan poin dari karyamu'}
      </Text>

      {approved ? (
        <>
          <View style={{ alignSelf: 'center' }}>
            <Pill label={`+${v.result!.points.toLocaleString('id-ID')} poin`} tone="easy" />
          </View>
          <Text style={[type.caption, { textAlign: 'center' }]}>{extraCopy.pointValue}</Text>
          <ChunkyButton
            label="Lihat dompet"
            icon={<Wallet size={22} color={colors.white} strokeWidth={2.5} />}
            onPress={() => router.push('/wallet')}
          />
        </>
      ) : (
        <Text style={[type.body, { textAlign: 'center', color: colors.muted }]}>
          Foto hasil karyamu. Setelah diperiksa, poin upcycle masuk ke dompet.
        </Text>
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
          <ChunkyButton
            label={send.isPending ? 'Mengunggah foto' : rejected ? 'Foto ulang' : 'Foto hasil karyamu'}
            loading={send.isPending}
            icon={<Camera size={22} color={colors.white} strokeWidth={2.5} />}
            onPress={() => choose('camera')}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { alignSelf: 'stretch', gap: space.md, borderTopWidth: 2, borderTopColor: colors.line, paddingTop: space.lg },
  danger: { backgroundColor: colors.dangerBg, borderRadius: radius.iconButton, padding: space.md, gap: space.xs },
  devLink: { textAlign: 'center', textDecorationLine: 'underline' },
});
