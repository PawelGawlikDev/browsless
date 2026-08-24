import { extensionStorage } from '@/lib/extensionStorage';

type RecordingFlowItem = Record<string, unknown>;

type AddedBlockResult<T> = {
  recording: { flows: RecordingFlowItem[] } & Record<string, unknown>;
  addedBlock: T;
};

export default async function <T = RecordingFlowItem>(
  detail: T | ((recording: { flows: RecordingFlowItem[] }) => T),
  save = true
): Promise<AddedBlockResult<T> | null> {
  const stored = (await extensionStorage.local.get(['isRecording', 'recording'])) as {
    isRecording?: boolean;
    recording?: { flows: RecordingFlowItem[] } & Record<string, unknown>;
  };

  if (!stored.isRecording || !stored.recording) return null;

  let addedBlock: T;
  const recording = stored.recording;

  if (typeof detail === 'function') {
    addedBlock = (detail as (rec: { flows: RecordingFlowItem[] }) => T)(recording);
  } else {
    addedBlock = detail;
    recording.flows.push(detail as RecordingFlowItem);
  }

  if (save) await extensionStorage.local.set({ recording });

  return { recording, addedBlock };
}
