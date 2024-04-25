import { useConfirmModal } from '@affine/component';
import { authAtom } from '@affine/core/atoms';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import { atom, useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';

export const showAILoginRequiredAtom = atom(false);

export const AiLoginRequiredModal = () => {
  const t = useAFFiNEI18N();
  const [open, setOpen] = useAtom(showAILoginRequiredAtom);
  const setAuth = useSetAtom(authAtom);
  const { openConfirmModal, closeConfirmModal } = useConfirmModal();

  const openSignIn = useCallback(() => {
    setAuth(prev => ({ ...prev, openModal: true }));
  }, [setAuth]);

  useEffect(() => {
    if (open) {
      openConfirmModal({
        title: t['com.affine.ai.login-required.dialog-title'](),
        description: t['com.affine.ai.login-required.dialog-content'](),
        onConfirm: () => {
          setOpen(false);
          openSignIn();
        },
        confirmButtonOptions: {
          children: t['com.affine.ai.login-required.dialog-confirm'](),
          type: 'primary',
        },
        cancelText: t['com.affine.ai.login-required.dialog-cancel'](),
        onOpenChange: setOpen,
      });
    } else {
      closeConfirmModal();
    }
  }, [closeConfirmModal, open, openConfirmModal, openSignIn, setOpen, t]);

  return null;
};
