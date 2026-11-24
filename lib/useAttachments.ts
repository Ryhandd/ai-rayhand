'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Attachment } from '@/lib/types';
import { extractText, imageToDataUrl, isImageFile } from '@/lib/files';
import { MAX_FILE_BYTES } from '@/lib/config';
import { uid } from '@/lib/storage';

/** Kelola lampiran: dokumen (teks) dan gambar (vision). */
export function useAttachments(onToast: (t: string) => void) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const itemsRef = useRef<Attachment[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onToastRef = useRef(onToast);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const set = useCallback((next: Attachment[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      const queued: { file: File; att: Attachment }[] = [];
      for (const f of list) {
        const image = isImageFile(f);
        if (f.size > MAX_FILE_BYTES) {
          onToastRef.current(`${f.name} melebihi 20 MB`);
          continue;
        }
        queued.push({
          file: f,
          att: {
            id: uid('f'),
            name: f.name,
            size: f.size,
            text: '',
            kind: image ? 'image' : 'text',
            loading: true,
          },
        });
      }
      if (!queued.length) return;

      set([...itemsRef.current, ...queued.map((q) => q.att)]);
      onToastRef.current(`${queued.length} lampiran diproses…`);

      for (const { file, att } of queued) {
        try {
          if (att.kind === 'image') {
            const dataUrl = await imageToDataUrl(file);
            set(
              itemsRef.current.map((a) =>
                a.id === att.id ? { ...a, dataUrl, loading: false } : a,
              ),
            );
          } else {
            const text = await extractText(file);
            set(
              itemsRef.current.map((a) => (a.id === att.id ? { ...a, text, loading: false } : a)),
            );
          }
        } catch (e) {
          onToastRef.current(`${att.name}: ${(e as Error).message || 'gagal dibaca'}`);
          set(itemsRef.current.filter((a) => a.id !== att.id));
        }
      }
    },
    [set],
  );

  const remove = useCallback(
    (id: string) => set(itemsRef.current.filter((a) => a.id !== id)),
    [set],
  );

  const clear = useCallback(() => set([]), [set]);

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  // drag & drop di seluruh halaman
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types?.includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      void ingest(e.dataTransfer.files);
    };

    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragover', onOver);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('drop', onDrop);
    };
  }, [ingest]);

  // paste dari clipboard: file atau gambar hasil screenshot
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((it) => it.kind === 'file')
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) {
        e.preventDefault();
        void ingest(files);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [ingest]);

  return { items, dragging, ingest, remove, clear, openPicker, inputRef };
}
