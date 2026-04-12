import { executeTrackedAction, supabase } from './supabase';

export async function uploadClipBlob(params: {
  matchId: string;
  blob: Blob;
  contentType?: string;
}): Promise<string> {
  const { matchId, blob, contentType = blob.type || 'video/webm' } = params;
  const fileName = `${matchId}/${Date.now()}.webm`;

  const { error: uploadError } = await executeTrackedAction({
    tableName: 'storage.clips',
    action: 'upload',
    matchId,
    payload: { fileName, contentType },
    execute: () =>
      supabase.storage
        .from('clips')
        .upload(fileName, blob, {
          contentType,
          upsert: false,
        }),
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data: urlData } = supabase.storage.from('clips').getPublicUrl(fileName);
  return urlData.publicUrl;
}